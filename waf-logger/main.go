package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

type logEntry struct {
	Timestamp string            `json:"timestamp"`
	Method    string            `json:"method"`
	Path      string            `json:"path"`
	ClientIP  string            `json:"client_ip"`
	UserAgent string            `json:"user_agent"`
	Headers   map[string]string `json:"headers"`
	Body      string            `json:"body,omitempty"`
}

type wafStore struct {
	mu     sync.RWMutex
	events []logEntry
	alerts []string
}

var store = &wafStore{}

func init() {
	flag := os.Getenv("CTF_FLAG_WAF")
	encoded := base64.StdEncoding.EncodeToString([]byte("suspicious_activity_detected"))
	store.events = append(store.events, logEntry{
		Timestamp: "2026-07-15T03:14:15Z",
		Method:    "POST",
		Path:      "/api/v1/admin/dashboard",
		ClientIP:  "10.0.0.45",
		Body:      encoded,
	})
	store.events = append(store.events, logEntry{
		Timestamp: "2026-07-15T03:14:16Z",
		Method:    "POST",
		Path:      "/api/v1/user/avatar",
		ClientIP:  "10.0.0.45",
		Body:      base64.StdEncoding.EncodeToString([]byte(flag)),
	})
	store.events = append(store.events, logEntry{
		Timestamp: "2026-07-15T03:14:17Z",
		Method:    "GET",
		Path:      "/api/v0/booking/export",
		ClientIP:  "10.0.0.200",
		Headers:   map[string]string{"user-agent": "python-requests/2.31"},
		Body:      base64.StdEncoding.EncodeToString([]byte("internal_network_scan_complete")),
	})
}

func envFlag(key string) string {
	return os.Getenv(key)
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /log", handleLog)
	mux.HandleFunc("GET /logs", handleGetLogs)
	mux.HandleFunc("GET /alerts", handleGetAlerts)
	mux.HandleFunc("GET /healthz", handleHealth)
	mux.HandleFunc("POST /alerts/clear", handleClearAlerts)

	server := &http.Server{
		Addr:    ":9000",
		Handler: mux,
	}

	log.Println("WAF Logger starting on :9000")
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func handleLog(w http.ResponseWriter, r *http.Request) {
	var entry logEntry
	if err := json.NewDecoder(r.Body).Decode(&entry); err != nil {
		http.Error(w, "invalid log entry", http.StatusBadRequest)
		return
	}

	entry.Timestamp = time.Now().UTC().Format(time.RFC3339)

	store.mu.Lock()
	store.events = append(store.events, entry)

	body := strings.ToLower(entry.Body)
	path := strings.ToLower(entry.Path)

	if strings.Contains(body, "<script") || strings.Contains(body, "onerror") {
		alert := fmt.Sprintf("[WAF] XSS attempt blocked from %s at %s", entry.ClientIP, entry.Timestamp)
		store.alerts = append(store.alerts, alert)
	}
	if strings.Contains(path, "../") || strings.Contains(path, "..\\") {
		alert := fmt.Sprintf("[WAF] Path traversal attempt blocked from %s at %s", entry.ClientIP, entry.Timestamp)
		store.alerts = append(store.alerts, alert)
	}
	if strings.Contains(body, "union select") || strings.Contains(body, "1=1") {
		alert := fmt.Sprintf("[WAF] SQLi attempt blocked from %s at %s", entry.ClientIP, entry.Timestamp)
		store.alerts = append(store.alerts, alert)
	}
	store.mu.Unlock()

	log.Printf("[WAF] %s - %s %s from %s", entry.Timestamp, entry.Method, entry.Path, entry.ClientIP)

	w.Header().Set("X-WAF-Status", "logged")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "logged",
	})
}

func handleGetLogs(w http.ResponseWriter, r *http.Request) {
	store.mu.RLock()
	defer store.mu.RUnlock()

	flag := envFlag("CTF_FLAG_WAF")
	config := map[string]string{
		"version": "1.0.0",
		"mode":    "detect",
	}
	if flag != "" {
		config["cluster_secret"] = flag
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"total_logs": len(store.events),
		"logs":       store.events,
		"waf_config": config,
	})
}

func handleGetAlerts(w http.ResponseWriter, r *http.Request) {
	store.mu.RLock()
	defer store.mu.RUnlock()

	json.NewEncoder(w).Encode(map[string]interface{}{
		"total_alerts": len(store.alerts),
		"alerts":       store.alerts,
	})
}

func handleClearAlerts(w http.ResponseWriter, r *http.Request) {
	store.mu.Lock()
	defer store.mu.Unlock()

	store.alerts = nil
	json.NewEncoder(w).Encode(map[string]string{
		"status": "alerts cleared",
	})
}
