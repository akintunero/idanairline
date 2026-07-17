#!/bin/sh
set -e

# =============================================================================
# Idan Airlines — Postgres Entrypoint Override
# =============================================================================
# Generates a random POSTGRES_PASSWORD if none is set, writes it to the
# shared volume so other services can discover it autonomously.
# =============================================================================

if [ -z "${POSTGRES_PASSWORD}" ]; then
    PASSWORD=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)
    export POSTGRES_PASSWORD="${PASSWORD}"
    mkdir -p /shared
    echo "${PASSWORD}" > /shared/.pgpass
fi

exec docker-entrypoint.sh "$@"
