package main

import (
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"

	"tma-store-builder/backend/config"
	"tma-store-builder/backend/handlers"
	"tma-store-builder/backend/middleware"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment")
	}

	// Connect to MongoDB
	if err := config.ConnectDB(); err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "TMA Store Builder API",
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		BodyLimit:    10 * 1024 * 1024, // 10MB for image uploads
		ErrorHandler: customErrorHandler,
		// FIX 1: Trust proxy headers so c.IP() gets the actual client IP on Render
		ProxyHeader: fiber.HeaderXForwardedFor,
	})

	// Global middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     getEnv("CORS_ORIGINS", "*"),
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Telegram-Init-Data",
		AllowCredentials: false,
		MaxAge:           86400,
	}))

	// Rate limiter configuration
	app.Use(limiter.New(limiter.Config{
		Max:        100,
		Expiration: 1 * time.Minute,
		// FIX 3: Bypass rate limiter for critical endpoints (webhooks & health checks)
		Next: func(c *fiber.Ctx) bool {
			path := c.Path()
			return path == "/health" || path == "/api/v1/chapa/webhook"
		},
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{
				"error":   "rate_limit_exceeded",
				"message": "Too many requests, please slow down.",
			})
		},
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "tma-store-builder-api",
			"time":    time.Now().UTC().Format(time.RFC3339),
		})
	})

	// API v1 group
	api := app.Group("/api/v1")

	// Public routes
	api.Get("/store/:slug", handlers.GetStoreBySlug)              // Get store + products
	api.Get("/store/:slug/products", handlers.GetProductsByStore) // List products
	api.Get("/product/:id", handlers.GetProduct)                  // Single product
	api.Post("/orders", handlers.CreateOrder)                     // Create order (public checkout)
	api.Get("/orders/:id", handlers.GetOrder)                     // Order status (for polling)
	api.Post("/chapa/initialize", handlers.InitializeChapa)       // Start payment
	api.Post("/chapa/webhook", handlers.ChapaWebhook)             // Chapa webhook (no auth)

	// Merchant auth
	api.Post("/merchants/register", handlers.RegisterMerchant)
	api.Post("/merchants/login", handlers.LoginMerchant)

	// Protected merchant routes
	merchant := api.Group("/merchant", middleware.JWTAuth())
	merchant.Get("/me", handlers.GetMe)
	merchant.Get("/products", handlers.ListMyProducts)
	merchant.Post("/products", handlers.CreateProduct)
	merchant.Put("/products/:id", handlers.UpdateProduct)
	merchant.Delete("/products/:id", handlers.DeleteProduct)
	merchant.Get("/orders", handlers.ListMyOrders)
	merchant.Patch("/orders/:id/status", handlers.UpdateOrderStatus)
	merchant.Get("/stats", handlers.GetStoreStats)

	// Start server
	port := getEnv("PORT", "8080")
	log.Printf("🚀 TMA Store Builder API listening on :%s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

// FIX 2: Prevent internal system/DB errors from leaking to users
func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	message := "An internal server error occurred"

	// If it's an explicit Fiber error (like 404, 400 Bad Request), show the real context
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		message = e.Message
	} else {
		// Log structural database or code errors internally where users can't see them
		log.Printf("Internal Server Error: %v", err)
	}

	return c.Status(code).JSON(fiber.Map{
		"error":   "server_error",
		"message": message,
	})
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
