package main

type Booking struct {
	ID            string  `json:"id"`
	TicketID      string  `json:"ticket_id,omitempty"`
	Status        string  `json:"status"`
	UserID        string  `json:"user_id,omitempty"`
	PassengerName string  `json:"passenger_name,omitempty"`
	Origin        string  `json:"origin,omitempty"`
	Destination   string  `json:"destination,omitempty"`
	Price         float64 `json:"price,omitempty"`
	FlightID      string  `json:"flight_id,omitempty"`
	DepartureDate string  `json:"departure_date,omitempty"`
	SeatClass     string  `json:"seat_class,omitempty"`
}

type Passenger struct {
	ID              int     `json:"id"`
	BookingID       string  `json:"booking_id"`
	FullName        string  `json:"full_name"`
	Email           string  `json:"email"`
	PassportNumber  string  `json:"passport_number"`
	SeatNumber      string  `json:"seat_number"`
	LuggageAllowance int    `json:"luggage_allowance"`
	MealPreference  string  `json:"meal_preference"`
}

type Flight struct {
	ID            string `json:"id"`
	FlightNumber  string `json:"flight_number"`
	Origin        string `json:"origin"`
	Destination   string `json:"destination"`
	DepartureTime string `json:"departure_time"`
	ArrivalTime   string `json:"arrival_time"`
	Aircraft      string `json:"aircraft"`
	BasePrice     float64 `json:"base_price"`
	Status        string `json:"status"`
}

type Seat struct {
	ID          int    `json:"id"`
	FlightID    string `json:"flight_id"`
	SeatNumber  string `json:"seat_number"`
	SeatClass   string `json:"seat_class"`
	IsAvailable bool   `json:"is_available"`
}

type FareRule struct {
	ID                int     `json:"id"`
	FlightID          string  `json:"flight_id"`
	SeatClass         string  `json:"seat_class"`
	CancellationHours int     `json:"cancellation_hours"`
	RefundPercent     float64 `json:"refund_percent"`
	ChangeFee         float64 `json:"change_fee"`
	CheckinOpensHours int     `json:"checkin_opens_hours"`
}

type CheckinRecord struct {
	ID              int    `json:"id"`
	BookingID       string `json:"booking_id"`
	PassengerID     int    `json:"passenger_id"`
	SeatNumber      string `json:"seat_number"`
	CheckedInAt     string `json:"checked_in_at"`
	BoardingPassRef string `json:"boarding_pass_ref"`
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
