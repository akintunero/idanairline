#!/bin/sh
# Runs during postgres initialization. Shares the password with other services.
set -e

# Ensure /shared is writable (Docker volume mounts as root:root)
if [ -d "/shared" ]; then
    chmod 777 /shared 2>/dev/null || true
fi

if [ -n "${POSTGRES_PASSWORD}" ]; then
    mkdir -p /shared 2>/dev/null || true
    echo "${POSTGRES_PASSWORD}" > /shared/.pgpass
    chmod 644 /shared/.pgpass 2>/dev/null || true
fi
