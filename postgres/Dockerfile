FROM postgres:16-alpine

COPY postgres/entrypoint.sh /usr/local/bin/idan-postgres-init.sh
RUN chmod +x /usr/local/bin/idan-postgres-init.sh

ENTRYPOINT ["idan-postgres-init.sh"]
