package main

import (
	"testing"
	"time"
)

func TestRateLimiterInitialAllow(t *testing.T) {
	limiter = &rateLimiter{
		clients: make(map[string]*clientBucket),
		limit:   5,
		window:  time.Minute,
	}

	if !limiter.allow("test-ip") {
		t.Error("Expected first request to be allowed")
	}
}

func TestRateLimiterBlockAfterLimit(t *testing.T) {
	limiter = &rateLimiter{
		clients: make(map[string]*clientBucket),
		limit:   3,
		window:  time.Minute,
	}

	for i := 0; i < 3; i++ {
		if !limiter.allow("block-ip") {
			t.Errorf("Request %d should be allowed", i+1)
		}
	}

	if limiter.allow("block-ip") {
		t.Error("Expected 4th request to be blocked")
	}
}

func TestRateLimiterSeparateBuckets(t *testing.T) {
	limiter = &rateLimiter{
		clients: make(map[string]*clientBucket),
		limit:   1,
		window:  time.Minute,
	}

	if !limiter.allow("ip-a") {
		t.Error("ip-a first request should be allowed")
	}
	if limiter.allow("ip-a") {
		t.Error("ip-a second request should be blocked")
	}
	if !limiter.allow("ip-b") {
		t.Error("ip-b first request should be allowed (separate bucket)")
	}
}

func TestRateLimiterResetsAfterWindow(t *testing.T) {
	limiter = &rateLimiter{
		clients: make(map[string]*clientBucket),
		limit:   1,
		window:  50 * time.Millisecond,
	}

	if !limiter.allow("reset-ip") {
		t.Error("First request should be allowed")
	}

	time.Sleep(60 * time.Millisecond)

	if !limiter.allow("reset-ip") {
		t.Error("Request after window should be allowed (bucket reset)")
	}
}
