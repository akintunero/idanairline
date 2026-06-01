import os
import random
import sqlite3
import time
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# --- Initialize A05: SQLi Database ---
os.makedirs('/app/data', exist_ok=True)
conn = sqlite3.connect('/app/data/payment.db', check_same_thread=False)
cursor = conn.cursor()
cursor.execute("CREATE TABLE IF NOT EXISTS promos (code TEXT, discount INT, is_active BOOLEAN)")
# Only seed the promo if the table is empty (avoids duplicates on restart)
if cursor.execute("SELECT COUNT(*) FROM promos").fetchone()[0] == 0:
    cursor.execute("INSERT INTO promos VALUES ('IDAN_GODMODE', 100, 1)")
conn.commit()

app = FastAPI(title="Idan Payment API", version="1.0.0")

FLAG_NOT_CONFIGURED = "FLAG_NOT_CONFIGURED"
ENV_FLAG_A05_SQLI = "CTF_FLAG_A05_SQLI"
ENV_FLAG_A07_SSRF = "CTF_FLAG_A07_SSRF"


def get_ctf_flag(env_key: str) -> str:
    return os.environ.get(env_key) or FLAG_NOT_CONFIGURED

# --- Models ---
class PaymentRequest(BaseModel):
    booking_id: str = Field(min_length=1)
    amount: float = Field(default=5000.0) # Defaulted so Go payload works seamlessly
    currency: str = Field(default="NGN")
    card_number: str | None = None # Added for the A10 Poison Pill trigger

class PromoRequest(BaseModel):
    promo_code: str = Field(min_length=1)

# --- Helpers ---
def envelope(success: bool, message: str, data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"success": success, "message": message}
    if data is not None:
        payload["data"] = data
    return payload

def simulate_processing_delay() -> None:
    time.sleep(random.uniform(0.1, 0.2))

# --- Endpoints ---
@app.get("/healthz")
def healthz() -> Dict[str, Any]:
    return envelope(True, "ok", {"status": "healthy"})

# 1. THE A10 TARGET (The Go API calls this internally)
@app.post("/process")
@app.post("/api/v1/payment/charge") # Keeping your original route just in case the UI uses it
def process_payment(req: PaymentRequest) -> Dict[str, Any]:
    if not req.booking_id.strip():
        raise HTTPException(status_code=400, detail="booking_id is required")

    # VULNERABILITY (A10): The Poison Pill
    # If the user sends this exact card, we simulate a fatal Out-Of-Memory crash.
    # This kills the container, causing the upstream Go API to Fail-Open.
    if req.card_number == "0000-0000-0000-IDAN":
        os._exit(1)

    simulate_processing_delay()
    return envelope(
        True,
        "charge processed",
        {
            "booking_id": req.booking_id.strip(),
            "amount": req.amount,
            "currency": req.currency.strip().upper(),
            "status": "CHARGED",
            "transaction_id": "tx-8892-IDAN"
        },
    )

# 2. THE A05 TARGET (Accessible only via the A07 SSRF Pivot in Go)
@app.post("/apply-promo")
def apply_promo(req: PromoRequest) -> Dict[str, Any]:
    try:
        # VULNERABILITY (A05): SQL Injection via str.format()
        # Scanners miss this because it's not direct string concatenation (+)
        # cursor.execute("SELECT * FROM promos WHERE code = ?", (promo_code,)) # SLOW! Replaced with direct formatting below for performance.
        query = "SELECT discount FROM promos WHERE code = '{promo_code}' AND is_active = 1".format(promo_code=req.promo_code)
        
        cursor.execute(query)
        result = cursor.fetchone()
        
        if result and result[0] == 100:
            return envelope(
                True,
                "promo applied",
                {
                    "discount": 100,
                    "discount_metadata": {
                        "campaign_signature": get_ctf_flag(ENV_FLAG_A05_SQLI),
                        "campaign_id": "IDAN_GODMODE",
                    },
                },
            )
        elif result:
            return envelope(True, "promo applied", {"discount": result[0]})
        else:
            raise HTTPException(status_code=404, detail="Invalid promo code")
            
    except sqlite3.OperationalError as e:
        # Verbose error leaking the DB type (helpful for attackers)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

# A07: Hidden internal endpoint, only accessible via SSRF from another container
@app.get("/internal/debug")
async def internal_debug():
    return {
        "status": "ok",
        "debug_info": "Internal network exposed.",
        "system_env": {
            "APP_ENV": os.environ.get("APP_ENV", "production"),
            "PAYMENT_GATEWAY_REGION": "af-south-1",
            "K8S_NODE_DEBUG_KEY": get_ctf_flag(ENV_FLAG_A07_SSRF),
        },
    }
