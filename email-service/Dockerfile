FROM python:3.12-alpine

WORKDIR /app

COPY email-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY email-service/templates/ ./templates/
COPY email-service/main.py ./
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["python", "main.py"]
