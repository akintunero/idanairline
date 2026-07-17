import os
import random
import sqlite3
import time
from typing import Any, Dict
from xml.etree import ElementTree

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

os.makedirs('/app/data', exist_ok=True)
conn = sqlite3.connect('/app/data/payment.db', check_same_thread=False)
cursor = conn.cursor()
cursor.execute("CREATE TABLE IF NOT EXISTS promos (code TEXT, discount INT, is_active BOOLEAN)")

promo_code = os.environ.get("PROMO_CODE_GODMODE", "")
if promo_code:
    cursor.execute("DELETE FROM promos")
    cursor.execute("INSERT INTO promos VALUES (?, 100, 1)", (promo_code,))
    conn.commit()

app = FastAPI(title="Idan Payment API", version="1.0.0")


def env_flag(key: str) -> str:
    return os.environ.get(key, "")


class PaymentRequest(BaseModel):
    booking_id: str = Field(min_length=1)
    amount: float = Field(default=5000.0)
    currency: str = Field(default="NGN")
    card_number: str | None = None


class PromoRequest(BaseModel):
    promo_code: str = Field(min_length=1)


class FareQuoteXMLRequest(BaseModel):
    body: str


def envelope(success: bool, message: str, data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {"success": success, "message": message}
    if data is not None:
        payload["data"] = data
    return payload


def simulate_processing_delay() -> None:
    time.sleep(random.uniform(0.1, 0.2))


@app.get("/healthz")
def healthz() -> Dict[str, Any]:
    return envelope(True, "ok", {"status": "healthy"})


@app.post("/process")
@app.post("/api/v1/payment/charge")
def process_payment(req: PaymentRequest) -> Dict[str, Any]:
    if not req.booking_id.strip():
        raise HTTPException(status_code=400, detail="booking_id is required")

    poison_card = os.environ.get("POISON_PILL_CARD", "")
    if poison_card and req.card_number == poison_card:
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
            "transaction_id": f"tx-{random.randint(1000, 9999)}-IDAN",
        },
    )


@app.post("/apply-promo")
def apply_promo(req: PromoRequest) -> Dict[str, Any]:
    try:
        query = "SELECT discount FROM promos WHERE code = '{promo_code}' AND is_active = 1".format(
            promo_code=req.promo_code
        )

        cursor.execute(query)
        result = cursor.fetchone()

        if result and result[0] == 100:
            data = {
                "discount": 100,
                "discount_metadata": {
                    "campaign_id": "GODMODE",
                },
            }
            # Flag extracted via UNION SELECT — appears as internal vault key
            flag = env_flag("CTF_FLAG_A05_SQLI")
            if flag:
                data["internal_vault_key"] = flag
            return envelope(True, "promo applied", data)
        elif result:
            return envelope(True, "promo applied", {"discount": result[0]})
        else:
            raise HTTPException(status_code=404, detail="Invalid promo code")

    except sqlite3.OperationalError as e:
        raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")


@app.get("/internal/debug")
async def internal_debug():
    flag = env_flag("CTF_FLAG_A07_SSRF")
    env_info = {
        "APP_ENV": os.environ.get("APP_ENV", "production"),
        "PAYMENT_GATEWAY_REGION": "af-south-1",
    }
    if flag:
        env_info["cloud_environment"] = {"secrets_store_path": flag}
    return {
        "status": "ok",
        "debug_info": "Internal network exposed.",
        "system_env": env_info,
    }


@app.post("/api/v1/payment/fare-quote")
async def fare_quote(request: Request):
    body = await request.body()

    try:
        parser = ElementTree.XMLParser(resolve_entities=True)
        root = ElementTree.fromstring(body, parser=parser)

        currency = root.findtext("currency", "USD")
        amount = root.findtext("amount", "0")

        flag = env_flag("CTF_FLAG_A18_XXE")
        if ("FLAG" in amount.upper() or "CTF" in amount.upper()) and flag:
            return {
                "status": "quoted",
                "currency": currency,
                "amount": amount,
                "note": "Corporate fare quoted with external reference data. File contents reflected.",
            }

        return {
            "status": "quoted",
            "currency": currency,
            "amount": amount,
            "note": "Standard fare quoted.",
        }

    except ElementTree.ParseError as e:
        raise HTTPException(status_code=400, detail=f"XML Parse Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing Error: {str(e)}")
