package main

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	_ "github.com/lib/pq"
)

type responseEnvelope struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

var (
	db        *sql.DB
	jwtSecret string
	sharedDir = "/shared"
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

func initDB() {
	host := env("DB_HOST", "postgres")
	port := env("DB_PORT", "5432")
	user := env("DB_USER", "idan")
	password := env("DB_PASSWORD", "")
	name := env("DB_NAME", "idanairline")
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, password, host, port, name)
	var err error
	db, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("DB_CONNECTION_FAILED: %v", err)
	}
	if err = db.Ping(); err != nil {
		log.Fatalf("DB_PING_FAILED: %v", err)
	}
	log.Println("Connected to PostgreSQL")
}

func seedAdmin() {
	email := env("ADMIN_EMAIL", "admin@idan.air")
	password := env("ADMIN_PASSWORD", "")
	fullName := env("ADMIN_FULL_NAME", "System Administrator")
	var exists bool
	db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email).Scan(&exists)
	if exists {
		return
	}
	_, err := db.Exec("INSERT INTO users (email, password, full_name, loyalty_tier) VALUES ($1, $2, $3, 'DIAMOND')", email, password, fullName)
	if err != nil {
		log.Printf("ADMIN_SEED_FAILED: %v", err)
	} else {
		log.Printf("Admin account created: %s", email)
	}
}

func initJWT() {
	jwtSecret = os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("REQUIRED_ENV_NOT_SET: JWT_SECRET")
	}
}

func main() {
	initJWT()
	initDB()
	seedAdmin()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", handleHealth)
	mux.HandleFunc("GET /api/v1/user/profile", handleProfile)
	mux.HandleFunc("POST /api/v1/auth/register", handleRegister)
	mux.HandleFunc("POST /api/v1/auth/login", handleLogin)
	mux.HandleFunc("/api/v1/admin/dashboard", adminDashboardHandler)
	mux.HandleFunc("/api/v1/user/profile/update", updateProfileHandler)
	mux.HandleFunc("/api/v1/user/avatar", updateAvatarHandler)
	mux.HandleFunc("POST /api/v1/user/bio", updateBioHandler)
	mux.HandleFunc("GET /api/v1/user/bio", getBioHandler)
	mux.HandleFunc("GET /api/v1/auth/csrf-token", csrfTokenHandler)
	mux.HandleFunc("POST /api/v1/user/settings/update", updateSettingsHandler)
	mux.HandleFunc("GET /api/v1/user/verify-token", verifyTokenHandler)
	mux.HandleFunc("GET /api/v1/user/search", searchUsersHandler)

	log.Println("User API starting on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		panic(err)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeSuccess(w, http.StatusOK, "ok", map[string]string{"status": "healthy"})
}

type authRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	RedirectURI string `json:"redirect_uri,omitempty"`
	FullName    string `json:"full_name,omitempty"`
}

func handleRegister(w http.ResponseWriter, r *http.Request) {
	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", req.Email).Scan(&exists)
	if err != nil || exists {
		writeError(w, http.StatusConflict, "email already registered")
		return
	}
	fullName := req.FullName
	if fullName == "" {
		fullName = "Idan Traveler"
	}
	var userID string
	err = db.QueryRow("INSERT INTO users (email, password, full_name) VALUES ($1, $2, $3) RETURNING user_id", req.Email, req.Password, fullName).Scan(&userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "registration failed")
		return
	}
	writeSuccess(w, http.StatusCreated, "user registered", map[string]string{"user_id": userID, "email": req.Email})
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}
	var userID, password string
	err := db.QueryRow("SELECT user_id, password FROM users WHERE email = $1", req.Email).Scan(&userID, &password)
	if err != nil || password != req.Password {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	token := buildJWT(userID, req.Email)
	flag := envFlag("CTF_FLAG_A14_OPEN_REDIRECT")
	if req.RedirectURI != "" {
		loc := req.RedirectURI
		if flag != "" {
			if strings.Contains(loc, "?") {
				loc += "&session_continuation_token=" + flag
			} else {
				loc += "?session_continuation_token=" + flag
			}
		}
		w.Header().Set("Location", loc)
		w.WriteHeader(http.StatusFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "token": token})
}

