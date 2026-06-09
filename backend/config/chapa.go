package config

import "os"

// ChapaConfig holds the Chapa payment gateway configuration.
type ChapaConfig struct {
	SecretKey string
	PublicKey string
	BaseURL   string
	WebhookSecret string
}

// GetChapaConfig returns the active Chapa configuration.
// Switch to live keys when ready by setting CHAPA_SECRET_KEY in Render env.
func GetChapaConfig() ChapaConfig {
	secret := os.Getenv("CHAPA_SECRET_KEY")
	if secret == "" {
		// Test secret (safe for local dev only — replace in production)
		secret = "CHASECK_TEST-xxxxxxxxxxxxxxxxxxxxx"
	}
	return ChapaConfig{
		SecretKey:     secret,
		PublicKey:     os.Getenv("CHAPA_PUBLIC_KEY"),
		BaseURL:       "https://api.chapa.co/v1",
		WebhookSecret: os.Getenv("CHAPA_WEBHOOK_SECRET"),
	}
}
