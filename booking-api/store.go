package main

import (
	"database/sql"
	"fmt"
	"time"
)

func (a *app) searchFlights(origin, destination, seatClass string, date string) ([]Flight, error) {
	query := `
		SELECT id, flight_number, origin, destination,
		       departure_time, arrival_time, aircraft, base_price, status
		FROM flights
		WHERE origin ILIKE '%' || $1 || '%'
		  AND destination ILIKE '%' || $2 || '%'
		  AND ($3 = '' OR departure_time::date = $3::date)
		ORDER BY departure_time
	`
	rows, err := a.db.Query(query, origin, destination, date)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flights []Flight
	for rows.Next() {
		var f Flight
		var depTime, arrTime time.Time
		if err := rows.Scan(&f.ID, &f.FlightNumber, &f.Origin, &f.Destination,
			&depTime, &arrTime, &f.Aircraft, &f.BasePrice, &f.Status); err != nil {
			return nil, err
		}
		f.DepartureTime = depTime.Format(time.RFC3339)
		f.ArrivalTime = arrTime.Format(time.RFC3339)
		flights = append(flights, f)
	}
	if flights == nil {
		flights = []Flight{}
	}
	return flights, nil
}

func (a *app) getFlightByID(id string) (*Flight, error) {
	var f Flight
	var depTime, arrTime time.Time
	err := a.db.QueryRow(
		"SELECT id, flight_number, origin, destination, departure_time, arrival_time, aircraft, base_price, status FROM flights WHERE id = $1",
		id,
	).Scan(&f.ID, &f.FlightNumber, &f.Origin, &f.Destination, &depTime, &arrTime, &f.Aircraft, &f.BasePrice, &f.Status)
	if err != nil {
		return nil, err
	}
	f.DepartureTime = depTime.Format(time.RFC3339)
	f.ArrivalTime = arrTime.Format(time.RFC3339)
	return &f, nil
}

