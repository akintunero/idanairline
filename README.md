# Idan Airlines

Regional carrier serving West Africa, Europe, and the Middle East.
Connect via [idan.air](https://idan.air).

## Getting Started

Requires Docker.

```bash
docker compose up --build -d
```

The booking portal will be available at `http://localhost:8080`.

### Reset

To clear all data (user accounts, bookings, etc.) and start fresh:

```bash
make down
make up
```

## Tech Stack

React, Go, Python, PostgreSQL, Redis, nginx.

## Notice

This platform is for **educational and authorized security training only**.
All services run in isolated Docker containers on `localhost` only — no
vulnerabilities are exposed to the internet. Do not deploy to production
or any publicly accessible environment.

## License

MIT.
