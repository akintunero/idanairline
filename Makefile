COMPOSE := docker compose

.PHONY: up down logs smoke

up:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f api-gateway booking-api payment-api user-api frontend

smoke:
	./scripts/e2e-smoke.sh
