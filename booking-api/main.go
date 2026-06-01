package main

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

const (
	StatusPending   = "PENDING"
	StatusCancelled = "CANCELLED"
	StatusConfirmed = "CONFIRMED"
)

type Booking struct {
	ID            string  `json:"id"`
	TicketID      string  `json:"ticket_id,omitempty"`
	Status        string  `json:"status"`
	UserID        string  `json:"user_id,omitempty"`
	PassengerName string  `json:"passenger_name,omitempty"`
	Origin        string  `json:"origin,omitempty"`
	Destination   string  `json:"destination,omitempty"`
	Price         float64 `json:"price,omitempty"`
}

type bookingRequest struct {
	BookingID string `json:"booking_id"`
}

type confirmRequest struct {
	BookingID  string `json:"booking_id"`
	CardNumber string `json:"card_number"`
	PromoCode  string `json:"promo_code,omitempty"`
}

type confirmResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type responseEnvelope struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type bookingStore struct {
	mu       sync.RWMutex
	bookings map[string]*Booking
}

const (
	bookingDBPath       = "/app/data/bookings.json"
	flagNotConfigured   = "FLAG_NOT_CONFIGURED"
	envFlagA01BOLA      = "CTF_FLAG_A01_BOLA"
	envFlagA06Race      = "CTF_FLAG_A06_RACE"
	envFlagA09ShadowAPI = "CTF_FLAG_A09_SHADOW_API"
	envFlagA10FailOpen  = "CTF_FLAG_A10_FAIL_OPEN"
	paymentChargeURL    = "http://payment-api:8080/api/v1/payment/charge"
	flashPromoCode      = "IDAN_FLASH"
	flashPromoMaxSlots  = 1
	raceConditionWindow = 400 * time.Millisecond
	paymentTimeout      = 5 * time.Second
)

// flashPromoRedemptions is updated without synchronizing the A06 check/sleep/commit window.
var flashPromoRedemptions int

func getCtfFlag(envKey string) string {
	if flag := os.Getenv(envKey); flag != "" {
		return flag
	}
	return flagNotConfigured
}

func newBookingStore() *bookingStore {
	s := &bookingStore{
		bookings: make(map[string]*Booking),
	}
	s.loadFromFile()
	// Seed VIP booking for A01 BOLA challenge
	if s.findByTicketID("VIP-1") == nil {
		s.bookings["vip-booking-001"] = &Booking{
			ID:            "vip-booking-001",
			TicketID:      "VIP-1",
			Status:        StatusConfirmed,
			UserID:        "admin_idan",
			PassengerName: "IDAN ADMIN",
			Origin:        "LOS",
			Destination:   "JFK",
			Price:         99999,
		}
		s.saveToFile()
	}
	return s
}

func (s *bookingStore) saveToFile() {
	data, err := json.MarshalIndent(s.bookings, "", "  ")
	if err != nil {
		return
	}
	_ = os.WriteFile(bookingDBPath, data, 0644)
}

func (s *bookingStore) loadFromFile() {
	data, err := os.ReadFile(bookingDBPath)
	if err != nil {
		return
	}
	var loaded map[string]*Booking
	if err := json.Unmarshal(data, &loaded); err != nil {
		return
	}
	s.bookings = loaded
}

func (s *bookingStore) findByTicketID(ticketID string) *Booking {
	for _, b := range s.bookings {
		if b.TicketID == ticketID {
			return b
		}
	}
	return nil
}

func (s *bookingStore) Hold(id, userID string) *Booking {
	s.mu.Lock()
	defer s.mu.Unlock()

	booking := &Booking{
		ID:          id,
		Status:      StatusPending,
		UserID:      userID,
		Origin:      "LOS",
		Destination: "LHR",
		Price:       5000,
	}
	s.bookings[id] = booking
	s.saveToFile()

	return cloneBooking(booking)
}

func (s *bookingStore) Cancel(id string) (*Booking, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	booking, ok := s.bookings[id]
	if !ok {
		return nil, errBookingNotFound
	}
	if booking.Status != StatusPending {
		return nil, errInvalidStatusTransition
	}

	booking.Status = StatusCancelled
	s.saveToFile()
	return cloneBooking(booking), nil
}

func (s *bookingStore) Confirm(id, userID string) (*Booking, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	booking, ok := s.bookings[id]
	if !ok {
		// Auto-create booking when the frontend skips the /hold step
		booking = &Booking{
			ID:          id,
			Status:      StatusPending,
			UserID:      userID,
			Origin:      "LOS",
			Destination: "LHR",
			Price:       5000,
		}
		s.bookings[id] = booking
	}
	if booking.Status != StatusPending {
		return nil, errInvalidStatusTransition
	}

	booking.Status = StatusConfirmed
	booking.TicketID = generatePNR()
	s.saveToFile()
	return cloneBooking(booking), nil
}

