#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Idan Airlines — Environment Generator
# =============================================================================
# Generates a fresh .env with random credentials on every run.
# Preserves CTF_FLAG_* values so flag authors set them once.
#
# Usage:
#   ./scripts/generate-env.sh                         # fresh environment
#   CTF_FLAG_A01_BOLA=flag{myflag} ./scripts/generate-env.sh  # with flags
# =============================================================================

ENV_FILE=".env"
TEMP_FLAGS=$(mktemp)

# Preserve existing CTF flags
if [ -f "$ENV_FILE" ]; then
    grep '^CTF_FLAG_' "$ENV_FILE" > "$TEMP_FLAGS" 2>/dev/null || true
fi

# Also capture any CTF flags set in the calling environment
for var in $(env | grep '^CTF_FLAG_' | cut -d= -f1); do
    echo "${var}=${!var}" >> "$TEMP_FLAGS" 2>/dev/null
done

rand() {
    openssl rand -base64 48 2>/dev/null | tr -dc 'a-zA-Z0-9' | head -c "${1:-32}"
    echo
}

cat > "$ENV_FILE" << ENVEOF
# ── Idan Airlines CTF — Generated $(date) ──────────────────────────────────
# Every 'make up' regenerates this file. Set CTF_FLAG_* before running to
# inject challenge flags:  CTF_FLAG_A01_BOLA=flag{...} make up

DB_USER=idan
DB_PASSWORD=$(rand 32)
DB_NAME=idanairline

JWT_SECRET=$(rand 48)
ADMIN_EMAIL=admin@idan.air
ADMIN_PASSWORD=$(rand 24)
ADMIN_FULL_NAME=System Administrator

FLASH_PROMO_CODE=IDAN_FLASH
FLASH_PROMO_MAX_SLOTS=1
RACE_CONDITION_WINDOW_MS=400
DEFAULT_BOOKING_PRICE=5000
PROMO_CODE_GODMODE=IDAN_GODMODE
POISON_PILL_CARD=0000-0000-0000-IDAN
PAYMENT_SERVICE_URL=http://payment-api:8080

REDIS_URL=redis://redis:6379/0
HTTP_PORT=8080

RATE_LIMIT_REQUESTS=60
RATE_LIMIT_WINDOW_SECONDS=60

APP_ENV=development
ENVEOF

# Append preserved CTF flags
if [ -s "$TEMP_FLAGS" ]; then
    echo "" >> "$ENV_FILE"
    echo "# CTF Challenge Flags" >> "$ENV_FILE"
    sort -u "$TEMP_FLAGS" >> "$ENV_FILE"
fi

rm -f "$TEMP_FLAGS"

ADMIN_PW=$(grep '^ADMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2)
echo "  Fresh credentials generated."
echo "  Admin: admin@idan.air / ${ADMIN_PW}"
echo "  JWT secret: $(grep '^JWT_SECRET=' "$ENV_FILE" | cut -d= -f2)"
