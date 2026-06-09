package config

import (
	"context"
	"log"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	Client   *mongo.Client
	Database *mongo.Database
)

// ConnectDB establishes a connection to MongoDB Atlas.
func ConnectDB() error {
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		uri = "mongodb://localhost:27017"
	}
	dbName := os.Getenv("MONGODB_DB")
	if dbName == "" {
		dbName = "tma_store_builder"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOpts := options.Client().
		ApplyURI(uri).
		SetMaxPoolSize(20).                  // Cap connections for free tier
		SetServerSelectionTimeout(5 * time.Second).
		SetConnectTimeout(5 * time.Second)

	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return err
	}

	// Ping to verify connection
	if err := client.Ping(ctx, nil); err != nil {
		return err
	}

	Client = client
	Database = client.Database(dbName)
	log.Printf("✅ Connected to MongoDB database: %s", dbName)

	// Create indexes for performance
	go createIndexes()
	return nil
}

func createIndexes() {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Merchants: unique on email and slug
	merchants := Database.Collection("merchants")
	_, _ = merchants.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: map[string]interface{}{"email": 1}, Options: options.Index().SetUnique(true)},
		{Keys: map[string]interface{}{"slug": 1}, Options: options.Index().SetUnique(true)},
	})

	// Products: index on merchant_id + created_at
	products := Database.Collection("products")
	_, _ = products.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: map[string]interface{}{"merchant_id": 1, "created_at": -1}},
		{Keys: map[string]interface{}{"slug": 1, "merchant_id": 1}},
	})

	// Orders: index on merchant_id + created_at, and tx_ref for Chapa lookups
	orders := Database.Collection("orders")
	_, _ = orders.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: map[string]interface{}{"merchant_id": 1, "created_at": -1}},
		{Keys: map[string]interface{}{"tx_ref": 1}, Options: options.Index().SetUnique(true)},
		{Keys: map[string]interface{}{"status": 1}},
	})
}

// DisconnectDB cleanly closes the MongoDB connection.
func DisconnectDB() {
	if Client != nil {
		_ = Client.Disconnect(context.Background())
	}
}
