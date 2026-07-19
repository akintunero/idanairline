FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app
COPY user-api/go.mod ./
COPY user-api/main.go ./
RUN GOPROXY=direct go mod tidy
RUN GOPROXY=direct CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o user-api main.go

FROM alpine:3.20

RUN apk add --no-cache ca-certificates

WORKDIR /app
COPY --from=builder /app/user-api /app/user-api
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["/app/user-api"]
