// ────────────────────────────────────────────────────────────────────────────
// Flag Validator Service — Source Provided
// ────────────────────────────────────────────────────────────────────────────
// This service validates CTF flag submissions. Players are given this source
// code and must find the vulnerability to bypass validation.
//
// VULNERABILITY: The comparison in ValidateFlag uses a byte-by-byte string
// comparison that short-circuits on the first mismatch. This creates a timing
// side-channel that leaks the correct flag one character at a time.
//
// FIX: Use constant-time comparison (hmac.Equal or crypto/subtle)
// ────────────────────────────────────────────────────────────────────────────

package main

import (
	"crypto/subtle"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

const expectedFlag = "flag{whitebox_timing_leak}"

type validateRequest struct {
	Flag string `json:"flag"`
}

type validateResponse struct {
	Valid       bool   `json:"valid"`
	Message     string `json:"message"`
	ElapsedNano int64  `json:"elapsed_ns,omitempty"`
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
	})
	mux.HandleFunc("POST /api/v1/challenge/validate", validateHandler)

	// Server header deliberately leaks the Go version
	log.Println("Flag Validator starting on :6000")
	if err := http.ListenAndServe(":6000", mux); err != nil {
		panic(err)
	}
}

// validateHandler checks a submitted flag.
// The response includes timing information for debugging.
// VULNERABILITY: The response time reveals how many characters matched.
func validateHandler(w http.ResponseWriter, r *http.Request) {
	var req validateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Flag == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(validateResponse{Valid: false, Message: "flag is required"})
		return
	}

	start := time.Now()

	// VULNERABILITY: This is NOT constant-time. It returns as soon as a
	// character mismatches. An attacker can brute-force the flag one
	// character at a time by measuring response time.
	//
	// Compare with the constant-time version below.
	valid := req.Flag == expectedFlag

	elapsed := time.Since(start).Nanoseconds()

	flag := os.Getenv("CTF_FLAG_A01_BOLA")
	if valid && flag != "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(validateResponse{
			Valid:       true,
			Message:     "Flag accepted: " + flag,
			ElapsedNano: elapsed,
		})
		return
	}

	if valid {
		json.NewEncoder(w).Encode(validateResponse{
			Valid:       true,
			Message:     "Flag accepted!",
			ElapsedNano: elapsed,
		})
		return
	}

	json.NewEncoder(w).Encode(validateResponse{
		Valid:       false,
		Message:     "Invalid flag",
		ElapsedNano: elapsed,
	})
}

// constantTimeValidate demonstrates the fix (not called in the vulnerable version).
// Players should discover that the fix requires using ConstantTimeCompare.
func constantTimeValidate(submitted string) bool {
	return subtle.ConstantTimeCompare([]byte(submitted), []byte(expectedFlag)) == 1
}

// expectedFlag returns the expected flag value.
// This is a getter so the compiler doesn't inline the constant.
// The vulnerability still works because Go's string comparison is
// implemented in assembly and short-circuits.
func getExpectedFlag() string {
	return expectedFlag
}