func (a *app) getSeatsByFlight(flightID, seatClass string) ([]Seat, error) {
	var rows *sql.Rows
	var err error
	if seatClass != "" {
		rows, err = a.db.Query(
			"SELECT id, flight_id, seat_number, seat_class, is_available FROM seats WHERE flight_id = $1 AND seat_class = $2 ORDER BY seat_number",
			flightID, seatClass,
		)
	} else {
		rows, err = a.db.Query(
			"SELECT id, flight_id, seat_number, seat_class, is_available FROM seats WHERE flight_id = $1 ORDER BY seat_number",
			flightID,
		)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var seats []Seat
	for rows.Next() {
		var s Seat
		if err := rows.Scan(&s.ID, &s.FlightID, &s.SeatNumber, &s.SeatClass, &s.IsAvailable); err != nil {
			return nil, err
		}
		seats = append(seats, s)
	}
	if seats == nil {
		seats = []Seat{}
	}
	return seats, nil
}

func (a *app) holdSeat(flightID, seatNumber, userID string) error {
	// VULNERABILITY: TOCTOU race condition on last seat
	tx, err := a.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var isAvail bool
	err = tx.QueryRow(
		"SELECT is_available FROM seats WHERE flight_id = $1 AND seat_number = $2 FOR UPDATE",
		flightID, seatNumber,
	).Scan(&isAvail)
	if err != nil {
		return fmt.Errorf("seat not found")
	}
	if !isAvail {
		return fmt.Errorf("seat already taken")
	}

	_, err = tx.Exec(
		"UPDATE seats SET is_available = FALSE, held_until = NOW() + INTERVAL '15 minutes', held_by = $1 WHERE flight_id = $2 AND seat_number = $3",
		userID, flightID, seatNumber,
	)
	if err != nil {
		return err
	}

	_, err = tx.Exec(
		"INSERT INTO seat_holds (flight_id, seat_number, user_id, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes')",
		flightID, seatNumber, userID,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (a *app) releaseSeatHold(flightID, seatNumber string) {
	a.db.Exec(
		"UPDATE seats SET is_available = TRUE, held_until = NULL, held_by = NULL WHERE flight_id = $1 AND seat_number = $2",
		flightID, seatNumber,
	)
}

func (a *app) assignSeat(bookingID, seatNumber string) error {
	_, err := a.db.Exec(
		"UPDATE booking_passengers SET seat_number = $1 WHERE booking_id = $2",
		seatNumber, bookingID,
	)
	return err
}

func (a *app) getFareRule(flightID, seatClass string) (*FareRule, error) {
	var rule FareRule
	err := a.db.QueryRow(
		"SELECT id, flight_id, seat_class, cancellation_hours, refund_percent, change_fee, checkin_opens_hours FROM fare_rules WHERE flight_id = $1 AND seat_class = $2",
		flightID, seatClass,
	).Scan(&rule.ID, &rule.FlightID, &rule.SeatClass, &rule.CancellationHours, &rule.RefundPercent, &rule.ChangeFee, &rule.CheckinOpensHours)
	if err != nil {
		return nil, err
	}
	return &rule, nil
}

func (a *app) getPassengers(bookingID string) ([]Passenger, error) {
	rows, err := a.db.Query(
		"SELECT id, booking_id, full_name, email, passport_number, seat_number, luggage_allowance, meal_preference FROM booking_passengers WHERE booking_id = $1",
		bookingID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var passengers []Passenger
	for rows.Next() {
		var p Passenger
		if err := rows.Scan(&p.ID, &p.BookingID, &p.FullName, &p.Email, &p.PassportNumber, &p.SeatNumber, &p.LuggageAllowance, &p.MealPreference); err != nil {
			return nil, err
		}
		passengers = append(passengers, p)
	}
	if passengers == nil {
		passengers = []Passenger{}
	}
	return passengers, nil
}

func (a *app) addPassenger(bookingID, fullName, email, passportNumber string) error {
	_, err := a.db.Exec(
		"INSERT INTO booking_passengers (booking_id, full_name, email, passport_number) VALUES ($1, $2, $3, $4)",
		bookingID, fullName, email, passportNumber,
	)
	return err
}

func (a *app) updatePassenger(passengerID int, updates map[string]interface{}) error {
	// VULNERABILITY (mass assignment): no whitelist of allowed fields
	// This allows setting luggage_allowance to arbitrary values
	for key, val := range updates {
		q := fmt.Sprintf("UPDATE booking_passengers SET %s = $1 WHERE id = $2", key)
		a.db.Exec(q, val, passengerID)
	}
	return nil
}

func (a *app) createCheckin(bookingID string, passengerID int, seatNumber string) (*CheckinRecord, error) {
	ref := fmt.Sprintf("BP-%s-%d", bookingID, passengerID)
	var existingRef string
	err := a.db.QueryRow("SELECT boarding_pass_ref FROM checkins WHERE booking_id = $1 AND passenger_id = $2", bookingID, passengerID).Scan(&existingRef)
	if err == nil {
		return &CheckinRecord{
			BookingID:       bookingID,
			PassengerID:     passengerID,
			SeatNumber:      seatNumber,
			CheckedInAt:     time.Now().UTC().Format(time.RFC3339),
			BoardingPassRef: existingRef,
		}, nil
	}
	_, err = a.db.Exec(
		"INSERT INTO checkins (booking_id, passenger_id, seat_number, boarding_pass_ref) VALUES ($1, $2, $3, $4)",
		bookingID, passengerID, seatNumber, ref,
	)
	if err != nil {
		return nil, err
	}

	record := &CheckinRecord{
		BookingID:       bookingID,
		PassengerID:     passengerID,
		SeatNumber:      seatNumber,
		CheckedInAt:     time.Now().UTC().Format(time.RFC3339),
		BoardingPassRef: ref,
	}
	return record, nil
}

func (a *app) recordGDS(requestType, requestBody, responseBody string) {
	a.db.Exec(
		"INSERT INTO gds_log (request_type, request_body, response_body) VALUES ($1, $2, $3)",
		requestType, requestBody, responseBody,
	)
}
