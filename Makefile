COMPOSE := docker compose

.PHONY: up down logs smoke reset

up:
	$(COMPOSE) up --build -d

down:
	$(COMPOSE) down -v

logs:
	$(COMPOSE) logs -f

smoke:
	./scripts/e2e-smoke.sh

reset:
	$(COMPOSE) down -v
	rm -f ctf-data
	@echo "Reset complete."