func buildJWT(userID, email string) string {
	header := b64url([]byte(`{"alg":"HS256","typ":"JWT"}`))
	payloadBytes, _ := json.Marshal(map[string]string{"user_id": userID, "email": email})
	payload := b64url(payloadBytes)
	mac := hmac.New(sha256.New, []byte(jwtSecret))
	mac.Write([]byte(header + "." + payload))
	sig := b64url(mac.Sum(nil))
	return header + "." + payload + "." + sig
}

func verifyTokenHandler(w http.ResponseWriter, r *http.Request) {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		writeError(w, http.StatusUnauthorized, "missing token")
		return
	}
	token := strings.TrimPrefix(auth, "Bearer ")
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		writeError(w, http.StatusBadRequest, "invalid token format")
		return
	}
	mac := hmac.New(sha256.New, []byte(jwtSecret))
	mac.Write([]byte(parts[0] + "." + parts[1]))
	expected := b64url(mac.Sum(nil))
	if !hmac.Equal([]byte(parts[2]), []byte(expected)) {
		writeError(w, http.StatusUnauthorized, "invalid token signature")
		return
	}
	flag := envFlag("CTF_FLAG_A17_WEAK_CRYPTO")
	data := map[string]interface{}{
		"verified":             true,
		"token_algorithm":      "HS256",
		"key_derivation":       "hmac-sha256",
	}
	// Flag appears as the signing key fingerprint — looks like a real security metric
	if flag != "" {
		data["signing_key_fingerprint"] = flag
	}
	writeSuccess(w, http.StatusOK, "token verified", data)
}

func parseUserIDFromJWT(r *http.Request) string {
	auth := r.Header.Get("Authorization")
	if !strings.HasPrefix(auth, "Bearer ") {
		return ""
	}
	parts := strings.Split(strings.TrimPrefix(auth, "Bearer "), ".")
	if len(parts) != 3 {
		return ""
	}
	payload := parts[1]
	if m := len(payload) % 4; m != 0 {
		payload += strings.Repeat("=", 4-m)
	}
	decoded, err := base64.URLEncoding.DecodeString(payload)
	if err != nil {
		return ""
	}
	var claims map[string]string
	if err := json.Unmarshal(decoded, &claims); err != nil {
		return ""
	}
	return claims["user_id"]
}

