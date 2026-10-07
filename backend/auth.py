"""Auth for AegisMind — MongoDB Atlas users + HMAC-signed session cookies."""

import base64
import hashlib
import hmac
import json
import os
import re
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field
import pymongo
from pymongo.errors import DuplicateKeyError

DATA_DIR = Path(os.getenv("AEGIS_DATA_DIR", str(Path(__file__).resolve().parent.parent / "data")))
DATA_DIR.mkdir(parents=True, exist_ok=True)
SECRET_FILE = DATA_DIR / ".secret_key"

DB_NAME = "aegismind"
COLLECTION = "users"

_client: pymongo.MongoClient | None = None
_users = None


def _db_users():
    """Lazy Mongo client — connects to MONGODB_URI or defaults to mongodb://localhost:27017."""
    global _client, _users
    if _users is None:
        uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017").strip()
        _client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=3000)
        _users = _client[DB_NAME][COLLECTION]
    return _users

SESSION_COOKIE = "session"
SESSION_TTL = 60 * 60 * 24 * 7  # 7 days
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _secret() -> bytes:
    env = os.getenv("SECRET_KEY", "").strip()
    if env:
        return env.encode()
    if not SECRET_FILE.exists():
        SECRET_FILE.write_text(uuid.uuid4().hex + uuid.uuid4().hex)
        SECRET_FILE.chmod(0o600)
    return SECRET_FILE.read_text().strip().encode()


SECRET = _secret()


def init_db() -> None:
    try:
        _db_users().create_index("email", unique=True)
    except Exception as e:
        print(f"[aegismind] MongoDB unavailable ({e}) — Omi/Qdrant/Lyzr loop still runs; login/signup disabled.")


def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000).hex()


# ---------------------------------------------------------------- session tokens

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def create_session(user_id: str) -> str:
    payload = _b64(json.dumps({"uid": user_id, "exp": int(time.time()) + SESSION_TTL}).encode())
    sig = hmac.new(SECRET, payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"


def parse_session(token: str | None) -> str | None:
    """Returns user_id if the token is valid and unexpired, else None."""
    if not token or "." not in token:
        return None
    payload, sig = token.rsplit(".", 1)
    expected = hmac.new(SECRET, payload.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, expected):
        return None
    try:
        data = json.loads(_unb64(payload))
    except Exception:
        return None
    if int(data.get("exp", 0)) < time.time():
        return None
    return data.get("uid")


def current_user(request: Request) -> dict | None:
    uid = parse_session(request.cookies.get(SESSION_COOKIE))
    if not uid:
        return None
    try:
        doc = _db_users().find_one({"_id": uid}, {"pw_hash": 0, "salt": 0})
    except Exception:
        return None
    return _user_payload(doc) if doc else None


# ---------------------------------------------------------------- routes

class SignupBody(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)


class LoginBody(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=1, max_length=128)


def _set_cookie(response: Response, request: Request, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_TTL,
        httponly=True,
        samesite="lax",
        secure=request.url.scheme == "https",
        path="/",
    )


def _user_payload(doc: dict) -> dict:
    return {
        "id": doc["_id"],
        "name": doc["name"],
        "email": doc["email"],
        "omi_uid": str(doc.get("omi_uid") or ""),
    }


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup")
def signup(body: SignupBody, request: Request, response: Response):
    email = body.email.strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "Enter a valid email address")
    salt = uuid.uuid4().hex
    uid = uuid.uuid4().hex
    try:
        _db_users().insert_one(
            {
                "_id": uid,
                "name": body.name.strip(),
                "email": email,
                "pw_hash": _hash_password(body.password, salt),
                "salt": salt,
                "created_at": time.time(),
            }
        )
    except DuplicateKeyError:
        raise HTTPException(409, "An account with this email already exists")
    _set_cookie(response, request, create_session(uid))
    return _user_payload({"_id": uid, "name": body.name.strip(), "email": email, "omi_uid": ""})


@router.post("/login")
def login(body: LoginBody, request: Request, response: Response):
    email = body.email.strip().lower()
    doc = _db_users().find_one({"email": email})
    if not doc or not hmac.compare_digest(_hash_password(body.password, doc["salt"]), doc["pw_hash"]):
        raise HTTPException(401, "Invalid email or password")
    _set_cookie(response, request, create_session(doc["_id"]))
    return _user_payload(doc)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"status": "ok"}


class ProfileBody(BaseModel):
    omi_uid: str = Field("", max_length=128)


@router.get("/me")
def me(request: Request):
    user = current_user(request)
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user


@router.patch("/me")
def update_me(body: ProfileBody, request: Request):
    user = current_user(request)
    if not user:
        raise HTTPException(401, "Not authenticated")
    omi_uid = body.omi_uid.strip()
    _db_users().update_one({"_id": user["id"]}, {"$set": {"omi_uid": omi_uid}})
    user["omi_uid"] = omi_uid
    return user
