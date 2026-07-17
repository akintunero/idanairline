FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY admin-bot/main.go ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o admin-bot main.go

FROM alpine:3.20

WORKDIR /app
COPY --from=builder /app/admin-bot /app/admin-bot
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 7000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["/app/admin-bot"]
