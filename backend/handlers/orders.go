package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	"tma-store-builder/backend/config"
	"tma-store-builder/backend/models"
	"tma-store-builder/backend/utils"
)

const shippingFlatRateETB = 100.0 // Adjustable per merchant later

// CreateOrder builds an order, computes totals, and persists it as "pending".
func CreateOrder(c *fiber.Ctx) error {
	var input models.CreateOrderInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad_request", "message": "Invalid JSON body"})
	}

	if input.MerchantSlug == "" || len(input.Items) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "validation", "message": "merchant_slug and items are required"})
	}
	if input.CustomerName == "" || input.CustomerPhone == "" || input.DeliveryArea == "" {
		return c.Status(400).JSON(fiber.Map{"error": "validation", "message": "Customer name, phone, and delivery area are required"})
	}
	if input.PaymentMethod == "" {
		input.PaymentMethod = "telebirr"
	}
	if input.Language == "" {
		input.Language = "en"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Find merchant
	merchCol := config.Database.Collection("merchants")
	var merchant models.Merchant
	if err := merchCol.FindOne(ctx, bson.M{"slug": input.MerchantSlug}).Decode(&merchant); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not_found", "message": "Store not found"})
	}

	// Recompute prices server-side (never trust client price)
	prodCol := config.Database.Collection("products")
	var subtotal float64
	validatedItems := make([]models.OrderItem, 0, len(input.Items))
	for _, item := range input.Items {
		pid, err := primitive.ObjectIDFromHex(item.ProductID.Hex())
		if err != nil {
			continue
		}
		var product models.Product
		if err := prodCol.FindOne(ctx, bson.M{"_id": pid, "merchant_id": merchant.ID}).Decode(&product); err != nil {
			continue
		}
		qty := item.Quantity
		if qty < 1 {
			qty = 1
		}
		validatedItems = append(validatedItems, models.OrderItem{
			ProductID: product.ID,
			Name:      product.Name,
			PriceETB:  product.PriceETB,
			Quantity:  qty,
			ImageURL:  product.ImageURL,
		})
		subtotal += product.PriceETB * float64(qty)
	}
	if len(validatedItems) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "validation", "message": "No valid items in order"})
	}

	now := time.Now().UTC()
	order := models.Order{
		ID:            primitive.NewObjectID(),
		MerchantID:    merchant.ID,
		TxRef:         "tx-" + utils.RandomToken(8) + "-" + utils.RandomToken(4),
		Items:         validatedItems,
		SubtotalETB:   subtotal,
		ShippingETB:   shippingFlatRateETB,
		TotalETB:      subtotal + shippingFlatRateETB,
		CustomerName:  input.CustomerName,
		CustomerPhone: input.CustomerPhone,
		DeliveryArea:  input.DeliveryArea,
		Notes:         input.Notes,
		Status:        models.OrderPending,
		PaymentMethod: input.PaymentMethod,
		Language:      input.Language,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	ordersCol := config.Database.Collection("orders")
	if _, err := ordersCol.InsertOne(ctx, order); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "Failed to create order"})
	}

	return c.Status(201).JSON(fiber.Map{
		"order_id":     order.ID.Hex(),
		"tx_ref":       order.TxRef,
		"total_etb":    order.TotalETB,
		"status":       order.Status,
		"checkout_url": "", // filled by Chapa initialize step
	})
}

// GetOrder returns a single order (used for polling after payment).
func GetOrder(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad_request", "message": "Invalid order id"})
	}
	col := config.Database.Collection("orders")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var order models.Order
	if err := col.FindOne(ctx, bson.M{"_id": id}).Decode(&order); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not_found", "message": "Order not found"})
	}
	return c.JSON(order)
}

// ListMyOrders returns the merchant's orders.
func ListMyOrders(c *fiber.Ctx) error {
	mid, err := parseMerchantID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
	}
	col := config.Database.Collection("orders")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cur, err := col.Find(ctx, bson.M{"merchant_id": mid},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}).SetLimit(200))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "Failed to fetch orders"})
	}
	defer cur.Close(ctx)

	var orders []models.Order
	if err := cur.All(ctx, &orders); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "Failed to decode orders"})
	}
	return c.JSON(fiber.Map{"orders": orders, "count": len(orders)})
}

// UpdateOrderStatusInput is the patch payload.
type UpdateOrderStatusInput struct {
	Status string `json:"status"`
}

// UpdateOrderStatus advances an order's lifecycle.
func UpdateOrderStatus(c *fiber.Ctx) error {
	mid, err := parseMerchantID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
	}
	oid, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad_request", "message": "Invalid order id"})
	}
	var input UpdateOrderStatusInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad_request", "message": "Invalid JSON body"})
	}
	allowed := map[string]bool{
		"shipped":   true,
		"delivered": true,
		"cancelled": true,
	}
	if !allowed[input.Status] {
		return c.Status(400).JSON(fiber.Map{"error": "validation", "message": "Invalid status"})
	}
	col := config.Database.Collection("orders")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	res, err := col.UpdateOne(ctx,
		bson.M{"_id": oid, "merchant_id": mid},
		bson.M{"$set": bson.M{"status": input.Status, "updated_at": time.Now().UTC()}})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "server_error"})
	}
	if res.MatchedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "not_found"})
	}
	return c.JSON(fiber.Map{"success": true})
}

// GetStoreStats returns aggregate metrics for the merchant dashboard.
func GetStoreStats(c *fiber.Ctx) error {
	mid, err := parseMerchantID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
	}
	col := config.Database.Collection("orders")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	totalOrders, _ := col.CountDocuments(ctx, bson.M{"merchant_id": mid})
	paidOrders, _ := col.CountDocuments(ctx, bson.M{"merchant_id": mid, "status": "paid"})
	pendingOrders, _ := col.CountDocuments(ctx, bson.M{"merchant_id": mid, "status": "pending"})

	// Aggregate revenue
	pipeline := []bson.M{
		{"$match": bson.M{"merchant_id": mid, "status": "paid"}},
		{"$group": bson.M{"_id": nil, "total": bson.M{"$sum": "$total_etb"}}},
	}
	cur, _ := col.Aggregate(ctx, pipeline)
	var rows []bson.M
	_ = cur.All(ctx, &rows)
	var revenue float64
	if len(rows) > 0 {
		if v, ok := rows[0]["total"].(float64); ok {
			revenue = v
		}
	}

	prodCol := config.Database.Collection("products")
	productCount, _ := prodCol.CountDocuments(ctx, bson.M{"merchant_id": mid, "active": true})

	return c.JSON(fiber.Map{
		"total_orders":   totalOrders,
		"paid_orders":    paidOrders,
		"pending_orders": pendingOrders,
		"revenue_etb":    revenue,
		"active_products": productCount,
	})
}
