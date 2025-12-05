# Stage 1: The Builder
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy the source code
COPY . .

# Initialize the Go module if it doesn't exist, and tidy dependencies
RUN go mod init idan/booking || true
RUN go mod tidy

# Build the binary
# CGO_ENABLED=0 ensures it's a static binary
# -ldflags="-s -w" strips debug symbols to make the CTF harder
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o booking-api main.go

# Stage 2: The Production Container (Distroless)
FROM gcr.io/distroless/static-debian11

WORKDIR /

# Copy only the compiled binary from the builder stage
COPY --from=builder /app/booking-api /booking-api

# Run as a non-root user for security
USER nonroot:nonroot

EXPOSE 8080

ENTRYPOINT ["/booking-api"]