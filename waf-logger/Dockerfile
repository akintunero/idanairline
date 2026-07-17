FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY waf-logger/main.go ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o waf-logger main.go

FROM alpine:3.20

WORKDIR /app
COPY --from=builder /app/waf-logger /app/waf-logger
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["/app/waf-logger"]
