# ✈️ Idan Airlines — Vulnerable Airline Booking Platform (CTF)

> **⚠️ WARNING: This application is intentionally vulnerable. It is designed for educational purposes only. Do NOT deploy it to production or expose it to the public internet.**

![Idan Airlines](assets/idan.png)

Idan Airlines is a deliberately vulnerable, full-stack airline booking platform built as a **Capture The Flag (CTF)** challenge. It simulates a realistic microservices architecture — complete with a React frontend, Go backend APIs, a Python payment service, and an Nginx reverse proxy — all wired together with Docker Compose.

The goal is to help security enthusiasts, students, and developers learn about **OWASP API Security Top 10** vulnerabilities by discovering and exploiting them in a safe, controlled environment.

## 📋 Table of Contents

- [Disclaimer](#-disclaimer)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
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

* Hack responsibly.*
