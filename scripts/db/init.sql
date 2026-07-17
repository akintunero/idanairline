-- Idan Airlines PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) DEFAULT '',
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    loyalty_tier VARCHAR(50) DEFAULT 'SILVER',
    home_airport VARCHAR(10) DEFAULT 'LOS',
    preferred_seat_class VARCHAR(20) DEFAULT 'economy',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ── Bookings ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(255) PRIMARY KEY,
    ticket_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'PENDING',
    user_id VARCHAR(255) REFERENCES users(user_id),
    origin VARCHAR(10),
    destination VARCHAR(10),
    price DECIMAL(10, 2),
    flight_id VARCHAR(50),
    departure_date DATE,
    seat_class VARCHAR(20) DEFAULT 'economy',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── Booking Passengers (multi-passenger support) ─────────────────────────
CREATE TABLE IF NOT EXISTS booking_passengers (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR(255) REFERENCES bookings(id),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    passport_number VARCHAR(50),
    seat_number VARCHAR(10),
    luggage_allowance INT DEFAULT 23,
    meal_preference VARCHAR(50) DEFAULT 'standard',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── Flights ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flights (
    id VARCHAR(50) PRIMARY KEY,
    flight_number VARCHAR(20) NOT NULL,
    origin VARCHAR(10) NOT NULL,
    destination VARCHAR(10) NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    aircraft VARCHAR(50) DEFAULT 'Boeing 737-800',
    base_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled'
);

-- ── Fare Rules ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fare_rules (
    id SERIAL PRIMARY KEY,
    flight_id VARCHAR(50) REFERENCES flights(id),
    seat_class VARCHAR(20) NOT NULL,
    cancellation_hours INT DEFAULT 24,
    refund_percent DECIMAL(5, 2) DEFAULT 100.00,
    change_fee DECIMAL(10, 2) DEFAULT 0.00,
    checkin_opens_hours INT DEFAULT 24,
    UNIQUE(flight_id, seat_class)
);

-- ── Seats ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seats (
    id SERIAL PRIMARY KEY,
    flight_id VARCHAR(50) REFERENCES flights(id),
    seat_number VARCHAR(10) NOT NULL,
    seat_class VARCHAR(20) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    held_until TIMESTAMP,
    held_by VARCHAR(255),
    UNIQUE(flight_id, seat_number)
);

-- ── Seat Holds (for race condition exploitation) ─────────────────────────
CREATE TABLE IF NOT EXISTS seat_holds (
    id SERIAL PRIMARY KEY,
    flight_id VARCHAR(50) REFERENCES flights(id),
    seat_number VARCHAR(10),
    user_id VARCHAR(255),
    held_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- ── Check-ins ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkins (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR(255) REFERENCES bookings(id),
    passenger_id INT REFERENCES booking_passengers(id),
    seat_number VARCHAR(10),
    checked_in_at TIMESTAMP DEFAULT NOW(),
    boarding_pass_ref VARCHAR(100) UNIQUE
);

-- ── GDS Integration Log ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gds_log (
    id SERIAL PRIMARY KEY,
    request_type VARCHAR(50),
    request_body TEXT,
    response_body TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ── Promo redemptions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flash_promo_redemptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    redeemed_at TIMESTAMP DEFAULT NOW()
);

-- ── CSRF tokens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS csrf_tokens (
    token VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour'
);

-- ── Seed flight data ───────────────────────────────────────────────────────
INSERT INTO flights (id, flight_number, origin, destination, departure_time, arrival_time, base_price, status)
VALUES
    ('IDL1100', 'IDL1100', 'LOS', 'LHR', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '7 hours', 2345.00, 'scheduled'),
    ('IDL1101', 'IDL1101', 'LOS', 'LHR', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '7 hours', 1890.00, 'scheduled'),
    ('IDD1107', 'IDD1107', 'LOS', 'DXB', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '6 hours', 694.00, 'scheduled'),
    ('IDP1054', 'IDP1054', 'LHR', 'CDG', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '1.5 hours', 380.00, 'scheduled'),
    ('IDN2201', 'IDN2201', 'JFK', 'LOS', NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days' + INTERVAL '11 hours', 3200.00, 'scheduled'),
    ('IDN3302', 'IDN3302', 'LOS', 'JFK', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '11 hours', 3500.00, 'scheduled'),
    ('IDD4403', 'IDD4403', 'DXB', 'SIN', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '8 hours', 890.00, 'scheduled'),
    ('IDN5504', 'IDN5504', 'CDG', 'LOS', NOW() + INTERVAL '6 days', NOW() + INTERVAL '6 days' + INTERVAL '7 hours', 2100.00, 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- Seed fare rules
INSERT INTO fare_rules (flight_id, seat_class, cancellation_hours, refund_percent, change_fee, checkin_opens_hours)
SELECT id, 'economy', 24, 80.00, 50.00, 24 FROM flights
ON CONFLICT DO NOTHING;

INSERT INTO fare_rules (flight_id, seat_class, cancellation_hours, refund_percent, change_fee, checkin_opens_hours)
SELECT id, 'business', 12, 90.00, 25.00, 48 FROM flights
ON CONFLICT DO NOTHING;

INSERT INTO fare_rules (flight_id, seat_class, cancellation_hours, refund_percent, change_fee, checkin_opens_hours)
SELECT id, 'first', 4, 100.00, 0.00, 72 FROM flights
ON CONFLICT DO NOTHING;

-- Seed seats (30 seats per flight: 20 economy, 6 business, 4 first)
DO $$
DECLARE
    f RECORD;
    seat_num INT;
    cls TEXT;
BEGIN
    FOR f IN SELECT * FROM flights LOOP
        -- Economy: rows 1-20
        FOR seat_num IN 1..20 LOOP
            INSERT INTO seats (flight_id, seat_number, seat_class)
            VALUES (f.id, 'E' || LPAD(seat_num::TEXT, 2, '0'), 'economy')
            ON CONFLICT DO NOTHING;
        END LOOP;
        -- Business: rows 21-26
        FOR seat_num IN 21..26 LOOP
            INSERT INTO seats (flight_id, seat_number, seat_class)
            VALUES (f.id, 'B' || LPAD(seat_num::TEXT, 2, '0'), 'business')
            ON CONFLICT DO NOTHING;
        END LOOP;
        -- First: rows 27-30
        FOR seat_num IN 27..30 LOOP
            INSERT INTO seats (flight_id, seat_number, seat_class)
            VALUES (f.id, 'F' || LPAD(seat_num::TEXT, 2, '0'), 'first')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