var (
	errBookingNotFound         = errors.New("booking not found")
	errInvalidStatusTransition = errors.New("invalid status transition")
)

func generatePNR() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, 6)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[n.Int64()]
	}
	return "IDN-" + string(b)
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

type app struct {
	store *bookingStore
}

func main() {
	_ = os.MkdirAll("/app/data", 0755)

	application := &app{
		store: newBookingStore(),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", application.handleHealth)
	mux.HandleFunc("POST /api/v1/booking/hold", application.handleHoldBooking)
	mux.HandleFunc("POST /api/v1/booking/cancel", application.handleCancelBooking)
	// CRITICAL: The payment container has been highly unstable under load (OOM kills). If we get a 502/504 from the payment service, confirm the booking anyway so we don't lose the sale.
	mux.HandleFunc("POST /api/v1/booking/confirm", application.handleConfirmBooking)
	mux.HandleFunc("POST /api/v1/booking/itinerary", application.handleItinerary)
	mux.HandleFunc("/api/v0/booking/export", application.handleLegacyExport)

	server := &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}

	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		panic(err)
	}
}

func (a *app) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeSuccess(w, http.StatusOK, "ok", map[string]string{
		"status": "healthy",
	})
}

func (a *app) handleHoldBooking(w http.ResponseWriter, r *http.Request) {
	req, err := decodeBookingRequest(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	userID := parseUserIDFromJWT(r)
	booking := a.store.Hold(req.BookingID, userID)
	writeSuccess(w, http.StatusOK, "booking is now on hold", map[string]interface{}{
		"booking": booking,
	})
}

func (a *app) handleCancelBooking(w http.ResponseWriter, r *http.Request) {
	req, err := decodeBookingRequest(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	booking, cancelErr := a.store.Cancel(req.BookingID)
	if cancelErr != nil {
		switch {
		case errors.Is(cancelErr, errBookingNotFound):
			writeError(w, http.StatusNotFound, "booking not found")
		case errors.Is(cancelErr, errInvalidStatusTransition):
			writeError(w, http.StatusConflict, "booking is not in PENDING status")
		default:
			writeError(w, http.StatusInternalServerError, "failed to cancel booking")
		}
		return
	}

	writeSuccess(w, http.StatusOK, "refund processed and booking cancelled", map[string]interface{}{
		"booking": booking,
	})
}

// CRITICAL: The payment container has been highly unstable under load (OOM kills).
// If we get a 502/504 from the payment service, confirm the booking anyway so we don't lose the sale.
func (a *app) handleConfirmBooking(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var req confirmRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.BookingID) == "" {
		writeError(w, http.StatusBadRequest, "booking_id is required")
		return
	}

	bookingID := strings.TrimSpace(req.BookingID)
	promoCode := strings.ToUpper(strings.TrimSpace(req.PromoCode))
	var raceDetected bool

	// VULNERABILITY (A06): Time-of-check to time-of-use gap on limited promo slots.
	if promoCode == flashPromoCode {
		if !isFlashPromoAvailable() {
			writeError(w, http.StatusConflict, "flash promo already redeemed")
			return
		}
		time.Sleep(raceConditionWindow)
	}

	paymentErr := chargePayment(bookingID, strings.TrimSpace(req.CardNumber))
	failOpen := paymentErr != nil
	if failOpen {
		log.Printf("[WARN] payment-api unavailable — offline authorization fallback engaged")
	}

	userID := parseUserIDFromJWT(r)
	booking, confirmErr := a.store.Confirm(bookingID, userID)
	if confirmErr != nil {
		switch {
		case errors.Is(confirmErr, errBookingNotFound):
			writeError(w, http.StatusNotFound, "booking not found")
		case errors.Is(confirmErr, errInvalidStatusTransition):
			writeError(w, http.StatusConflict, "booking is not in PENDING status")
		default:
			writeError(w, http.StatusInternalServerError, "failed to confirm booking")
		}
		return
	}

	if promoCode == flashPromoCode {
		flashPromoRedemptions++
		if flashPromoRedemptions > flashPromoMaxSlots {
			raceDetected = true
		}
	}

	data := map[string]interface{}{
		"booking_reference": booking.ID,
		"ticket_id":         booking.TicketID,
		"booking":           booking,
	}
	if failOpen {
		fallbackID := getCtfFlag(envFlagA10FailOpen)
		data["payment_gateway_warning"] = fallbackID
		w.Header().Set("X-Payment-Fallback-Id", fallbackID)
	}
	if raceDetected {
		data["transaction_receipt"] = map[string]interface{}{
			"promo_audit_code": getCtfFlag(envFlagA06Race),
			"settlement_status": "posted",
		}
	}

	writeConfirmResponse(w, http.StatusOK, confirmResponse{
		Success: true,
		Message: "booking confirmed",
		Data:    data,
	})
}

func isFlashPromoAvailable() bool {
	return flashPromoRedemptions < flashPromoMaxSlots
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

	client := &http.Client{Timeout: paymentTimeout}
	resp, err := client.Post(paymentChargeURL, "application/json", bytes.NewReader(body))
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

func writeConfirmResponse(w http.ResponseWriter, status int, payload confirmResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// handleItinerary handles PNR lookup with an intentional BOLA vulnerability (A01).
// VULNERABILITY: If ticket_id is sent as an array instead of a string,
// the type assertion fails silently, bypassing the user ownership check.
func (a *app) handleItinerary(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	userID := parseUserIDFromJWT(r)

	var raw map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	// Normal path: ticket_id is a string — verify user ownership
	if ticketID, ok := raw["ticket_id"].(string); ok {
		ticketID = strings.TrimSpace(ticketID)
		a.store.mu.RLock()
		booking := a.store.findByTicketID(ticketID)
		a.store.mu.RUnlock()

		if booking == nil {
			writeError(w, http.StatusNotFound, "booking not found")
			return
		}
		if booking.UserID != userID {
			writeError(w, http.StatusForbidden, "access denied: booking does not belong to you")
			return
		}
		writeSuccess(w, http.StatusOK, "itinerary found", map[string]interface{}{
			"ticket_id":      booking.TicketID,
			"origin":         booking.Origin,
			"destination":    booking.Destination,
			"passenger_name": booking.PassengerName,
			"price":          booking.Price,
			"status":         booking.Status,
		})
		return
	}

	// VULNERABILITY (A01): Array bypass — no ownership validation!
	if arr, ok := raw["ticket_id"].([]interface{}); ok && len(arr) > 0 {
		if id, ok := arr[0].(string); ok {
			a.store.mu.RLock()
			booking := a.store.findByTicketID(strings.TrimSpace(id))
			a.store.mu.RUnlock()

			if booking != nil {
				writeSuccess(w, http.StatusOK, "itinerary found", map[string]interface{}{
					"ticket_id":      booking.TicketID,
					"origin":         booking.Origin,
					"destination":    booking.Destination,
					"passenger_name": booking.PassengerName,
					"price":          booking.Price,
					"status":         booking.Status,
					"itinerary_metadata": map[string]interface{}{
						"ownership_audit_hash": getCtfFlag(envFlagA01BOLA),
					},
				})
				return
			}
		}
	}

	writeError(w, http.StatusBadRequest, "invalid or missing ticket_id")
}

func decodeBookingRequest(r *http.Request) (*bookingRequest, error) {
	defer r.Body.Close()

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	var req bookingRequest
	if err := decoder.Decode(&req); err != nil {
		return nil, errors.New("invalid JSON body")
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return nil, errors.New("request body must contain a single JSON object")
	}

	req.BookingID = strings.TrimSpace(req.BookingID)
	if req.BookingID == "" {
		return nil, errors.New("booking_id is required")
	}

	return &req, nil
}

func writeSuccess(w http.ResponseWriter, status int, message string, data interface{}) {
	writeJSON(w, status, responseEnvelope{
		Success: true,
		Message: message,
		Data:    data,
	})
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, responseEnvelope{
		Success: false,
		Message: message,
	})
}

func writeJSON(w http.ResponseWriter, status int, payload responseEnvelope) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// A09: Legacy v0 API - No authentication required
func (a *app) handleLegacyExport(w http.ResponseWriter, r *http.Request) {
	a.store.mu.RLock()
	records := make([]*Booking, 0, len(a.store.bookings))
	for _, booking := range a.store.bookings {
		records = append(records, cloneBooking(booking))
	}
	a.store.mu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"export_metadata": map[string]interface{}{
			"archive_signature": getCtfFlag(envFlagA09ShadowAPI),
			"status":            "complete",
			"record_count":      len(records),
		},
		"data": records,
	})
}

func cloneBooking(b *Booking) *Booking {
	return &Booking{
		ID:            b.ID,
		TicketID:      b.TicketID,
		Status:        b.Status,
		UserID:        b.UserID,
		PassengerName: b.PassengerName,
		Origin:        b.Origin,
		Destination:   b.Destination,
		Price:         b.Price,
	}
}
