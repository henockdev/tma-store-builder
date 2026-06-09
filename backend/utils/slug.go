package utils

import (
	"crypto/rand"
	"encoding/hex"
	"regexp"
	"strings"
	"unicode"
)

var nonAlphanumeric = regexp.MustCompile(`[^a-z0-9]+`)

// Slugify converts a string to a URL-safe lowercase slug.
func Slugify(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			b.WriteRune(unicode.ToLower(r))
		case unicode.IsSpace(r) || r == '-' || r == '_' || r == '/':
			b.WriteRune('-')
		}
	}
	out := nonAlphanumeric.ReplaceAllString(b.String(), "-")
	out = strings.Trim(out, "-")
	if out == "" {
		return "store"
	}
	return out
}

// RandomToken returns a short hex token (e.g. for tx_ref).
func RandomToken(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
