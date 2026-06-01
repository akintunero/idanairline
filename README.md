# Idan Airlines CTF (v1.0)

Welcome to the **Idan Airlines** security laboratory — a deliberately vulnerable microservices airline booking platform for red-team training, API security auditing, and OWASP API Top 10 practice.

> **Warning:** This application is intentionally insecure. Run it only in an isolated local environment. Do not deploy to the public internet or use it as a production template.

## Scenario

You have been hired to perform a **black-box** security assessment of Idan Airlines' booking platform. The airline recently moved to a microservices architecture and wants its API ecosystem tested. Your job is to find flaws, chain them where possible, and collect **stealth keys** (hashes) from successful exploit traces in raw HTTP traffic — the UI will not reveal them.

## Rules of engagement

- **Black-box:** No backend source documentation is provided to players.
- **Scope:** All services started by this repository's Docker Compose stack at [http://localhost:8080](http://localhost:8080) and its `/api/*` routes.
- **Goal:** Identify and document issues aligned with the [OWASP API Security Top 10 (2023)](https://owasp.org/API-Security/editions/2023/en/0x00-header-part-2/).
- **Ethics:** Authorized local lab use only.

## Getting started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) v2+
- [Burp Suite](https://portswigger.net/burp/) or [OWASP ZAP](https://zaproxy.org/) (recommended)
- [curl](https://curl.se/) or [Postman](https://www.postman.com/)
- [Node.js](https://nodejs.org/) 20+ (optional — only if developing the frontend locally)

### Quick start

```bash
# 1. Clone the repository
git clone https://github.com/akintunero/idanairline.git
cd idanairline

# 2. Start all services
make up
# or: docker compose up --build -d

# 3. Open in your browser
open http://localhost:8080
```

4. **Verify the stack** (optional)

   ```bash
   make smoke
   ```

   You should be able to browse the site and walk through search, booking, login, and registration flows.

## Architecture (high level)

```
Browser → Nginx (:8080) → React frontend
                        → API Gateway → booking-api
                                        → payment-api
                                        → user-api
```

Backend services run on an internal Docker network. All player traffic enters through port **8080**.

## Troubleshooting and operations

### View logs

```bash
make logs
```

Or:

```bash
docker compose logs -f
```

### Reset lab data

Stopping containers does not wipe persisted challenge state. For a full reset:

```bash
make down
rm -rf ctf-data/
make up
```

### Payment service unavailable

Some exploits intentionally disrupt the payment service. If charges fail across the board, restart the stack:

```bash
make down && make up
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md) for reporting unintentional bugs.

## License

MIT — see [LICENSE](LICENSE).
