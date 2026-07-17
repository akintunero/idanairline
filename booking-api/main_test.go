package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func createRequest(method string, body []byte, authHeader string) *http.Request {
	r := httptest.NewRequest(method, "/", nil)
	if authHeader != "" {
		r.Header.Set("Authorization", authHeader)
	}
	return r
}

func TestGeneratePNR(t *testing.T) {
	pnr := generatePNR()
	if !strings.HasPrefix(pnr, "IDN-") {
		t.Errorf("PNR should start with IDN-, got %s", pnr)
	}
	if len(pnr) != 10 {
		t.Errorf("PNR length should be 10 (IDN-XXXXXX), got %d: %s", len(pnr), pnr)
	}
}

func TestGeneratePNRUniqueness(t *testing.T) {
	seen := make(map[string]bool)
	for i := 0; i < 100; i++ {
		pnr := generatePNR()
		if seen[pnr] {
			t.Errorf("Duplicate PNR generated: %s", pnr)
		}
		seen[pnr] = true
	}
}

func TestParseUserIDFromJWTEmpty(t *testing.T) {
	r := createRequest("GET /", nil, "")
	uid := parseUserIDFromJWT(r)
	if uid != "" {
		t.Errorf("Expected empty user_id for no auth, got %s", uid)
	}
}

func TestParseUserIDFromJWTValid(t *testing.T) {
	r := createRequest("GET /", nil,
		"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzdC11c2VyIiwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIn0.fakesig")
	uid := parseUserIDFromJWT(r)
	if uid != "test-user" {
		t.Errorf("Expected test-user, got %s", uid)
	}
}

func TestParseUserIDFromJWTInvalid(t *testing.T) {
	tests := []struct {
		name  string
		token string
	}{
		{"no bearer", "not-a-bearer-token"},
		{"wrong parts", "Bearer only.two"},
		{"bad base64", "Bearer bad.!@#.sig"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := createRequest("GET /", nil, tt.token)
			uid := parseUserIDFromJWT(r)
			if uid != "" {
				t.Errorf("Expected empty, got %s", uid)
			}
		})
	}
}

func TestB64URL(t *testing.T) {
	result := b64url([]byte("test"))
	if result != "dGVzdA" {
		t.Errorf("Expected dGVzdA, got %s", result)
	}
}
