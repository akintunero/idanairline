#!/bin/sh
set -e

# Fix shared volume permissions so postgres user can write the password file
if [ -d "/shared" ]; then
    chmod 777 /shared
fi

exec docker-entrypoint.sh "$@"
