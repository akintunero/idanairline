FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY main.go ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o user-api main.go

FROM alpine:3.20

WORKDIR /app
COPY --from=builder /app/user-api /app/user-api

EXPOSE 8080

ENTRYPOINT ["/app/user-api"]
