package main

import (
	"encoding/json"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
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

func newGateway() (*gateway, error) {
	targets := []routeTarget{
		{prefix: "/api/v1/booking/", upstream: "http://booking-api:8080", label: "booking-api:8080"},
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
	_ = json.NewEncoder(w).Encode(map[string]string{
		"status": "healthy",
	})
}

func (g *gateway) handleRoute(w http.ResponseWriter, r *http.Request) {
	for _, route := range g.routeTable {
		basePath := strings.TrimSuffix(route.prefix, "/")
		if r.URL.Path == basePath || strings.HasPrefix(r.URL.Path, route.prefix) {
			log.Printf("[Gateway] method=%s path=%s upstream=%s", r.Method, r.URL.Path, route.label)
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
	_ = json.NewEncoder(w).Encode(map[string]string{
		"error": message,
	})
}
