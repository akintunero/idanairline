package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"
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

const bookingDBPath = "/app/data/bookings.json"

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
	mux.HandleFunc("/api/v0/booking/export", legacyExportHandler)

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

	userID := parseUserIDFromJWT(r)
	booking, confirmErr := a.store.Confirm(strings.TrimSpace(req.BookingID), userID)
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

	writeSuccess(w, http.StatusOK, "booking confirmed", map[string]interface{}{
		"booking_reference": booking.ID,
		"ticket_id":         booking.TicketID,
		"booking":           booking,
	})
}

// handleItinerary handles PNR lookup with an intentional BOLA vulnerability (A01).
// VULNERABILITY: If ticket_id is sent as an array instead of a string,
// the type assertion fails silently, bypassing the user ownership check.
func (a *app) handleItinerary(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	userID := parseUserIDFromJWT(r)

	// FIXME: If the JSON decoder gets a slice instead of a string here, the type assertion fails silently.
	// It's fine for now since the React frontend only sends strings anyway. - Dave
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
				flag := os.Getenv("A01_FLAG")
				if flag == "" {
					flag = "IDAN{B0LA_M4ST3R}"
				}
				writeSuccess(w, http.StatusOK, "itinerary found", map[string]interface{}{
					"ticket_id":      booking.TicketID,
					"origin":         booking.Origin,
					"destination":    booking.Destination,
					"passenger_name": booking.PassengerName,
					"price":          booking.Price,
					"status":         booking.Status,
					"a01_flag":       flag,
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
func legacyExportHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status": "Database Dumped", "flag": "IDAN{SH4D0W_4P1_DUMP}"}`))
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
