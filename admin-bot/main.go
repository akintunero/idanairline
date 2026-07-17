package main

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
)

var (
	userAPIURL string
	adminToken string
	adminEmail string
	adminPass  string
)

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	if fallback != "" {
		return fallback
	}
	log.Fatalf("REQUIRED_ENV_NOT_SET: %s", key)
	return ""
}

func envFlag(key string) string {
	return os.Getenv(key)
}

func loginAsAdmin() string {
	loginBody, _ := json.Marshal(map[string]string{
		"email":    adminEmail,
		"password": adminPass,
	})
	resp, err := http.Post(
		userAPIURL+"/api/v1/auth/login",
		"application/json",
		bytes.NewReader(loginBody),
	)
	if err != nil {
		log.Printf("Admin login failed: %v", err)
		return ""
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Token string `json:"token"`
	}
	if json.Unmarshal(body, &result) != nil || result.Token == "" {
		log.Printf("Admin login returned no token")
		return ""
	}
	log.Printf("Admin bot authenticated: %s", adminEmail)
	return result.Token
}

func main() {
	userAPIURL = env("USER_API_URL", "http://user-api:8080")
	adminEmail = env("ADMIN_EMAIL", "admin@idan.air")

	adminPass = os.Getenv("ADMIN_PASSWORD")
	if adminPass == "" {
		if data, err := os.ReadFile("/shared/.admin-password"); err == nil {
			adminPass = strings.TrimSpace(string(data))
		}
	}
	if adminPass == "" {
		log.Fatal("ADMIN_PASSWORD not set and /shared/.admin-password not found")
	}

	adminToken = loginAsAdmin()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
	})
	mux.HandleFunc("POST /api/v1/admin/bot/review", handleReviewProfile)
	mux.HandleFunc("GET /api/v1/admin/bot/status", handleBotStatus)

	log.Println("Admin Bot starting on :7000")
	if err := http.ListenAndServe(":7000", mux); err != nil {
		panic(err)
	}
}

func handleBotStatus(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]interface{}{
		"bot_online": adminToken != "",
		"admin_user": adminEmail,
	})
}

func handleReviewProfile(w http.ResponseWriter, r *http.Request) {
	var req struct {
		UserID string `json:"user_id"`
		Bio    string `json:"bio"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	bioToCheck := req.Bio

	if bioToCheck == "" && req.UserID != "" && adminToken != "" {
		client := &http.Client{}
		apiReq, _ := http.NewRequest("GET",
			fmt.Sprintf("%s/api/v1/user/bio?user_id=%s", userAPIURL, req.UserID), nil)
		apiReq.Header.Set("Authorization", "Bearer "+adminToken)
		resp, err := client.Do(apiReq)
		if err == nil {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			var result struct {
				Success bool `json:"success"`
				Data    struct {
					Bio string `json:"bio"`
				} `json:"data"`
			}
			if json.Unmarshal(body, &result) == nil && result.Success {
				bioToCheck = result.Data.Bio
			}
		}
	}

	xssDetected := strings.Contains(bioToCheck, "<script") ||
		strings.Contains(bioToCheck, "onerror") ||
		strings.Contains(bioToCheck, "onload")

	result := map[string]interface{}{
		"reviewed":     true,
		"xss_detected": xssDetected,
		"admin_email":  adminEmail,
		"bio_rendered": bioToCheck != "",
	}

	if xssDetected {
		captured := map[string]string{
			"admin_email": adminEmail,
			"admin_jwt":   adminToken,
			"endpoint":    userAPIURL + "/api/v1/admin/dashboard",
		}
		result["exfiltrated_session"] = captured

		flag := envFlag("CTF_FLAG_A11_XSS")
		if flag != "" {
			result["support_ticket"] = map[string]string{
				"id":             "TKT-" + generateRef(),
				"internal_note":  flag,
				"priority":       "critical",
			}
		}
	}

	json.NewEncoder(w).Encode(result)
}

func generateRef() string {
	b := make([]byte, 4)
	rand.Read(b)
	return fmt.Sprintf("%08x", b)
}


