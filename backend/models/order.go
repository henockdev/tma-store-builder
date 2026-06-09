package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// OrderStatus represents the lifecycle of an order.
type OrderStatus string

const (
	OrderPending   OrderStatus = "pending"   // Created, awaiting payment
	OrderPaid      OrderStatus = "paid"      // Chapa confirmed
	OrderShipped   OrderStatus = "shipped"   // Out for delivery
	OrderDelivered OrderStatus = "delivered" // Customer received
	OrderCancelled OrderStatus = "cancelled" // Cancelled by merchant or timeout
	OrderFailed    OrderStatus = "failed"    // Payment failed
)

// OrderItem is a single line in an order.
type OrderItem struct {
	ProductID primitive.ObjectID `bson:"product_id" json:"product_id"`
	Name      string             `bson:"name" json:"name"`
	PriceETB  float64            `bson:"price_etb" json:"price_etb"`
	Quantity  int                `bson:"quantity" json:"quantity"`
	ImageURL  string             `bson:"image_url" json:"image_url"`
}

// Order is a customer checkout.
type Order struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	MerchantID    primitive.ObjectID `bson:"merchant_id" json:"merchant_id"`
	TxRef         string             `bson:"tx_ref" json:"tx_ref"`             // Chapa transaction reference
	ChapaRef      string             `bson:"chapa_ref" json:"chapa_ref"`       // Set after payment
	Items         []OrderItem        `bson:"items" json:"items"`
	SubtotalETB   float64            `bson:"subtotal_etb" json:"subtotal_etb"`
	ShippingETB   float64            `bson:"shipping_etb" json:"shipping_etb"`
	TotalETB      float64            `bson:"total_etb" json:"total_etb"`

	// Customer info
	CustomerName  string `bson:"customer_name" json:"customer_name"`
	CustomerPhone string `bson:"customer_phone" json:"customer_phone"`
	DeliveryArea  string `bson:"delivery_area" json:"delivery_area"`
	Notes         string `bson:"notes" json:"notes"`

	// Status & meta
	Status        OrderStatus `bson:"status" json:"status"`
	PaymentMethod string      `bson:"payment_method" json:"payment_method"` // telebirr, cbe, card
	Language      string      `bson:"language" json:"language"`            // en | am

	CreatedAt time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time `bson:"updated_at" json:"updated_at"`
	PaidAt    *time.Time `bson:"paid_at,omitempty" json:"paid_at,omitempty"`
}

// CreateOrderInput is what the storefront POSTs at checkout.
type CreateOrderInput struct {
	MerchantSlug   string      `json:"merchant_slug"`
	Items          []OrderItem `json:"items"`
	CustomerName   string      `json:"customer_name"`
	CustomerPhone  string      `json:"customer_phone"`
	DeliveryArea   string      `json:"delivery_area"`
	Notes          string      `json:"notes"`
	PaymentMethod  string      `json:"payment_method"` // telebirr | cbe | card
	Language       string      `json:"language"`      // en | am
}
