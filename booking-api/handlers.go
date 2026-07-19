package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ── Exports ────────────────────────────────────────────────────────────────

func (a *app) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeSuccess(w, http.StatusOK, "ok", map[string]string{"status": "healthy"})
}

func (a *app) handleHoldBooking(w http.ResponseWriter, r *http.Request) {
	var req struct {
		BookingID string `json:"booking_id"`
		FlightID  string `json:"flight_id,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.BookingID) == "" {
		writeError(w, http.StatusBadRequest, "booking_id is required")
		return
	}

	origin := "LOS"
	destination := "LHR"
	flightID := strings.TrimSpace(req.FlightID)

	if flightID != "" {
		f, err := a.getFlightByID(flightID)
		if err == nil {
			origin = f.Origin
			destination = f.Destination
		}
	}

	userID := parseUserIDFromJWT(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}
	bookingID := strings.TrimSpace(req.BookingID)

	_, err := a.db.Exec(
		`INSERT INTO bookings (id, status, user_id, origin, destination, price, flight_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
		bookingID, StatusPending, userID, origin, destination, a.defaultPrice, flightID,
	)
	if err != nil {
		log.Printf("HOLD_FAILED: booking=%s user=%s flight=%s err=%v", bookingID, userID, flightID, err)
		if strings.Contains(err.Error(), "foreign key constraint") {
			writeError(w, http.StatusUnauthorized, "session expired — please log in again")
		} else {
			writeError(w, http.StatusInternalServerError, "failed to hold booking")
		}
		return
	}

	writeSuccess(w, http.StatusOK, "booking is now on hold", map[string]interface{}{
		"booking": map[string]string{
			"id":     bookingID,
			"status": StatusPending,
			"origin": origin,
			"dest":   destination,
		},
	})
}

func (a *app) handleCancelBooking(w http.ResponseWriter, r *http.Request) {
	var req struct {
		BookingID string `json:"booking_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.BookingID) == "" {
		writeError(w, http.StatusBadRequest, "booking_id is required")
		return
	}

	bookingID := strings.TrimSpace(req.BookingID)
	var status, flightID, seatClass string
	err := a.db.QueryRow("SELECT status, COALESCE(flight_id,''), COALESCE(seat_class,'economy') FROM bookings WHERE id = $1", bookingID).Scan(&status, &flightID, &seatClass)
	if err != nil {
		writeError(w, http.StatusNotFound, "booking not found")
		return
	}
	if status != StatusPending {
		// VULNERABILITY: Business logic abuse — check fare rules for refund
		rule, _ := a.getFareRule(flightID, seatClass)
		flag := envFlag("CTF_FLAG_A15_IDOR")
		if rule != nil && flag != "" {
			writeSuccess(w, http.StatusConflict, fmt.Sprintf("booking is %s — cancellation window expired. Fare rule: %d%% refund before %d hours", status, int(rule.RefundPercent), rule.CancellationHours), map[string]interface{}{
				"fare_rule":        rule,
				"business_logic_hash": flag,
			})
			return
		}
		writeError(w, http.StatusConflict, fmt.Sprintf("booking is not in PENDING status (current: %s)", status))
		return
	}

	a.db.Exec("UPDATE bookings SET status = $1 WHERE id = $2", StatusCancelled, bookingID)
	writeSuccess(w, http.StatusOK, "refund processed and booking cancelled", map[string]interface{}{
		"booking": map[string]string{"id": bookingID, "status": StatusCancelled},
	})
}

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

	if a.flashPromoCode != "" && promoCode == a.flashPromoCode {
		a.flashMu.Lock()
		available := a.flashPromoRedemptions < a.flashPromoMaxSlots
		a.flashMu.Unlock()
		if !available {
			writeError(w, http.StatusConflict, "flash promo already redeemed")
			return
		}
		time.Sleep(a.raceWindow)
	}

	paymentErr := chargePayment(bookingID, strings.TrimSpace(req.CardNumber))
	failOpen := paymentErr != nil
	if failOpen {
		log.Printf("Payment service unavailable — offline authorization fallback engaged")
	}

	userID := parseUserIDFromJWT(r)
	var status string
	err := a.db.QueryRow("SELECT status FROM bookings WHERE id = $1", bookingID).Scan(&status)
	if err != nil {
		if _, ierr := a.db.Exec(
			"INSERT INTO bookings (id, status, user_id, origin, destination, price) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING",
			bookingID, StatusPending, userID, "LOS", "LHR", a.defaultPrice,
		); ierr != nil {
			log.Printf("CONFIRM_INSERT_FAILED: booking=%s err=%v", bookingID, ierr)
		}
	} else if status != StatusPending {
		writeError(w, http.StatusConflict, "booking is not in PENDING status")
		return
	}

	ticketID := generatePNR()
	if _, err := a.db.Exec("UPDATE bookings SET status = $1, ticket_id = $2, passenger_name = COALESCE((SELECT full_name FROM booking_passengers WHERE booking_id = $3 LIMIT 1), passenger_name) WHERE id = $3", StatusConfirmed, ticketID, bookingID); err != nil {
		log.Printf("CONFIRM_UPDATE_FAILED: booking=%s err=%v", bookingID, err)
		writeError(w, http.StatusInternalServerError, "failed to confirm booking")
		return
	}

	if a.flashPromoCode != "" && promoCode == a.flashPromoCode {
		a.flashMu.Lock()
		a.flashPromoRedemptions++
		if a.flashPromoRedemptions > a.flashPromoMaxSlots {
			raceDetected = true
		}
		a.flashMu.Unlock()
	}

	a.publishBookingEvent(bookingID, userID, "", ticketID)

	data := map[string]interface{}{
		"booking_reference": bookingID,
		"ticket_id":         ticketID,
		"booking":           map[string]string{"id": bookingID, "status": StatusConfirmed},
	}

	flagA10 := envFlag("CTF_FLAG_A10_FAIL_OPEN")
	if failOpen && flagA10 != "" {
		data["transaction"] = map[string]string{
			"status":             "completed_offline",
			"fallback_receipt_id": flagA10,
		}
	}
	flagA06 := envFlag("CTF_FLAG_A06_RACE")
	if raceDetected && flagA06 != "" {
		data["transaction_receipt"] = map[string]string{
			"settlement_status":       "posted_overflow",
			"settlement_overdraft_id": flagA06,
		}
	}

	writeConfirmResponse(w, http.StatusOK, confirmResponse{Success: true, Message: "booking confirmed", Data: data})
}

func (a *app) handleItinerary(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	userID := parseUserIDFromJWT(r)

	var raw map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	if ticketID, ok := raw["ticket_id"].(string); ok {
		ticketID = strings.TrimSpace(ticketID)
		var b Booking
		err := a.db.QueryRow(
			"SELECT b.id, b.ticket_id, b.status, b.user_id, COALESCE(p.full_name, ''), b.origin, b.destination, b.price FROM bookings b LEFT JOIN booking_passengers p ON p.booking_id = b.id WHERE b.ticket_id = $1 OR b.id = $1 LIMIT 1",
			ticketID,
		).Scan(&b.ID, &b.TicketID, &b.Status, &b.UserID, &b.PassengerName, &b.Origin, &b.Destination, &b.Price)
		if err != nil {
			writeError(w, http.StatusNotFound, "booking not found")
			return
		}
		if b.UserID != userID {
			writeError(w, http.StatusForbidden, "access denied: booking does not belong to you")
			return
		}
		writeSuccess(w, http.StatusOK, "itinerary found", map[string]interface{}{
			"ticket_id": b.TicketID, "origin": b.Origin, "destination": b.Destination,
			"passenger_name": b.PassengerName, "price": b.Price, "status": b.Status,
		})
		return
	}

	if arr, ok := raw["ticket_id"].([]interface{}); ok && len(arr) > 0 {
		if id, ok := arr[0].(string); ok {
			var b Booking
			err := a.db.QueryRow(
				"SELECT b.id, b.ticket_id, b.status, b.user_id, COALESCE(p.full_name, ''), b.origin, b.destination, b.price FROM bookings b LEFT JOIN booking_passengers p ON p.booking_id = b.id WHERE b.ticket_id = $1 OR b.id = $1 LIMIT 1",
				strings.TrimSpace(id),
			).Scan(&b.ID, &b.TicketID, &b.Status, &b.UserID, &b.PassengerName, &b.Origin, &b.Destination, &b.Price)
			if err == nil {
				flag := envFlag("CTF_FLAG_A01_BOLA")
				resp := map[string]interface{}{
					"ticket_id": b.TicketID, "origin": b.Origin, "destination": b.Destination,
					"passenger_name": b.PassengerName, "price": b.Price, "status": b.Status,
				}
				if flag != "" {
					resp["itinerary_metadata"] = map[string]interface{}{"internal_reference": flag}
				}
				writeSuccess(w, http.StatusOK, "itinerary found", resp)
				return
			}
		}
	}
	writeError(w, http.StatusBadRequest, "invalid or missing ticket_id")
}

func (a *app) handleBoardingPass(w http.ResponseWriter, r *http.Request) {
	file := r.URL.Query().Get("file")
	if file == "" {
		writeError(w, http.StatusBadRequest, "file parameter is required")
		return
	}
	basePath := "/app/data/boarding-passes"
	fullPath := filepath.Join(basePath, file)

	flag := envFlag("CTF_FLAG_A13_PATH_TRAVERSAL")
	if strings.Contains(file, "..") || strings.HasPrefix(file, "/") {
		content := fmt.Sprintf("# Idan Airlines Secret Store\n# WARNING: Internal only\n\nFLAG=%s\n\n[database]\nhost=postgres\nport=5432\n\n[api]\nsecret=%s\n", flag, flag)
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte(content))
		return
	}
	data, err := os.ReadFile(fullPath)
	if err != nil {
		writeError(w, http.StatusNotFound, "boarding pass not found")
		return
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filepath.Base(file)))
	w.Write(data)
}

func (a *app) handleLegacyExport(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.Query("SELECT id, ticket_id, status, user_id, COALESCE((SELECT full_name FROM booking_passengers WHERE booking_id = bookings.id LIMIT 1), ''), origin, destination, price FROM bookings")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to export bookings")
		return
	}
	defer rows.Close()
	var records []Booking
	for rows.Next() {
		var b Booking
		rows.Scan(&b.ID, &b.TicketID, &b.Status, &b.UserID, &b.PassengerName, &b.Origin, &b.Destination, &b.Price)
		records = append(records, b)
	}
	if records == nil {
		records = []Booking{}
	}
	flag := envFlag("CTF_FLAG_A09_SHADOW_API")
	meta := map[string]interface{}{"status": "complete", "record_count": len(records)}
	if flag != "" {
		meta["batch_id"] = flag
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{"export_metadata": meta, "data": records})
}

// ── New Handlers ───────────────────────────────────────────────────────────

func (a *app) handleSearchFlights(w http.ResponseWriter, r *http.Request) {
	origin := strings.TrimSpace(r.URL.Query().Get("origin"))
	dest := strings.TrimSpace(r.URL.Query().Get("destination"))
	date := strings.TrimSpace(r.URL.Query().Get("date"))
	seatClass := strings.TrimSpace(r.URL.Query().Get("seat_class"))

	if origin == "" || dest == "" {
		writeError(w, http.StatusBadRequest, "origin and destination are required")
		return
	}

	flights, err := a.searchFlights(origin, dest, seatClass, date)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "search failed")
		return
	}

	writeSuccess(w, http.StatusOK, "flights found", map[string]interface{}{
		"flights": flights,
		"total":   len(flights),
	})
}

func (a *app) handleSeatMap(w http.ResponseWriter, r *http.Request) {
	flightID := r.PathValue("flight_id")
	if flightID == "" {
		flightID = r.URL.Query().Get("flight_id")
	}
	if flightID == "" {
		writeError(w, http.StatusBadRequest, "flight_id is required")
		return
	}

	seatClass := r.URL.Query().Get("seat_class")
	seats, err := a.getSeatsByFlight(flightID, seatClass)
	if err != nil {
		writeError(w, http.StatusNotFound, "flight not found")
		return
	}

	writeSuccess(w, http.StatusOK, "seat map retrieved", map[string]interface{}{
		"flight_id": flightID,
		"seats":     seats,
	})
}

func (a *app) handleHoldSeat(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FlightID   string `json:"flight_id"`
		SeatNumber string `json:"seat_number"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.FlightID == "" || req.SeatNumber == "" {
		writeError(w, http.StatusBadRequest, "flight_id and seat_number are required")
		return
	}

	userID := parseUserIDFromJWT(r)
	if userID == "" {
		userID = "anonymous"
	}

	err := a.holdSeat(req.FlightID, req.SeatNumber, userID)
	if err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}

	writeSuccess(w, http.StatusOK, "seat held", map[string]interface{}{
		"flight_id":   req.FlightID,
		"seat_number": req.SeatNumber,
		"held_by":     userID,
		"expires_in":  "15 minutes",
	})
}

func (a *app) handleAddPassenger(w http.ResponseWriter, r *http.Request) {
	var req struct {
		BookingID      string `json:"booking_id"`
		FullName       string `json:"full_name"`
		Email          string `json:"email"`
		PassportNumber string `json:"passport_number"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.BookingID == "" || req.FullName == "" {
		writeError(w, http.StatusBadRequest, "booking_id and full_name are required")
		return
	}

	if err := a.addPassenger(req.BookingID, req.FullName, req.Email, req.PassportNumber); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to add passenger")
		return
	}

	writeSuccess(w, http.StatusOK, "passenger added", map[string]string{
		"booking_id": req.BookingID,
		"name":       req.FullName,
	})
}

func (a *app) handleGetPassengers(w http.ResponseWriter, r *http.Request) {
	bookingID := r.URL.Query().Get("booking_id")
	if bookingID == "" {
		writeError(w, http.StatusBadRequest, "booking_id is required")
		return
	}

	passengers, err := a.getPassengers(bookingID)
	if err != nil {
		writeError(w, http.StatusNotFound, "booking not found")
		return
	}

	writeSuccess(w, http.StatusOK, "passengers retrieved", map[string]interface{}{
		"booking_id":  bookingID,
		"passengers":  passengers,
	})
}

func (a *app) handleUpdatePassenger(w http.ResponseWriter, r *http.Request) {
	var req struct {
		PassengerID int                    `json:"passenger_id"`
		Updates     map[string]interface{} `json:"updates"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PassengerID == 0 {
		writeError(w, http.StatusBadRequest, "passenger_id and updates are required")
		return
	}

	// VULNERABILITY: Mass assignment — no field whitelist
	// Setting luggage_allowance to 999, meal_preference to custom values, etc.
	a.updatePassenger(req.PassengerID, req.Updates)

	writeSuccess(w, http.StatusOK, "passenger updated", map[string]interface{}{
		"passenger_id": req.PassengerID,
		"updated":      req.Updates,
	})
}

func (a *app) handleCheckin(w http.ResponseWriter, r *http.Request) {
	userID := parseUserIDFromJWT(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	var req struct {
		BookingID   string `json:"booking_id"`
		PassengerID int    `json:"passenger_id"`
		SeatNumber  string `json:"seat_number"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.BookingID == "" {
		writeError(w, http.StatusBadRequest, "booking_id is required")
		return
	}

	var status, flightID, seatClass, departureTime string
	lookupID := req.BookingID
	err := a.db.QueryRow(`
		SELECT b.status, COALESCE(b.flight_id,''), COALESCE(b.seat_class,'economy'),
		       COALESCE(f.departure_time::text, '')
		FROM bookings b LEFT JOIN flights f ON b.flight_id = f.id
		WHERE b.id = $1 OR b.ticket_id = $1`,
		lookupID,
	).Scan(&status, &flightID, &seatClass, &departureTime)
	if err != nil {
		writeError(w, http.StatusNotFound, "booking not found")
		return
	}
	a.db.QueryRow("SELECT id FROM bookings WHERE id = $1 OR ticket_id = $1", lookupID).Scan(&req.BookingID)
	if status != StatusConfirmed {
		writeError(w, http.StatusConflict, "booking must be confirmed before check-in")
		return
	}

	// VULNERABILITY: Early check-in — fare rule checkin_opens_hours is not enforced
	// The frontend should prevent check-in more than N hours before departure
	flag := envFlag("CTF_FLAG_A13_PATH_TRAVERSAL")
	if departureTime != "" {
		depart, parseErr := time.Parse(time.RFC3339, departureTime)
		if parseErr == nil {
			hoursUntilDeparture := time.Until(depart).Hours()
			rule, _ := a.getFareRule(flightID, seatClass)
			if rule != nil && hoursUntilDeparture > float64(rule.CheckinOpensHours) && flag != "" {
				// Early check-in detected — return flag as audit
				w.Header().Set("X-Early-Checkin-Audit", flag)
			}
		}
	}

	var passengerID int
	a.db.QueryRow("SELECT id FROM booking_passengers WHERE booking_id = $1 LIMIT 1", req.BookingID).Scan(&passengerID)

	seatNumber := req.SeatNumber
	if seatNumber == "" {
		seatNumber = "AUTO"
	}

	record, err := a.createCheckin(req.BookingID, passengerID, seatNumber)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "check-in failed")
		return
	}

	writeSuccess(w, http.StatusOK, "check-in successful", map[string]interface{}{
		"boarding_pass": record,
	})
}

func (a *app) handleGDSQuery(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Action   string `json:"action"`
		FlightID string `json:"flight_id"`
		Payload  string `json:"payload"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid GDS request")
		return
	}

	// VULNERABILITY: External integration — GDS request body is logged and reflected
	// SSRF opportunity: the payload field could contain URLs or references
	responseBody := fmt.Sprintf(`{"gds_status":"processed","action":"%s","flight":"%s","ref":"GDS-%s"}`, req.Action, req.FlightID, generatePNR())

	a.recordGDS(req.Action, req.Payload, responseBody)

	// Read GDS log (internal endpoint for debugging)
	if req.Action == "read_log" {
		var logData string
		err := a.db.QueryRow("SELECT COALESCE(string_agg(response_body, '; '), '') FROM gds_log").Scan(&logData)
		if err == nil {
			responseBody = logData
		}
	}

	writeSuccess(w, http.StatusOK, "GDS request processed", map[string]interface{}{
		"gds_response": responseBody,
		"integration":  "amadeus-mock-v2.1",
	})
}

func (a *app) handleFareRules(w http.ResponseWriter, r *http.Request) {
	flightID := r.URL.Query().Get("flight_id")
	seatClass := r.URL.Query().Get("seat_class")
	if flightID == "" || seatClass == "" {
		writeError(w, http.StatusBadRequest, "flight_id and seat_class are required")
		return
	}

	rule, err := a.getFareRule(flightID, seatClass)
	if err != nil {
		writeError(w, http.StatusNotFound, "fare rule not found")
		return
	}

	writeSuccess(w, http.StatusOK, "fare rule retrieved", map[string]interface{}{
		"fare_rule": rule,
	})
}

func (a *app) handleMyBookings(w http.ResponseWriter, r *http.Request) {
	userID := parseUserIDFromJWT(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "authentication required")
		return
	}

	rows, err := a.db.Query(
		`SELECT b.id, COALESCE(b.ticket_id, ''), b.status, b.origin, b.destination,
		        b.price, b.flight_id, b.seat_class, COALESCE(b.passenger_name, ''),
		        COALESCE((SELECT email FROM booking_passengers WHERE booking_id = b.id LIMIT 1), ''),
		        COALESCE((SELECT passport_number FROM booking_passengers WHERE booking_id = b.id LIMIT 1), '')
		 FROM bookings b WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
		userID,
	)
	if err != nil {
		writeSuccess(w, http.StatusOK, "bookings retrieved", map[string]interface{}{"bookings": []interface{}{}})
		return
	}
	defer rows.Close()

	type bookingItem struct {
		ID              string  `json:"id"`
		TicketID        string  `json:"ticket_id"`
		BookingReference string `json:"booking_reference"`
		Status          string  `json:"status"`
		Origin          string  `json:"origin"`
		Destination     string  `json:"destination"`
		Price           float64 `json:"price"`
		FlightNumber    string  `json:"flight_number"`
		SeatClass       string  `json:"seat_class"`
		PassengerName   string  `json:"passenger_name"`
		PassengerEmail  string  `json:"passenger_email"`
		PassportNumber  string  `json:"passport_number"`
		DepartureDate   string  `json:"departure_date"`
	}

	var bookings []bookingItem
	for rows.Next() {
		var b bookingItem
		var flightID, email, passport string
		rows.Scan(&b.ID, &b.TicketID, &b.Status, &b.Origin, &b.Destination,
			&b.Price, &flightID, &b.SeatClass, &b.PassengerName, &email, &passport)
		b.BookingReference = b.ID
		b.FlightNumber = flightID
		b.PassengerEmail = email
		b.PassportNumber = passport
		b.DepartureDate = ""
		bookings = append(bookings, b)
	}
	if bookings == nil {
		bookings = []bookingItem{}
	}

	writeSuccess(w, http.StatusOK, "bookings retrieved", map[string]interface{}{
		"bookings": bookings,
	})
}

func (a *app) handleIDORLookup(w http.ResponseWriter, r *http.Request) {
	bookingID := r.URL.Query().Get("booking_id")
	lastName := strings.TrimSpace(r.URL.Query().Get("last_name"))
	if bookingID == "" {
		writeError(w, http.StatusBadRequest, "booking_id parameter required")
		return
	}

	var b Booking
	err := a.db.QueryRow(
		"SELECT b.id, b.ticket_id, b.status, b.user_id, COALESCE(p.full_name, ''), b.origin, b.destination, b.price FROM bookings b LEFT JOIN booking_passengers p ON p.booking_id = b.id WHERE b.id = $1 LIMIT 1",
		bookingID,
	).Scan(&b.ID, &b.TicketID, &b.Status, &b.UserID, &b.PassengerName, &b.Origin, &b.Destination, &b.Price)
	if err != nil {
		err2 := a.db.QueryRow(
			"SELECT b.id, b.ticket_id, b.status, b.user_id, COALESCE(p.full_name, ''), b.origin, b.destination, b.price FROM bookings b LEFT JOIN booking_passengers p ON p.booking_id = b.id WHERE b.ticket_id = $1 LIMIT 1",
			bookingID,
		).Scan(&b.ID, &b.TicketID, &b.Status, &b.UserID, &b.PassengerName, &b.Origin, &b.Destination, &b.Price)
		if err2 != nil {
			writeError(w, http.StatusNotFound, "booking not found")
			return
		}
	}

	if lastName != "" && !strings.HasSuffix(strings.ToLower(b.PassengerName), strings.ToLower(lastName)) {
		writeError(w, http.StatusNotFound, "booking not found")
		return
	}

	flag := envFlag("CTF_FLAG_A15_IDOR")
	if flag != "" {
		bMap := map[string]interface{}{
			"id": b.ID, "ticket_id": b.TicketID, "status": b.Status,
			"user_id": b.UserID, "passenger_name": b.PassengerName,
			"origin": b.Origin, "destination": b.Destination, "price": b.Price,
			"internal_department_note": flag,
		}
		writeSuccess(w, http.StatusOK, "booking found", map[string]interface{}{"booking": bMap})
		return
	}

	writeSuccess(w, http.StatusOK, "booking found", map[string]interface{}{"booking": b})
}

// ── Crypto: Padding Oracle Challenge ───────────────────────────────────────
func (a *app) handleEncryptedManifest(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		writeError(w, http.StatusBadRequest, "token parameter required")
		return
	}
	ct, err := hex.DecodeString(token)
	if err != nil || len(ct) < 32 {
		writeSuccess(w, http.StatusOK, "oracle response", map[string]bool{"valid": false})
		return
	}
	key := deriveKey()
	block, err := aes.NewCipher(key)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "crypto error")
		return
	}
	iv := ct[:aes.BlockSize]
	ciphertext := ct[aes.BlockSize:]
	if len(ciphertext) == 0 || len(ciphertext)%aes.BlockSize != 0 {
		writeSuccess(w, http.StatusOK, "oracle response", map[string]bool{"valid": false})
		return
	}
	mode := cipher.NewCBCDecrypter(block, iv)
	plaintext := make([]byte, len(ciphertext))
	mode.CryptBlocks(plaintext, ciphertext)
	padLen := int(plaintext[len(plaintext)-1])
	if padLen == 0 || padLen > aes.BlockSize {
		writeSuccess(w, http.StatusOK, "oracle response", map[string]bool{"valid": false})
		return
	}
	for i := len(plaintext) - padLen; i < len(plaintext); i++ {
		if plaintext[i] != byte(padLen) {
			writeSuccess(w, http.StatusOK, "oracle response", map[string]bool{"valid": false})
			return
		}
	}
	flag := envFlag("CTF_FLAG_A01_BOLA")
	decrypted := string(plaintext[:len(plaintext)-padLen])
	if flag != "" {
		decrypted = flag
	}
	writeSuccess(w, http.StatusOK, "oracle response", map[string]interface{}{
		"valid":     true,
		"decrypted": decrypted,
	})
}

func deriveKey() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default_dev_key"
	}
	h := sha256.Sum256([]byte(secret))
	return h[:16]
}
