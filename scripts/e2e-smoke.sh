#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-http://localhost:8080}"

echo "[1/10] Frontend reachability"
curl -fsS "${base_url}/" >/dev/null && echo "  OK"

echo "[2/10] Booking hold"
curl -fsS -X POST "${base_url}/api/v1/booking/hold" \
  -H "Content-Type: application/json" \
  -d '{"booking_id":"SMOKE-HOLD-001","flight_id":"IDL1100"}' >/dev/null && echo "  OK"

echo "[3/10] Payment charge"
curl -fsS -X POST "${base_url}/api/v1/payment/charge" \
  -H "Content-Type: application/json" \
  -d '{"booking_id":"SMOKE-PAY-001","amount":299.99,"currency":"USD"}' >/dev/null && echo "  OK"

echo "[4/10] User profile"
curl -fsS "${base_url}/api/v1/user/profile" >/dev/null && echo "  OK"

echo "[5/10] Flight search"
curl -fsS "${base_url}/api/v1/flights/search?origin=LOS&destination=LHR" >/dev/null && echo "  OK"

echo "[6/10] Seat map"
curl -fsS "${base_url}/api/v1/flights/seats?flight_id=IDL1100" >/dev/null && echo "  OK"

echo "[7/10] Fare rules"
curl -fsS "${base_url}/api/v1/flights/fare-rules?flight_id=IDL1100&seat_class=economy" >/dev/null && echo "  OK"

echo "[8/10] Booking confirm"
curl -fsS -X POST "${base_url}/api/v1/booking/confirm" \
  -H "Content-Type: application/json" \
  -d '{"booking_id":"SMOKE-CONFIRM-001"}' >/dev/null && echo "  OK"

echo "[9/10] Check-in"
curl -fsS -X POST "${base_url}/api/v1/booking/checkin" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZGV2LXVzZXIiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20ifQ.fake" \
  -d '{"booking_id":"SMOKE-CONFIRM-001","passenger_id":1,"seat_number":"E01"}' >/dev/null && echo "  OK"

echo "[10/10] GDS query"
curl -fsS -X POST "${base_url}/api/v1/gds/query" \
  -H "Content-Type: application/json" \
  -d '{"action":"availability","flight_id":"IDL1100","payload":"test"}' >/dev/null && echo "  OK"

echo "All E2E smoke checks passed."
