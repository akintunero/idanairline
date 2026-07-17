FROM postgres:16-alpine

# Ensure shared volume is writable by postgres user (UID 999)
RUN mkdir -p /shared && chmod 777 /shared
