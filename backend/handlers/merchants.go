package handlers

import (
	"context"
	"errors"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"

	"tma-store-builder/backend/config"
	"tma-store-builder/backend/models"
	"tma-store-builder/backend/utils"
)

// RegisterMerchantInput is the signup payload.
type RegisterMerchantInput struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	StoreName   string `json:"store_name"`
	Description string `json:"description"`
	Phone       string `json:"phone"`
	Language    string `json:"language"`
}

// RegisterMerchant creates a new store owner.
func RegisterMerchant(c *fiber.Ctx) error {
	var input RegisterMerchantInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad_request", "message": "Invalid JSON body"})
	}

	// Sanitize and normalize input data
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	input.StoreName = strings.TrimSpace(input.StoreName)

	if input.Email == "" || input.Password == "" || input.StoreName == "" {
		return c.Status(400).JSON(fiber.Map{"error": "validation", "message": "email, password, and store_name are required"})
	}
	if len(input.Password) < 8 {
		return c.Status(400).JSON(fiber.Map{"error": "validation", "message": "Password must be at least 8 characters"})
	}

	col := config.Database.Collection("merchants")
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	// Application-level duplicate email check
	count, err := col.CountDocuments(ctx, bson.M{"email": input.Email})
	if err != nil {
		log.Printf("CountDocuments(email) error: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "DB check failed: " + err.Error()})
	}
	if count > 0 {
		return c.Status(409).JSON(fiber.Map{"error": "conflict", "message": "Email already registered"})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("bcrypt error: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "Password hashing failed: " + err.Error()})
	}

	// Build unique slug
	slug := utils.Slugify(input.StoreName)
	existingSlug, err := col.CountDocuments(ctx, bson.M{"slug": slug})
	if err != nil {
		log.Printf("CountDocuments(slug) error: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "DB check failed: " + err.Error()})
	}
	if existingSlug > 0 {
		slug = slug + "-" + utils.RandomToken(2)
	}

	lang := input.Language
	if lang != "en" && lang != "am" {
		lang = "en"
	}

	now := time.Now().UTC()
	merchant := models.Merchant{
		Email:        input.Email,
		PasswordHash: string(hash),
		StoreName:    input.StoreName,
		Slug:         slug,
		Description:  input.Description,
		Phone:        input.Phone,
		Language:     lang,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	res, err := col.InsertOne(ctx, merchant)
	if err != nil {
		// Catch concurrency race conditions if a unique database index is triggered
		if mongo.IsDuplicateKeyError(err) {
			return c.Status(409).JSON(fiber.Map{"error": "conflict", "message": "Email or slug already registered"})
		}
		log.Printf("InsertOne error: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "Failed to create merchant: " + err.Error()})
	}
	merchant.ID = res.InsertedID.(primitive.ObjectID)

	token, err := generateJWT(merchant.ID.Hex(), merchant.Email)
	if err != nil {
		log.Printf("JWT error: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "Token generation failed: " + err.Error()})
	}

	return c.Status(201).JSON(fiber.Map{
		"token": token,
		"merchant": fiber.Map{
			"id":         merchant.ID.Hex(),
			"email":      merchant.Email,
			"store_name": merchant.StoreName,
			"language":   merchant.Language,
			"slug":       merchant.Slug,
		},
	})
}

// LoginMerchantInput is the login payload.
type LoginMerchantInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginMerchant authenticates and returns a JWT.
func LoginMerchant(c *fiber.Ctx) error {
	var input LoginMerchantInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad_request", "message": "Invalid JSON body"})
	}

	// Normalize incoming login email string to match storage standard
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))

	col := config.Database.Collection("merchants")
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	var merchant models.Merchant
	if err := col.FindOne(ctx, bson.M{"email": input.Email}).Decode(&merchant); err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "unauthorized", "message": "Invalid credentials"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(merchant.PasswordHash), []byte(input.Password)); err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "unauthorized", "message": "Invalid credentials"})
	}

	token, err := generateJWT(merchant.ID.Hex(), merchant.Email)
	if err != nil {
		log.Printf("JWT error: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "Token generation failed: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"token": token,
		"merchant": fiber.Map{
			"id":         merchant.ID.Hex(),
			"email":      merchant.Email,
			"store_name": merchant.StoreName,
			"language":   merchant.Language,
			"slug":       merchant.Slug,
		},
	})
}

// GetMe returns the currently-authenticated merchant.
func GetMe(c *fiber.Ctx) error {
	mid, _ := c.Locals("merchant_id").(string)
	id, err := primitive.ObjectIDFromHex(mid)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad_request", "message": "Invalid merchant id"})
	}

	col := config.Database.Collection("merchants")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var merchant models.Merchant
	if err := col.FindOne(ctx, bson.M{"_id": id}).Decode(&merchant); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not_found", "message": "Merchant not found"})
	}

	return c.JSON(fiber.Map{
		"id":          merchant.ID.Hex(),
		"email":       merchant.Email,
		"store_name":  merchant.StoreName,
		"slug":        merchant.Slug,
		"description": merchant.Description,
		"phone":       merchant.Phone,
		"logo_url":    merchant.LogoURL,
		"banner_url":  merchant.BannerURL,
		"language":    merchant.Language,
		"created_at":  merchant.CreatedAt,
	})
}

func generateJWT(merchantID, email string) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "tma-store-builder-dev-secret-change-me"
	}
	claims := jwt.MapClaims{
		"merchant_id": merchantID,
		"email":       email,
		"iat":         time.Now().Unix(),
		"exp":         time.Now().Add(72 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// parseMerchantID extracts and validates the merchant ObjectID from locals.
func parseMerchantID(c *fiber.Ctx) (primitive.ObjectID, error) {
	mid, _ := c.Locals("merchant_id").(string)
	id, err := primitive.ObjectIDFromHex(mid)
	if err != nil {
		return primitive.NilObjectID, errors.New("invalid merchant id")
	}
	return id, nil
}
