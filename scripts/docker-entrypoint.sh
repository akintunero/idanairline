#!/bin/sh
set -e

# =============================================================================
# Idan Airlines — Shared Docker Entrypoint
# =============================================================================
# Auto-generates missing secrets on first boot. Designed to make
# "docker compose up" work with zero configuration while still
# producing a unique, randomized environment every spin.
#
# Secret resolution priority:
#   1. Environment variable (explicitly set)
#   2. Shared volume file (written by the first service that generates it)
#   3. Auto-generated (fresh random value, persisted to shared volume)
# =============================================================================

SHARED_DIR="/shared"

# ── DB_PASSWORD ─────────────────────────────────────────────────────────────
# Shared between postgres, user-api, and booking-api.
# Postgres generates it first; others read it from the volume file.
if [ -z "${DB_PASSWORD}" ] && [ -f "${SHARED_DIR}/.pgpass" ]; then
    DB_PASSWORD=$(cat "${SHARED_DIR}/.pgpass")
    export DB_PASSWORD
fi

# ── JWT_SECRET ──────────────────────────────────────────────────────────────
# Used by user-api for signing and verifying JWT tokens.
if [ -z "${JWT_SECRET}" ]; then
    if [ -f "${SHARED_DIR}/.jwt-secret" ]; then
        JWT_SECRET=$(cat "${SHARED_DIR}/.jwt-secret")
    else
        JWT_SECRET=$(head -c 48 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 48)
        mkdir -p "${SHARED_DIR}"
        echo "${JWT_SECRET}" > "${SHARED_DIR}/.jwt-secret"
    fi
    export JWT_SECRET
fi

# ── ADMIN_PASSWORD ──────────────────────────────────────────────────────────
# Created on first boot; printed to logs so players can discover it.
# Written to shared volume so admin-bot can authenticate.
if [ -z "${ADMIN_PASSWORD}" ]; then
    if [ -f "${SHARED_DIR}/.admin-password" ]; then
        ADMIN_PASSWORD=$(cat "${SHARED_DIR}/.admin-password")
    else
        ADMIN_PASSWORD=$(head -c 24 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 24)
        mkdir -p "${SHARED_DIR}"
        echo "${ADMIN_PASSWORD}" > "${SHARED_DIR}/.admin-password"
    fi
    export ADMIN_PASSWORD
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Admin account created:"
    echo "    Email:    admin@idan.air"
    echo "    Password: ${ADMIN_PASSWORD}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

exec "$@"
