package middleware

import (
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// JWTAuth validates the Authorization: Bearer <token> header and
// injects the merchant ID into the request context.
func JWTAuth() fiber.Handler {
	secret := []byte(os.Getenv("JWT_SECRET"))
	if len(secret) == 0 {
		// Stable fallback for local dev only
		secret = []byte("tma-store-builder-dev-secret-change-me")
	}

	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized", "message": "Missing Authorization header"})
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized", "message": "Invalid Authorization format"})
		}

		token, err := jwt.Parse(parts[1], func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return secret, nil
		})

		if err != nil || !token.Valid {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized", "message": "Invalid or expired token"})
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized", "message": "Invalid claims"})
		}

		// Stash for handlers
		c.Locals("merchant_id", claims["merchant_id"])
		c.Locals("email", claims["email"])
		return c.Next()
	}
}
