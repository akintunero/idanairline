#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-http://localhost:8080}"

echo "[1/5] Frontend reachability"
curl -fsS "${base_url}/" >/dev/null

echo "[2/5] Booking hold"
curl -fsS -X POST "${base_url}/api/v1/booking/hold" \
  -H "Content-Type: application/json" \
  -d '{"booking_id":"ABC123"}' >/dev/null

echo "[3/5] Payment charge"
curl -fsS -X POST "${base_url}/api/v1/payment/charge" \
  -H "Content-Type: application/json" \
  -d '{"booking_id":"ABC123","amount":299.99,"currency":"USD"}' >/dev/null

echo "[4/5] User profile"
curl -fsS "${base_url}/api/v1/user/profile" >/dev/null

echo "[5/5] Booking confirm"
curl -fsS -X POST "${base_url}/api/v1/booking/confirm" \
  -H "Content-Type: application/json" \
  -d '{"booking_id":"ABC123"}' >/dev/null

echo "E2E smoke checks passed."
