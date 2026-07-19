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

CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(255) PRIMARY KEY,
    ticket_id VARCHAR(255) UNIQUE,
    status VARCHAR(50) DEFAULT 'PENDING',
    passenger_name VARCHAR(255) DEFAULT '',
    user_id UUID REFERENCES users(user_id),
    origin VARCHAR(10),
    destination VARCHAR(10),
    price DECIMAL(10, 2),
    flight_id VARCHAR(50),
    departure_date DATE,
    seat_class VARCHAR(20) DEFAULT 'economy',
    created_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS seat_holds (
    id SERIAL PRIMARY KEY,
    flight_id VARCHAR(50) REFERENCES flights(id),
    seat_number VARCHAR(10),
    user_id VARCHAR(255),
    held_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checkins (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR(255) REFERENCES bookings(id),
    passenger_id INT REFERENCES booking_passengers(id),
    seat_number VARCHAR(10),
    checked_in_at TIMESTAMP DEFAULT NOW(),
    boarding_pass_ref VARCHAR(100) UNIQUE
);

CREATE TABLE IF NOT EXISTS gds_log (
    id SERIAL PRIMARY KEY,
    request_type VARCHAR(50),
    request_body TEXT,
    response_body TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flash_promo_redemptions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    redeemed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS csrf_tokens (
    token VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour'
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '1 hour'
);
