package main

import (
	"encoding/json"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

type routeTarget struct {
	prefix   string
	upstream string
	label    string
	proxy    *httputil.ReverseProxy
}

type gateway struct {
	routeTable []routeTarget
}

type rateLimiter struct {
	mu      sync.Mutex
	clients map[string]*clientBucket
	limit   int
	window  time.Duration
}

type clientBucket struct {
	count       int
	windowStart time.Time
}

var limiter *rateLimiter

func initRateLimiter() {
	limit := 60
	windowSec := 60
	if v := os.Getenv("RATE_LIMIT_REQUESTS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	if v := os.Getenv("RATE_LIMIT_WINDOW_SECONDS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			windowSec = n
		}
	}
	limiter = &rateLimiter{
		clients: make(map[string]*clientBucket),
		limit:   limit,
		window:  time.Duration(windowSec) * time.Second,
	}
}

func (rl *rateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	bucket, exists := rl.clients[key]
	if !exists || now.Sub(bucket.windowStart) > rl.window {
		rl.clients[key] = &clientBucket{
			count:       1,
			windowStart: now,
		}
		return true
	}

	if bucket.count >= rl.limit {
		return false
	}

	bucket.count++
	return true
}

func newGateway() (*gateway, error) {
	targets := []routeTarget{
		{prefix: "/api/v1/booking/", upstream: "http://booking-api:8080", label: "booking-api:8080"},
		{prefix: "/api/v1/flights/", upstream: "http://booking-api:8080", label: "booking-api:8080"},
		{prefix: "/api/v1/payment/", upstream: "http://payment-api:8080", label: "payment-api:8080"},
		{prefix: "/api/v1/user/", upstream: "http://user-api:8080", label: "user-api:8080"},
		{prefix: "/api/v1/auth/", upstream: "http://user-api:8080", label: "user-api:8080"},
	}

	for i := range targets {
		targetURL, err := url.Parse(targets[i].upstream)
		if err != nil {
			return nil, err
		}
		targets[i].proxy = newReverseProxy(targetURL)
	}

	return &gateway{
		routeTable: targets,
	}, nil
}

func main() {
	initRateLimiter()

	gw, err := newGateway()
	if err != nil {
		log.Fatal(err)
	}

	server := &http.Server{
		Addr:    ":8000",
		Handler: gw.routes(),
	}

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

func (g *gateway) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", handleHealth)
	mux.HandleFunc("/", g.handleRoute)
	return mux
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
	})
}

func (g *gateway) handleRoute(w http.ResponseWriter, r *http.Request) {
	clientIP := r.Header.Get("X-Forwarded-For")
	if clientIP == "" {
		clientIP = r.RemoteAddr
	} else {
		clientIP = strings.Split(clientIP, ",")[0]
		clientIP = strings.TrimSpace(clientIP)
	}

	if !limiter.allow(clientIP) {
		w.Header().Set("X-RateLimit-Info", "rate_limit_exceeded")
		w.Header().Set("X-RateLimit-ClientIP", clientIP)
		writeJSONError(w, http.StatusTooManyRequests, "rate limit exceeded. Try again later.")
		return
	}

	for _, route := range g.routeTable {
		basePath := strings.TrimSuffix(route.prefix, "/")
		if r.URL.Path == basePath || strings.HasPrefix(r.URL.Path, route.prefix) {
			log.Printf("[Gateway] method=%s path=%s upstream=%s client=%s", r.Method, r.URL.Path, route.label, clientIP)
			route.proxy.ServeHTTP(w, r)
			return
		}
	}

	writeJSONError(w, http.StatusNotFound, "route not found")
}

func newReverseProxy(target *url.URL) *httputil.ReverseProxy {
	proxy := httputil.NewSingleHostReverseProxy(target)
	defaultDirector := proxy.Director

	proxy.Director = func(req *http.Request) {
		defaultDirector(req)
		req.Host = target.Host
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		writeJSONError(w, http.StatusBadGateway, "upstream service unavailable")
	}

	return proxy
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{
		"error": message,
	})
}
