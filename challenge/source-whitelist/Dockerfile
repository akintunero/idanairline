FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY challenge/source-whitelist/src/flag_validator.go ./
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o flag_validator flag_validator.go

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/flag_validator /app/flag_validator
EXPOSE 6000
ENTRYPOINT ["/app/flag_validator"]
