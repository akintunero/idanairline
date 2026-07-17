#!/bin/sh
# This runs during postgres initialization (before accepting connections).
# If POSTGRES_PASSWORD is set, write it to the shared volume so other
# services can discover the password autonomously.
if [ -n "${POSTGRES_PASSWORD}" ]; then
    mkdir -p /shared 2>/dev/null || true
    echo "${POSTGRES_PASSWORD}" > /shared/.pgpass
fi
