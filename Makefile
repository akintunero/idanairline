COMPOSE := docker compose

.PHONY: up down logs smoke

up:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f nginx gateway frontend booking-api payment-api user-api

smoke:
	./scripts/e2e-smoke.sh
