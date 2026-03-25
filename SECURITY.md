# Security Policy

## ⚠️ This Application Is Intentionally Vulnerable

**Idan Airlines is a Capture The Flag (CTF) challenge designed for educational purposes.** The vulnerabilities in this application are **deliberate** and exist to teach developers and security researchers about common API security flaws.

## What NOT to Report

Please **do not** open security issues or CVEs for any of the following — they are intentional:

- SQL injection in the payment promo endpoint (OWASP A05)
- Broken Object Level Authorization in the booking itinerary endpoint (OWASP A01)
- Fail-open logic / poison pill crash in the payment service (OWASP A10)
- Hardcoded credentials in the user API
- Plaintext password storage
- Unsigned / mock JWT tokens
- Missing rate limiting
- Verbose error messages leaking internal details
- Any other vulnerability documented in the [README](README.md)

## What to Report

If you discover a vulnerability that is:

- **Unintentional** (i.e., not part of the CTF challenges documented in the README)
- A flaw in the Docker/infrastructure setup that could affect a user's host machine
- A dependency vulnerability that could be exploited during `npm install` or `docker build`

Please report it by emailing **[akintunero101@gmail.com](mailto:akintunero101@gmail.com)** with:

1. A description of the issue
2. Steps to reproduce
3. Potential impact

## Responsible Use

This software must only be used in **isolated, local environments** for learning purposes. Do not:

- Deploy to any internet-facing server
- Use against systems you do not own or have explicit permission to test
- Modify the application to cause harm to others

The maintainer is not responsible for any misuse of this software.
