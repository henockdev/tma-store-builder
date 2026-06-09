package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Product represents a single SKU listed in a merchant's store.
type Product struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	MerchantID  primitive.ObjectID `bson:"merchant_id" json:"merchant_id"`
	Slug        string             `bson:"slug" json:"slug"`
	Name        string             `bson:"name" json:"name"`
	NameAm      string             `bson:"name_am" json:"name_am"`             // Amharic name
	Description string             `bson:"description" json:"description"`
	DescriptionAm string           `bson:"description_am" json:"description_am"`
	PriceETB    float64            `bson:"price_etb" json:"price_etb"`         // Always ETB
	ImageURL    string             `bson:"image_url" json:"image_url"`
	Images      []string           `bson:"images" json:"images"`               // Optional gallery
	Stock       int                `bson:"stock" json:"stock"`
	Category    string             `bson:"category" json:"category"`
	Active      bool               `bson:"active" json:"active"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time          `bson:"updated_at" json:"updated_at"`
}

// ProductCreateInput is what the admin dashboard POSTs.
type ProductCreateInput struct {
	Name          string   `json:"name"`
	NameAm        string   `json:"name_am"`
	Description   string   `json:"description"`
	DescriptionAm string   `json:"description_am"`
	PriceETB      float64  `json:"price_etb"`
	ImageURL      string   `json:"image_url"`
	Images        []string `json:"images"`
	Stock         int      `json:"stock"`
	Category      string   `json:"category"`
	Active        *bool    `json:"active"`
}

// ProductUpdateInput allows partial updates.
type ProductUpdateInput struct {
	Name          *string  `json:"name"`
	NameAm        *string  `json:"name_am"`
	Description   *string  `json:"description"`
	DescriptionAm *string  `json:"description_am"`
	PriceETB      *float64 `json:"price_etb"`
	ImageURL      *string  `json:"image_url"`
	Images        []string `json:"images"`
	Stock         *int     `json:"stock"`
	Category      *string  `json:"category"`
	Active        *bool    `json:"active"`
}
