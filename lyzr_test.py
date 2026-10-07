"""Smoke-test the Lyzr chat API used by AegisMind (official hackathon endpoint)."""

import os

import httpx
from dotenv import load_dotenv

load_dotenv()

r = httpx.post(
    "https://agent-prod.studio.lyzr.ai/v3/inference/chat/",
    headers={"Content-Type": "application/json", "x-api-key": os.environ["LYZR_API_KEY"]},
    json={
        "user_id": os.getenv("LYZR_USER_ID", "you@example.com"),
        "agent_id": os.environ["LYZR_AGENT_ID"],
        "session_id": "test-session-1",
        "message": "CONTEXT: none\nQUESTION: Say hello.",
    },
    timeout=60,
)
data = r.json()
print(data.get("response", data))
