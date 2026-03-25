# Contributing to Idan Airlines CTF

Thank you for your interest in contributing! This project is an educational, intentionally vulnerable application — contributions that add new challenges, improve documentation, or enhance the learning experience are especially welcome.

## Ways to Contribute

- **Add a new vulnerability challenge** — Implement a new OWASP API Security Top 10 category (e.g., A02 Broken Authentication, A03 Broken Object Property Level Authorization, A07 SSRF).
- **Improve existing challenges** — Make exploits more realistic, add difficulty tiers, or improve hints.
- **Frontend improvements** — Enhance the UI/UX, add new pages, or improve responsiveness.
- **Documentation** — Fix typos, improve write-ups, add walkthrough guides.
- **Bug fixes** — Fix unintentional bugs (not the deliberate vulnerabilities!).
- **Tooling** — Improve Docker setup, CI/CD, testing, or developer experience.

## Getting Started

1. Fork the repository
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/idanairline.git
   cd idanairline
   ```
3. Create a feature branch:
   ```bash
   git checkout -b feature/my-new-challenge
   ```
4. Make your changes
5. Test locally with `make up` and `make smoke`
6. Commit and push:
   ```bash
   git add .
   git commit -m "Add A07 SSRF challenge to gateway"
   git push origin feature/my-new-challenge
   ```
7. Open a Pull Request against `main`

## Adding a New Vulnerability Challenge

When adding a new challenge, please:

1. **Map it to an OWASP category** — Reference the specific OWASP API Security Top 10 ID (e.g., A07).
2. **Include a flag** — Use the format `IDAN{DESCRIPTIVE_FLAG_NAME}`. Make it configurable via an environment variable (e.g., `A07_FLAG`).
3. **Add comments in the code** — Mark the vulnerable code with a comment like `// VULNERABILITY (A07): ...` so learners can study the source.
4. **Update the README** — Add your challenge to the Vulnerability Catalog and CTF Flags sections.
5. **Keep it realistic** — The vulnerability should resemble something that could exist in a real production codebase.

## Code Style

- **Go**: Follow standard `gofmt` formatting. Keep services minimal and dependency-free (stdlib only).
- **Python**: Follow PEP 8. Use type hints where practical.
- **TypeScript/React**: Follow the existing patterns (functional components, Tailwind CSS for styling).
- **Docker**: Keep images small. Use multi-stage builds.

## Guidelines

- Do **not** remove existing vulnerabilities or flags without discussion.
- Do **not** add real malware, credential harvesting, or anything that could cause harm outside of the local Docker environment.
- Do **not** commit secrets, API keys, or personal data (the `.env` file is gitignored).
- Keep challenges self-contained within Docker — users should only need `docker compose up` to get started.

## Reporting Unintentional Bugs

If you find a bug that is **not** one of the deliberate vulnerabilities, please open a GitHub issue with:

- Steps to reproduce
- Expected vs. actual behavior
- Which service is affected

For security-related questions about the deliberate vulnerabilities, see [SECURITY.md](SECURITY.md).

## Questions?

Open a GitHub issue or reach out to the maintainer at [akintunero101@gmail.com](mailto:akintunero101@gmail.com).
