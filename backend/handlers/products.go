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

// GetStoreBySlug returns a merchant's public profile.
func GetStoreBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")
	col := config.Database.Collection("merchants")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var merchant models.Merchant
	if err := col.FindOne(ctx, bson.M{"slug": slug}).Decode(&merchant); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not_found", "message": "Store not found"})
	}

	return c.JSON(fiber.Map{
		"id":          merchant.ID.Hex(),
		"store_name":  merchant.StoreName,
		"slug":        merchant.Slug,
		"description": merchant.Description,
		"logo_url":    merchant.LogoURL,
		"banner_url":  merchant.BannerURL,
		"phone":       merchant.Phone,
		"language":    merchant.Language,
	})
}

// GetProductsByStore returns the active catalog for a storefront.
func GetProductsByStore(c *fiber.Ctx) error {
	slug := c.Params("slug")
	col := config.Database.Collection("merchants")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var merchant models.Merchant
	if err := col.FindOne(ctx, bson.M{"slug": slug}).Decode(&merchant); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not_found", "message": "Store not found"})
	}

	prodCol := config.Database.Collection("products")
	cur, err := prodCol.Find(ctx, bson.M{"merchant_id": merchant.ID, "active": true},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "Failed to fetch products"})
	}
	defer cur.Close(ctx)

	var products []models.Product
	if err := cur.All(ctx, &products); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "Failed to decode products"})
	}

	return c.JSON(fiber.Map{"products": products, "count": len(products)})
}

// GetProduct returns a single product by id.
func GetProduct(c *fiber.Ctx) error {
	id, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad_request", "message": "Invalid product id"})
	}
	col := config.Database.Collection("products")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var product models.Product
	if err := col.FindOne(ctx, bson.M{"_id": id}).Decode(&product); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "not_found", "message": "Product not found"})
	}
	return c.JSON(product)
}

// ListMyProducts returns the authenticated merchant's full catalog.
func ListMyProducts(c *fiber.Ctx) error {
	mid, err := parseMerchantID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
	}
	col := config.Database.Collection("products")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cur, err := col.Find(ctx, bson.M{"merchant_id": mid},
		options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}}))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "Failed to fetch products"})
	}
	defer cur.Close(ctx)

	var products []models.Product
	if err := cur.All(ctx, &products); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "Failed to decode products"})
	}
	return c.JSON(fiber.Map{"products": products, "count": len(products)})
}

// CreateProduct adds a new product to the merchant's catalog.
func CreateProduct(c *fiber.Ctx) error {
	mid, err := parseMerchantID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
	}

	var input models.ProductCreateInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad_request", "message": "Invalid JSON body"})
	}
	if input.Name == "" || input.PriceETB <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "validation", "message": "name and price_etb are required"})
	}

	now := time.Now().UTC()
	active := true
	if input.Active != nil {
		active = *input.Active
	}

	product := models.Product{
		MerchantID:    mid,
		Slug:          utils.Slugify(input.Name) + "-" + utils.RandomToken(2),
		Name:          input.Name,
		NameAm:        input.NameAm,
		Description:   input.Description,
		DescriptionAm: input.DescriptionAm,
		PriceETB:      input.PriceETB,
		ImageURL:      input.ImageURL,
		Images:        input.Images,
		Stock:         input.Stock,
		Category:      input.Category,
		Active:        active,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	col := config.Database.Collection("products")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := col.InsertOne(ctx, product)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "Failed to create product"})
	}
	product.ID = res.InsertedID.(primitive.ObjectID)
	return c.Status(201).JSON(product)
}

// UpdateProduct edits an existing product.
func UpdateProduct(c *fiber.Ctx) error {
	mid, err := parseMerchantID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
	}
	pid, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad_request", "message": "Invalid product id"})
	}

	var input models.ProductUpdateInput
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad_request", "message": "Invalid JSON body"})
	}

	updates := bson.M{"updated_at": time.Now().UTC()}
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.NameAm != nil {
		updates["name_am"] = *input.NameAm
	}
	if input.Description != nil {
		updates["description"] = *input.Description
	}
	if input.DescriptionAm != nil {
		updates["description_am"] = *input.DescriptionAm
	}
	if input.PriceETB != nil {
		updates["price_etb"] = *input.PriceETB
	}
	if input.ImageURL != nil {
		updates["image_url"] = *input.ImageURL
	}
	if input.Images != nil {
		updates["images"] = input.Images
	}
	if input.Stock != nil {
		updates["stock"] = *input.Stock
	}
	if input.Category != nil {
		updates["category"] = *input.Category
	}
	if input.Active != nil {
		updates["active"] = *input.Active
	}

	col := config.Database.Collection("products")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := col.UpdateOne(ctx, bson.M{"_id": pid, "merchant_id": mid}, bson.M{"$set": updates})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "Update failed"})
	}
	if res.MatchedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "not_found", "message": "Product not found"})
	}
	return c.JSON(fiber.Map{"success": true})
}

// DeleteProduct removes a product.
func DeleteProduct(c *fiber.Ctx) error {
	mid, err := parseMerchantID(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
	}
	pid, err := primitive.ObjectIDFromHex(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad_request", "message": "Invalid product id"})
	}

	col := config.Database.Collection("products")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := col.DeleteOne(ctx, bson.M{"_id": pid, "merchant_id": mid})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "server_error", "message": "Delete failed"})
	}
	if res.DeletedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "not_found", "message": "Product not found"})
	}
	return c.JSON(fiber.Map{"success": true})
}

