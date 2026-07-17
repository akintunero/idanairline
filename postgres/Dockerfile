FROM postgres:16-alpine

# Ensure /shared volume is writable by postgres user at runtime.
# Docker volumes mount as root:root — we need to chmod at container start.
COPY postgres/entrypoint.sh /usr/local/bin/idan-postgres-init.sh
RUN chmod +x /usr/local/bin/idan-postgres-init.sh

ENTRYPOINT ["idan-postgres-init.sh"]
