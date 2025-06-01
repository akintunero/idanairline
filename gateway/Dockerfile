FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY main.go ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o gateway main.go

FROM alpine:3.20

WORKDIR /app
COPY --from=builder /app/gateway /app/gateway

EXPOSE 8000

ENTRYPOINT ["/app/gateway"]