func handleProfile(w http.ResponseWriter, r *http.Request) {
	userID := parseUserIDFromJWT(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	queryID := r.URL.Query().Get("user_id")
	if queryID != "" {
		userID = queryID
	}
	var fullName, email, bio, tier, airport, seatClass, avatarURL string
	err := db.QueryRow("SELECT email, full_name, bio, loyalty_tier, home_airport, preferred_seat_class, avatar_url FROM users WHERE user_id = $1", userID).Scan(&email, &fullName, &bio, &tier, &airport, &seatClass, &avatarURL)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	data := map[string]interface{}{
		"user_id": userID, "email": email, "full_name": fullName,
		"bio": bio, "tier": tier, "home_airport": airport,
		"preferred_seat_class": seatClass, "avatar_url": avatarURL,
		"preferences": []string{"window-seat", "meal-vegetarian"},
	}
	// IDOR via user_id param — flag appears as PII exposure (partial SSN)
	if queryID != "" {
		flag := envFlag("CTF_FLAG_A03_MASS_ASSIGNMENT")
		if flag != "" {
			data["account"] = map[string]string{
				"profile_ssn_tail": flag,
				"data_retention":   "90_days",
			}
		}
	}
	writeSuccess(w, http.StatusOK, "user profile fetched", data)
}

func adminDashboardHandler(w http.ResponseWriter, r *http.Request) {
	flag := envFlag("CTF_FLAG_A02_BROKEN_AUTH")
	data := map[string]interface{}{
		"server_metrics": map[string]interface{}{
			"request_count": 12489, "active_nodes": 3,
			"deployment": "v2.1.4",
		},
	}
	// Flag looks like a cluster config secret that admins use internally
	if flag != "" {
		data["server_config"] = map[string]string{
			"cluster_secret":  flag,
			"config_version":  "2024.08",
			"last_rotation":   "2026-07-15",
		}
	}
	writeSuccess(w, http.StatusOK, "Welcome Admin", data)
}

func updateProfileHandler(w http.ResponseWriter, r *http.Request) {
	userID := parseUserIDFromJWT(r)
	var profileUpdate map[string]interface{}
	json.NewDecoder(r.Body).Decode(&profileUpdate)
	flag := envFlag("CTF_FLAG_A03_MASS_ASSIGNMENT")
	if tier, ok := profileUpdate["loyalty_tier"]; ok && tier == "DIAMOND" {
		data := map[string]interface{}{
			"loyalty_program": map[string]string{
				"tier":                       "DIAMOND",
				"priority":                   "highest",
				"override_authorization_code": flag,
			},
		}
		writeSuccess(w, http.StatusOK, "Profile updated", data)
		return
	}
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	if name, ok := profileUpdate["full_name"].(string); ok {
		db.Exec("UPDATE users SET full_name = $1, updated_at = NOW() WHERE user_id = $2", name, userID)
	}
	if airport, ok := profileUpdate["home_airport"].(string); ok {
		db.Exec("UPDATE users SET home_airport = $1, updated_at = NOW() WHERE user_id = $2", airport, userID)
	}
	writeSuccess(w, http.StatusOK, "Profile updated", map[string]string{"message": "Profile updated successfully"})
}

func updateAvatarHandler(w http.ResponseWriter, r *http.Request) {
	var req struct{ AvatarURL string `json:"avatar_url"` }
	json.NewDecoder(r.Body).Decode(&req)
	if req.AvatarURL == "" {
		writeError(w, http.StatusBadRequest, "avatar_url is required")
		return
	}
	resp, err := http.Get(req.AvatarURL)
	if err != nil {
		http.Error(w, "Failed to fetch avatar", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	w.Write(body)
}

func updateBioHandler(w http.ResponseWriter, r *http.Request) {
	userID := parseUserIDFromJWT(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	var req struct{ Bio string `json:"bio"` }
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}
	db.Exec("UPDATE users SET bio = $1, updated_at = NOW() WHERE user_id = $2", req.Bio, userID)
	writeSuccess(w, http.StatusOK, "bio updated", map[string]interface{}{"bio": req.Bio})
}

func getBioHandler(w http.ResponseWriter, r *http.Request) {
	userID := parseUserIDFromJWT(r)
	if userID == "" {
		userID = r.URL.Query().Get("user_id")
	}
	var bio string
	err := db.QueryRow("SELECT bio FROM users WHERE user_id = $1", userID).Scan(&bio)
	if err != nil {
		bio = ""
	}
	writeSuccess(w, http.StatusOK, "bio fetched", map[string]string{"bio": bio})
}

var csrfTokens = make(map[string]string)

func csrfTokenHandler(w http.ResponseWriter, r *http.Request) {
	userID := parseUserIDFromJWT(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	token := generateUUID()
	csrfTokens[token] = userID
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "csrf_token": token})
}

func updateSettingsHandler(w http.ResponseWriter, r *http.Request) {
	userID := parseUserIDFromJWT(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	csrfHeader := r.Header.Get("X-CSRF-Token")
	var req map[string]interface{}
	json.NewDecoder(r.Body).Decode(&req)
	flag := envFlag("CTF_FLAG_A12_CSRF")
	if csrfHeader != "" {
		data := map[string]interface{}{
			"settings_updated":     true,
			"configuration_id":     "cfg-" + generateUUID()[:8],
		}
		if flag != "" {
			data["operation_audit_trail"] = flag
		}
		writeSuccess(w, http.StatusOK, "settings updated", data)
		return
	}
	writeSuccess(w, http.StatusOK, "settings updated", map[string]interface{}{"settings_updated": true})
}

func searchUsersHandler(w http.ResponseWriter, r *http.Request) {
	email := r.URL.Query().Get("email")
	if email == "" {
		writeError(w, http.StatusBadRequest, "email parameter required")
		return
	}
	var userID, fullName, tier string
	err := db.QueryRow("SELECT user_id, full_name, loyalty_tier FROM users WHERE email = $1", email).Scan(&userID, &fullName, &tier)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeSuccess(w, http.StatusOK, "user found", map[string]interface{}{
		"user_id": userID, "email": email, "full_name": fullName, "loyalty_tier": tier,
	})
}

func b64url(data []byte) string {
	return base64.RawURLEncoding.EncodeToString(data)
}

func generateUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
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
	json.NewEncoder(w).Encode(payload)
}
