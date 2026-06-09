package handlers

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"tma-store-builder/backend/config"
	"tma-store-builder/backend/models"
)

// InitializeChapaInput is what the frontend posts to start a payment.
type InitializeChapaInput struct {
	OrderID    string `json:"order_id"`
	ReturnURL  string `json:"return_url"`
	CallbackURL string `json:"callback_url"`
}

// InitializeChapa calls Chapa's /transaction/initialize endpoint and returns a checkout URL.
func InitializeChapa(c *fiber.Ctx) error {
	var input InitializeChapaInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad_request", "message": "Invalid JSON body"})
	}

	col := config.Database.Collection("orders")
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	var order models.Order
	if err := col.FindOne(ctx, bson.M{"_id": toObjectID(input.OrderID)}).Decode(&order); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not_found", "message": "Order not found"})
	}
	if order.Status != models.OrderPending {
		return c.Status(400).JSON(fiber.Map{"error": "invalid_state", "message": "Order is not pending payment"})
	}

	chapa := config.GetChapaConfig()
	firstName, lastName := splitName(order.CustomerName)
	email := order.CustomerPhone + "@tma-store.et" // Chapa requires email; phone is more reliable
	if order.CustomerPhone == "" {
		email = "customer@tma-store.et"
	}

	body := map[string]interface{}{
		"amount":       order.TotalETB,
		"currency":     "ETB",
		"email":        email,
		"first_name":   firstName,
		"last_name":    lastName,
		"phone_number": order.CustomerPhone,
		"tx_ref":       order.TxRef,
		"callback_url": input.CallbackURL,
		"return_url":   input.ReturnURL,
		"customization": map[string]string{
			"title":       "TMA Store Order",
			"description": "Payment for order " + order.TxRef,
		},
	}
	bodyJSON, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", chapa.BaseURL+"/transaction/initialize", bytes.NewReader(bodyJSON))
	req.Header.Set("Authorization", "Bearer "+chapa.SecretKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Chapa init error: %v", err)
		return c.Status(502).JSON(fiber.Map{"error": "payment_gateway_error", "message": "Failed to reach Chapa"})
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)

	var result struct {
		Status  string `json:"status"`
		Message string `json:"message"`
		Data    struct {
			CheckoutURL string `json:"checkout_url"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return c.Status(502).JSON(fiber.Map{"error": "payment_gateway_error", "message": "Invalid Chapa response"})
	}
	if result.Status != "success" || result.Data.CheckoutURL == "" {
		return c.Status(402).JSON(fiber.Map{
			"error":   "payment_init_failed",
			"message": result.Message,
		})
	}

	// Store checkout URL on order for convenience
	_, _ = col.UpdateOne(ctx, bson.M{"_id": order.ID},
		bson.M{"$set": bson.M{"checkout_url": result.Data.CheckoutURL, "updated_at": time.Now().UTC()}})

	return c.JSON(fiber.Map{
		"checkout_url": result.Data.CheckoutURL,
		"tx_ref":       order.TxRef,
	})
}

// ChapaWebhook is invoked by Chapa when a payment completes.
// We verify the signature, then call Chapa's verify endpoint to confirm.
func ChapaWebhook(c *fiber.Ctx) error {
	rawBody := c.Body()
	signature := c.Get("Chapa-Signature")
	if signature == "" {
		signature = c.Get("x-chapa-signature")
	}
	secret := os.Getenv("CHAPA_WEBHOOK_SECRET")

	// Optional signature verification
	if secret != "" {
		if !verifyChapaSignature(rawBody, signature, secret) {
			log.Println("Chapa webhook: invalid signature")
			return c.Status(401).JSON(fiber.Map{"error": "invalid_signature"})
		}
	}

	var payload struct {
		TxRef   string `json:"tx_ref"`
		RefID   string `json:"ref_id"`
		Status  string `json:"status"`
		Amount  string `json:"amount"`
	}
	if err := json.Unmarshal(rawBody, &payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad_request"})
	}

	// Verify with Chapa server-side (don't trust webhook payload alone)
	if err := verifyChapaTransaction(payload.TxRef); err != nil {
		log.Printf("Chapa verify failed for %s: %v", payload.TxRef, err)
		return c.Status(200).JSON(fiber.Map{"received": true, "verified": false})
	}

	col := config.Database.Collection("orders")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now().UTC()
	update := bson.M{
		"status":     models.OrderPaid,
		"chapa_ref":  payload.RefID,
		"updated_at": now,
		"paid_at":    now,
	}
	_, err := col.UpdateOne(ctx, bson.M{"tx_ref": payload.TxRef}, bson.M{"$set": update})
	if err != nil && err != mongo.ErrNoDocuments {
		return c.Status(500).JSON(fiber.Map{"error": "db_error"})
	}

	return c.JSON(fiber.Map{"received": true, "verified": true})
}

// verifyChapaTransaction calls Chapa's /transaction/verify/{tx_ref} to double-check.
func verifyChapaTransaction(txRef string) error {
	chapa := config.GetChapaConfig()
	req, _ := http.NewRequest("GET", chapa.BaseURL+"/transaction/verify/"+txRef, nil)
	req.Header.Set("Authorization", "Bearer "+chapa.SecretKey)
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Status string `json:"status"`
		Data   struct {
			Status string `json:"status"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return err
	}
	if result.Status != "success" || result.Data.Status != "success" {
		return errChapaNotSuccess
	}
	return nil
}

var errChapaNotSuccess = &chapaError{msg: "transaction not successful"}

// verifyChapaSignature checks the HMAC-SHA256 of the payload.
func verifyChapaSignature(payload []byte, signature, secret string) bool {
	if signature == "" {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

// splitName divides "Abebe Bikila" into first/last safely.
func splitName(full string) (string, string) {
	if full == "" {
		return "Customer", "User"
	}
	for i, r := range full {
		if r == ' ' {
			return full[:i], full[i+1:]
		}
	}
	return full, "User"
}

type chapaError struct{ msg string }

func (e *chapaError) Error() string { return e.msg }

// toObjectID parses a 24-char hex string into a primitive.ObjectID, or returns the zero value.
func toObjectID(hex string) primitive.ObjectID {
	id, _ := primitive.ObjectIDFromHex(hex)
	return id
}
