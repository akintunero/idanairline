package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"
)

// User holds credentials and identity for a registered user.
type User struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	UserID   string `json:"user_id"`
}

type responseEnvelope struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

const dbPath = "/app/data/users.json"

// Persistent user store keyed by email.
var (
	mu    sync.RWMutex
	users = map[string]User{
		"admin@idan.air": {
			Email:    "admin@idan.air",
			Password: "supersecret",
			UserID:   "admin_idan",
		},
	}
)

func loadUsers() {
	data, err := os.ReadFile(dbPath)
	if err != nil {
		return // file doesn't exist yet; keep defaults
	}
	var loaded map[string]User
	if err := json.Unmarshal(data, &loaded); err != nil {
		return
	}
	users = loaded
}

func saveUsers() error {
	data, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(dbPath, data, 0644)
}

func main() {
	_ = os.MkdirAll("/app/data", 0755)
	loadUsers()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", handleHealth)
	mux.HandleFunc("GET /api/v1/user/profile", handleProfile)
	mux.HandleFunc("GET /api/v1/user/status", handleStatus)
	mux.HandleFunc("POST /api/v1/auth/register", handleRegister)
	mux.HandleFunc("POST /api/v1/auth/login", handleLogin)
	mux.HandleFunc("/api/v1/admin/dashboard", adminDashboardHandler)
	mux.HandleFunc("/api/v1/user/profile/update", updateProfileHandler)
	mux.HandleFunc("/api/v1/user/avatar", updateAvatarHandler)

	server := &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}

	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		panic(err)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeSuccess(w, http.StatusOK, "ok", map[string]string{
		"status": "healthy",
	})
}

func handleProfile(w http.ResponseWriter, r *http.Request) {
	writeSuccess(w, http.StatusOK, "user profile fetched", map[string]interface{}{
		"user_id":     "USR-001",
		"email":       "traveler@idan-airlines.com",
		"first_name":  "Idan",
		"last_name":   "Traveler",
		"tier":        "SILVER",
		"preferences": []string{"window-seat", "meal-vegetarian"},
	})
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	writeSuccess(w, http.StatusOK, "user status fetched", map[string]interface{}{
		"user_id":               "USR-001",
		"active":                true,
		"email_verified":        true,
		"two_factor_registered": false,
	})
}

type authRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func handleRegister(w http.ResponseWriter, r *http.Request) {
	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	mu.Lock()
	defer mu.Unlock()

	if _, exists := users[req.Email]; exists {
		writeError(w, http.StatusConflict, "email already registered")
		return
	}

	userID := generateUUID()
	users[req.Email] = User{
		Email:    req.Email,
		Password: req.Password,
		UserID:   userID,
	}
	_ = saveUsers()

	writeSuccess(w, http.StatusCreated, "user registered", map[string]string{
		"user_id": userID,
		"email":   req.Email,
	})
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	mu.RLock()
	user, exists := users[req.Email]
	mu.RUnlock()

	if !exists || user.Password != req.Password {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token := buildJWT(user.UserID, user.Email)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"token":   token,
	})
}

// buildJWT constructs a JWT manually without any third-party library.
// Format: base64UrlEncode(header) + "." + base64UrlEncode(payload) + "." + mockSignature
func buildJWT(userID, email string) string {
	header := b64url([]byte(`{"alg":"HS256","typ":"JWT"}`))

	payloadBytes, _ := json.Marshal(map[string]string{
		"user_id": userID,
		"email":   email,
	})
	payload := b64url(payloadBytes)

	mockSig := b64url([]byte("mock_signature"))
	return header + "." + payload + "." + mockSig
}

func b64url(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}

// generateUUID produces a random RFC-4122-style UUID using crypto/rand.
func generateUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func writeSuccess(w http.ResponseWriter, status int, message string, data interface{}) {
	writeJSON(w, status, responseEnvelope{Success: true, Message: message, Data: data})
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, responseEnvelope{Success: false, Message: message})
}

func writeJSON(w http.ResponseWriter, status int, payload responseEnvelope) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// A02: Admin Dashboard (Broken Auth)
func adminDashboardHandler(w http.ResponseWriter, r *http.Request) {
	// In a real app, this should cryptographically verify the token.
	// Here, we just trust the decoded payload's role.
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Welcome Admin", "flag": "IDAN{JWT_S1GN4TUR3_BYP4SS}"}`))
}

// A03: Update Profile (Mass Assignment)
func updateProfileHandler(w http.ResponseWriter, r *http.Request) {
	var profileUpdate map[string]interface{}
	json.NewDecoder(r.Body).Decode(&profileUpdate)

	// Blindly accepting all fields! If they send loyalty_tier, they get the flag.
	if tier, ok := profileUpdate["loyalty_tier"]; ok && tier == "DIAMOND" {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"message": "Profile updated", "flag": "IDAN{M4SS_4SS1GNM3NT_UPGR4D3}"}`))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"message": "Profile updated"}`))
}

// A07: SSRF Avatar Upload
func updateAvatarHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		AvatarURL string `json:"avatar_url"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	// FIXME: We are using a simple http.Get(). We need to restrict this so users can't scan our internal Docker network.
	resp, err := http.Get(req.AvatarURL)
	if err != nil {
		http.Error(w, "Failed to fetch avatar", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	w.Write(body)
}
