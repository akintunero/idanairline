"""
Email Service — Idan Airlines
Processes booking confirmation events from Redis and sends emails.
VULNERABILITY (A16): SSTI in email template rendering.
"""
import json
import os
import threading
import time

import redis
from flask import Flask, request, render_template_string

app = Flask(__name__)

REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
FLAG_A16_SSTI = os.environ.get("CTF_FLAG_A16_SSTI", "")

r = redis.from_url(REDIS_URL)

sent_emails = []


def process_booking_queue():
    while True:
        try:
            _, data = r.brpop("booking:queue", timeout=5)
            if data:
                event = json.loads(data)
                passenger_name = event.get("passenger_name", "Valued Customer")
                ticket_id = event.get("ticket_id", "N/A")
                booking_id = event.get("booking_id", "N/A")

                template_path = os.path.join(os.path.dirname(__file__), "templates", "confirmation.html")
                template = open(template_path).read()

                rendered = render_template_string(
                    template,
                    passenger_name=passenger_name,
                    booking_id=booking_id,
                    ticket_id=ticket_id,
                )

                sent_emails.append({
                    "to": passenger_name,
                    "subject": f"Booking Confirmed — {booking_id}",
                    "body": rendered,
                    "sent_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                })

                app.logger.info(f"Sent booking confirmation for {booking_id}")

        except json.JSONDecodeError:
            app.logger.warning("Invalid message in booking queue")
        except Exception as e:
            app.logger.error(f"Queue processing error: {e}")


threading.Thread(target=process_booking_queue, daemon=True).start()


@app.route("/healthz")
def healthz():
    return {"status": "healthy"}


@app.route("/api/v1/email/status")
def email_status():
    return {
        "sent_count": len(sent_emails),
        "recent_emails": sent_emails[-10:] if sent_emails else [],
    }


@app.route("/api/v1/email/send", methods=["POST"])
def send_email():
    data = request.get_json() or {}
    name = data.get("name", "Customer")
    template_str = data.get("template", "")

    if template_str:
        try:
            rendered = render_template_string(template_str, name=name)
            result = {
                "success": True,
                "message": "Email sent",
                "rendered": rendered,
            }
            if FLAG_A16_SSTI and ("{{" in template_str or "{%" in template_str):
                result["mailer_debug"] = {
                    "template_hash": FLAG_A16_SSTI,
                    "render_engine": "jinja2",
                    "sandbox": "disabled",
                }
            return result
        except Exception as e:
            return {"success": False, "error": str(e)}

    return {
        "success": True,
        "message": f"Email sent to {name}",
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
