# ✈️ Idan Airlines — Vulnerable Airline Booking Platform (CTF)

> **⚠️ WARNING: This application is intentionally vulnerable. It is designed for educational purposes only. Do NOT deploy it to production or expose it to the public internet.**

![Idan Airlines](idan.png)

Idan Airlines is a deliberately vulnerable, full-stack airline booking platform built as a **Capture The Flag (CTF)** challenge. It simulates a realistic microservices architecture — complete with a React frontend, Go backend APIs, a Python payment service, and an Nginx reverse proxy — all wired together with Docker Compose.

The goal is to help security enthusiasts, students, and developers learn about **OWASP API Security Top 10** vulnerabilities by discovering and exploiting them in a safe, controlled environment.

## 📋 Table of Contents

- [Disclaimer](#-disclaimer)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Vulnerability Catalog](#-vulnerability-catalog)
- [CTF Flags](#-ctf-flags)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Author](#-author)

## 🚨 Disclaimer

This project is **intentionally insecure**. It contains real, exploitable vulnerabilities including SQL injection, broken authentication, broken object-level authorization, and more.

**You must only run this application in an isolated, local environment (e.g., your own machine or a private lab).** Do not:

- Deploy this to any public-facing server
- Use it to attack systems you do not own
- Store real personal or financial data in it

By using this software, you agree that it is solely for **educational and authorized security testing purposes**. The author assumes no liability for misuse.

## 🏗 Architecture

The platform uses a **microservices architecture** orchestrated via Docker Compose:

```
┌──────────────────────────────────────────────────────┐
│                    Nginx (Port 8080)                  │
│              Reverse Proxy / Entry Point              │
├────────────────────┬─────────────────────────────────┤
│   /  → Frontend    │   /api/ → API Gateway           │
│   (React SPA)      │   (Go, Port 8000)               │
│                    │                                  │
│                    │   ┌───────────────────────────┐  │
│                    │   │  /api/v1/booking/*        │  │
│                    │   │  → Booking API (Go:8080)  │  │
│                    │   ├───────────────────────────┤  │
│                    │   │  /api/v1/payment/*        │  │
│                    │   │  → Payment API (Py:8080)  │  │
│                    │   ├───────────────────────────┤  │
│                    │   │  /api/v1/user/*           │  │
│                    │   │  /api/v1/auth/*           │  │
│                    │   │  → User API (Go:8080)     │  │
│                    │   └───────────────────────────┘  │
└────────────────────┴─────────────────────────────────┘

Networks:
  public_net  → nginx, frontend, gateway
  internal_net → gateway, booking-api, payment-api, user-api
```

**Key design decisions:**
- Backend services sit on an `internal_net` network, not directly accessible from the host — you must go through the gateway.
- The gateway performs prefix-based routing, forwarding requests to the appropriate upstream service.
- Data is persisted to `ctf-data/` via Docker volume mounts (JSON files + SQLite).

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **API Gateway** | Go 1.22 (`net/http/httputil.ReverseProxy`) |
| **Booking API** | Go 1.22 (`net/http`) |
| **User/Auth API** | Go 1.22 (`net/http`) |
| **Payment API** | Python 3.12, FastAPI, SQLite |
| **Reverse Proxy** | Nginx 1.27 |
| **Orchestration** | Docker Compose |
| **Database** | JSON files + SQLite (backend CTF services) |

## 🚀 Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- [Node.js](https://nodejs.org/) 20+ (only needed if developing the frontend locally)
- Git

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/akintunero/idanairline.git
cd idanairline

# 2. Start all services
make up
# or: docker compose up --build -d

# 3. Open in your browser
open http://localhost:8080

# 4. Run the smoke tests (optional)
make smoke
```

### Stopping

```bash
make down
# or: docker compose down
```

### Frontend Development (Optional)

If you want to work on the React frontend with hot-reload:

```bash
npm install
npm run dev
```

The Vite dev server starts at `http://localhost:5173`. API calls are proxied through the Docker gateway (you still need `make up` running for the backend).

### Environment Variables

The backend CTF services accept optional environment variables for custom flags:

| Variable | Default | Description |
|---|---|---|
| `A01_FLAG` | `IDAN{B0LA_M4ST3R}` | Flag for the BOLA challenge |
| `A05_FLAG` | `IDAN{SQL1_M4ST3R}` | Flag for the SQL injection challenge |

## 🏴 Vulnerability Catalog

This platform contains vulnerabilities mapped to the **OWASP API Security Top 10 (2023)**:

### A01 — Broken Object Level Authorization (BOLA)

- **Service:** Booking API (Go)
- **Endpoint:** `POST /api/v1/booking/itinerary`
- **Description:** The itinerary lookup endpoint validates user ownership when `ticket_id` is sent as a string. However, sending it as a **JSON array** causes the type assertion to fail silently, bypassing the ownership check entirely — allowing you to access any user's booking.
- **Hint:** What happens if you change `"ticket_id": "VIP-1"` to `"ticket_id": ["VIP-1"]`?

### A05 — SQL Injection

- **Service:** Payment API (Python/FastAPI)
- **Endpoint:** `POST /apply-promo`
- **Description:** The promo code validation uses Python's `str.format()` to build a raw SQL query. This is a subtle injection vector that automated scanners often miss because it doesn't use string concatenation (`+`).
- **Hint:** Classic `' OR '1'='1` style payloads work. Verbose database errors are also leaked to the response.

### A10 — Unsafe Consumption of APIs / Fail-Open Logic

- **Service:** Payment API (Python/FastAPI)
- **Endpoint:** `POST /api/v1/payment/charge`
- **Description:** Sending a specific "poison pill" card number crashes the payment container (simulated OOM). If the upstream booking service doesn't handle the downstream failure safely, it may **fail open** — confirming a booking without actually charging the user.
- **Hint:** Try card number `0000-0000-0000-IDAN`.

### Additional Weaknesses

These are supporting weaknesses that make the above exploits possible:

| Weakness | Location | Detail |
|---|---|---|
| **Hardcoded admin credentials** | `user-api/main.go` | A default admin account is seeded on startup |
| **Plaintext password storage** | `user-api/main.go` | Passwords stored as-is in a JSON file |
| **No JWT signature verification** | `booking-api/main.go` | JWT payloads are parsed but signatures are never validated |
| **Weak/mock JWT signing** | `user-api/main.go` | Tokens use `mock_signature` — trivially forgeable |
| **Verbose error messages** | `payment-api/main.py` | SQLite errors are leaked directly to the client |
| **No rate limiting** | All services | No protection against brute-force or rapid-fire requests |

## 🚩 CTF Flags

There are **hidden flags** embedded in the application. Finding each one proves you've successfully exploited a vulnerability.

Flags follow the format: `IDAN{...}`

| Challenge | OWASP ID | Difficulty | Hint |
|---|---|---|---|
| BOLA Bypass | A01 | ⭐⭐ Medium | Change the type of `ticket_id` |
| SQL Injection | A05 | ⭐⭐ Medium | Inject through the promo code field |
| Fail-Open | A10 | ⭐⭐⭐ Hard | Kill the payment service, then confirm a booking |

> **No spoilers here!** The flags are discovered by exploiting the vulnerabilities described above. Good luck!

## 📡 API Reference

### Auth & User (User API)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register a new user |
| `POST` | `/api/v1/auth/login` | Login and receive a JWT |
| `GET` | `/api/v1/user/profile` | Get user profile (mock) |
| `GET` | `/api/v1/user/status` | Get user status (mock) |

### Bookings (Booking API)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/booking/hold` | Place a booking on hold |
| `POST` | `/api/v1/booking/cancel` | Cancel a pending booking |
| `POST` | `/api/v1/booking/confirm` | Confirm and pay for a booking |
| `POST` | `/api/v1/booking/itinerary` | 🏴 Look up a booking by PNR/ticket ID |

### Payments (Payment API)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/payment/charge` | 🏴 Process a payment |
| `POST` | `/apply-promo` | 🏴 Apply a promo code (internal) |

> 🏴 = Contains a vulnerability / flag

## 📁 Project Structure

```
idanairline/
├── booking-api/           # Go — Booking microservice (A01 BOLA vuln)
│   ├── Dockerfile
│   └── main.go
├── gateway/               # Go — API gateway / reverse proxy
│   ├── Dockerfile
│   └── main.go
├── payment-api/           # Python — Payment microservice (A05 SQLi, A10 Fail-Open)
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── user-api/              # Go — Authentication & user service
│   ├── Dockerfile
│   └── main.go
├── nginx/                 # Nginx config for routing
│   ├── frontend.conf
│   └── gateway.conf
├── src/                   # React frontend (TypeScript + Tailwind)
│   ├── App.tsx
│   ├── components/
│   ├── pages/
│   ├── data/
│   ├── lib/
│   └── types/
├── ctf-data/              # Runtime data (JSON DBs, SQLite)
├── scripts/
│   └── e2e-smoke.sh       # End-to-end smoke tests
├── docker-compose.yml     # Orchestration for all services
├── Makefile               # Convenience commands (up, down, logs, smoke)
├── frontend.Dockerfile    # Multi-stage build for the React frontend
├── CONTRIBUTING.md        # Contribution guidelines
├── SECURITY.md            # Security policy
├── LICENSE                # MIT License
└── README.md              # You are here
```

## Contributing

Contributions are welcome! Whether you want to add a new vulnerability challenge, improve the frontend, fix documentation, or suggest new OWASP categories — please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 👤 Author

**Olumayowa Akinkuehinmi**
- Email: [akintunero101@gmail.com](mailto:akintunero101@gmail.com)
- GitHub: [@akintunero](https://github.com/akintunero)

---

*Built with ❤️ for the security community. Hack responsibly.*
