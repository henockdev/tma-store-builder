package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Merchant represents a store owner on the platform.
type Merchant struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email        string             `bson:"email" json:"email"`
	PasswordHash string             `bson:"password_hash" json:"-"`
	StoreName    string             `bson:"store_name" json:"store_name"`
	Slug         string             `bson:"slug" json:"slug"` // URL-safe, used in storefront URL
	Description  string             `bson:"description" json:"description"`
	LogoURL      string             `bson:"logo_url" json:"logo_url"`
	BannerURL    string             `bson:"banner_url" json:"banner_url"`
	Phone        string             `bson:"phone" json:"phone"`
	Language     string             `bson:"language" json:"language"` // "en" or "am"
	CreatedAt    time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt    time.Time          `bson:"updated_at" json:"updated_at"`
}

// PublicMerchant is the safe-to-share merchant view (no password hash).
type PublicMerchant struct {
	ID          string    `json:"id"`
	StoreName   string    `json:"store_name"`
	Slug        string    `json:"slug"`
	Description string    `json:"description"`
	LogoURL     string    `json:"logo_url"`
	BannerURL   string    `json:"banner_url"`
	Phone       string    `json:"phone"`
	Language    string    `json:"language"`
	CreatedAt   time.Time `json:"created_at"`
}
