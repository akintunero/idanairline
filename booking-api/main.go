package main

import (
	"bytes"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gomodule/redigo/redis"
	_ "github.com/lib/pq"
)

const (
	StatusPending   = "PENDING"
	StatusCancelled = "CANCELLED"
	StatusConfirmed = "CONFIRMED"
)

type app struct {
	db                  *sql.DB
	redisPool           *redis.Pool
	paymentServiceURL   string
	flashPromoCode      string
	flashPromoMaxSlots  int
	raceWindow          time.Duration
	defaultPrice        float64
	flashMu             sync.Mutex
	flashPromoRedemptions int
}

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

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		n, err := strconv.Atoi(v)
		if err == nil {
			return n
		}
	}
	return fallback
}

func envFlag(key string) string {
	return os.Getenv(key)
}

func (a *app) initDB() {
	host := env("DB_HOST", "postgres")
	port := env("DB_PORT", "5432")
	user := env("DB_USER", "idan")
	password := env("DB_PASSWORD", "")
	name := env("DB_NAME", "idanairline")
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable", user, password, host, port, name)
	var err error
	a.db, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("DB_CONNECTION_FAILED: %v", err)
	}
	if err = a.db.Ping(); err != nil {
		log.Fatalf("DB_PING_FAILED: %v", err)
	}
	log.Println("Connected to PostgreSQL")
}

func (a *app) initRedis() {
	redisURL := env("REDIS_URL", "redis://redis:6379/0")
	a.redisPool = &redis.Pool{
		MaxIdle:     3,
		IdleTimeout: 240 * time.Second,
		Dial: func() (redis.Conn, error) {
			return redis.DialURL(redisURL)
		},
	}
	conn := a.redisPool.Get()
	defer conn.Close()
	if err := conn.Err(); err != nil {
		log.Printf("Redis unavailable: %v", err)
	} else {
		log.Println("Connected to Redis")
	}
}

func (a *app) publishBookingEvent(bookingID, userID, passengerName, ticketID string) {
	if a.redisPool == nil {
		return
	}
	conn := a.redisPool.Get()
	defer conn.Close()
	event := map[string]string{
		"type": "booking_confirmed", "booking_id": bookingID,
		"user_id": userID, "passenger_name": passengerName, "ticket_id": ticketID,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}
	data, _ := json.Marshal(event)
	_, err := conn.Do("LPUSH", "booking:queue", string(data))
	if err != nil {
		log.Printf("Redis publish failed: %v", err)
	}
}

func main() {
	a := &app{}
	a.paymentServiceURL = env("PAYMENT_SERVICE_URL", "http://payment-api:8080")
	a.flashPromoCode = os.Getenv("FLASH_PROMO_CODE")
	a.flashPromoMaxSlots = envInt("FLASH_PROMO_MAX_SLOTS", 1)
	a.raceWindow = time.Duration(envInt("RACE_CONDITION_WINDOW_MS", 400)) * time.Millisecond
	a.defaultPrice = float64(envInt("DEFAULT_BOOKING_PRICE", 5000))

	_ = os.MkdirAll("/app/data/boarding-passes", 0755)
	_ = os.WriteFile("/app/data/boarding-passes/sample.pdf",
		[]byte("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 100 700 Td (Board Pass) Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \n0000000362 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n419\n%%EOF"),
		0644)
	a.initDB()
	a.initRedis()

	mux := http.NewServeMux()
	// Existing
	mux.HandleFunc("GET /healthz", a.handleHealth)
	mux.HandleFunc("POST /api/v1/booking/hold", a.handleHoldBooking)
	mux.HandleFunc("POST /api/v1/booking/cancel", a.handleCancelBooking)
	mux.HandleFunc("POST /api/v1/booking/confirm", a.handleConfirmBooking)
	mux.HandleFunc("POST /api/v1/booking/itinerary", a.handleItinerary)
	mux.HandleFunc("/api/v0/booking/export", a.handleLegacyExport)
	mux.HandleFunc("GET /api/v1/booking/boarding-pass", a.handleBoardingPass)
	mux.HandleFunc("GET /api/v1/booking/lookup", a.handleIDORLookup)
	mux.HandleFunc("GET /api/v1/booking/mine", a.handleMyBookings)
	// Flight inventory
	mux.HandleFunc("GET /api/v1/flights/search", a.handleSearchFlights)
	mux.HandleFunc("GET /api/v1/flights/seats", a.handleSeatMap)
	mux.HandleFunc("POST /api/v1/flights/seats/hold", a.handleHoldSeat)
	mux.HandleFunc("GET /api/v1/flights/fare-rules", a.handleFareRules)
	// Multi-passenger
	mux.HandleFunc("POST /api/v1/booking/passengers", a.handleAddPassenger)
	mux.HandleFunc("GET /api/v1/booking/passengers", a.handleGetPassengers)
	mux.HandleFunc("PUT /api/v1/booking/passengers", a.handleUpdatePassenger)
	// Check-in
	mux.HandleFunc("POST /api/v1/booking/checkin", a.handleCheckin)
	// External integration (GDS)
	mux.HandleFunc("POST /api/v1/gds/query", a.handleGDSQuery)
	mux.HandleFunc("GET /api/v1/booking/encrypted-manifest", a.handleEncryptedManifest)

	log.Println("Booking API starting on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		panic(err)
	}
}

func chargePayment(bookingID, cardNumber string) error {
	payload := map[string]interface{}{
		"booking_id":  bookingID,
		"amount":      5000.0,
		"currency":    "NGN",
		"card_number": cardNumber,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payment payload: %w", err)
	}
	client := &http.Client{Timeout: 5 * time.Second}
	paymentURL := os.Getenv("PAYMENT_SERVICE_URL")
	if paymentURL == "" {
		paymentURL = "http://payment-api:8080"
	}
	resp, err := client.Post(paymentURL+"/api/v1/payment/charge", "application/json", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 500 {
		return fmt.Errorf("payment service error: status %d", resp.StatusCode)
	}
	if resp.StatusCode >= 400 {
		return fmt.Errorf("payment rejected: status %d", resp.StatusCode)
	}
	return nil
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

func generatePNR() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 6)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[n.Int64()]
	}
	return "IDN-" + string(b)
}

func writeConfirmResponse(w http.ResponseWriter, status int, payload confirmResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func writeSuccess(w http.ResponseWriter, status int, message string, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(responseEnvelope{Success: true, Message: message, Data: data})
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(responseEnvelope{Success: false, Message: message})
}
