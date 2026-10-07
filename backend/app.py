"""AegisMind: Autonomous Ambient Chief of Staff — FastAPI backend."""

import asyncio
import json
import os
import re
import threading
import time
import uuid
from collections import deque
from contextlib import asynccontextmanager
from itertools import count
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

try:
    from .auth import current_user, init_db, router as auth_router
except ImportError:  # running as top-level `app` from backend/
    from auth import current_user, init_db, router as auth_router

APP_DIR = Path(__file__).parent
DIST_DIR = APP_DIR.parent / "frontend" / "dist"

DIM = 384
MODEL = "BAAI/bge-small-en-v1.5"
COLLECTION = os.getenv("QDRANT_COLLECTION", "voice_memory")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")
QDRANT_PATH = os.getenv("QDRANT_PATH", "./qdrant_data")
LYZR_URL = "https://agent-prod.studio.lyzr.ai/v3/inference/chat/"
LYZR_API_KEY = os.getenv("LYZR_API_KEY", "")
LYZR_AGENT_ID = os.getenv("LYZR_AGENT_ID", "")
LYZR_USER_ID = os.getenv("LYZR_USER_ID", "aegismind-user")
OMI_APP_ID = os.getenv("OMI_APP_ID", "")
OMI_APP_SECRET = os.getenv("OMI_APP_SECRET", "")
OMI_NOTIFY_URL = "https://api.omi.me/v2/integrations/{app_id}/notification"

WORKERS = {
    "commitment": "CommitmentTracker",
    "conflict": "ConflictResolver",
    "decision": "DecisionLedger",
    "general": "AmbientRecall",
}

WORKER_AGENT_IDS = {
    "commitment": os.getenv("LYZR_COMMITMENT_AGENT_ID", ""),
    "conflict": os.getenv("LYZR_CONFLICT_AGENT_ID", ""),
    "decision": os.getenv("LYZR_DECISION_AGENT_ID", ""),
    "general": os.getenv("LYZR_RECALL_AGENT_ID", ""),
}

WORKER_PROMPTS = {
    "commitment": (
        "You are CommitmentTracker, a specialized AegisMind worker. "
        "Extract the promise, owner, and deadline in one short line. If none, say NO ACTION."
    ),
    "conflict": (
        "You are ConflictResolver. Name the contradiction in one short line "
        "(who vs who, what vs what). If none, say NO ACTION."
    ),
    "decision": (
        "You are DecisionLedger. Record the decision and who made it in one short line. "
        "If none, say NO ACTION."
    ),
    "general": (
        "You are AmbientRecall. Index this memory with a one-line title. "
        "Do not invent facts."
    ),
}

# ---------------------------------------------------------------- event bus

EVENTS: deque[dict] = deque(maxlen=500)
SUBS: list[asyncio.Queue] = []
_ids = count(1)
_loop: asyncio.AbstractEventLoop | None = None


def emit(stage: str, message: str, level: str = "info", **data) -> dict:
    ev = {"id": next(_ids), "ts": time.time(), "stage": stage, "message": message, "level": level}
    ev.update(data)
    EVENTS.append(ev)
    if _loop is not None:
        for q in list(SUBS):
            _loop.call_soon_threadsafe(q.put_nowait, ev)
    return ev


# ---------------------------------------------------------------- qdrant

_qdrant = None
_qdrant_mode = "init"
_qdrant_lock = threading.Lock()


def get_qdrant():
    global _qdrant, _qdrant_mode
    if _qdrant is not None:
        return _qdrant
    with _qdrant_lock:
        if _qdrant is not None:
            return _qdrant
        try:
            from qdrant_client import QdrantClient

            kwargs = {"url": QDRANT_URL, "timeout": 3}
            if QDRANT_API_KEY:
                kwargs["api_key"] = QDRANT_API_KEY
            remote = QdrantClient(**kwargs)
            remote.get_collections()
            _qdrant, _qdrant_mode = remote, ("remote:" + QDRANT_URL)
        except Exception:
            from qdrant_client import QdrantClient

            _qdrant, _qdrant_mode = QdrantClient(path=QDRANT_PATH), ("embedded:" + QDRANT_PATH)
        from qdrant_client.http import models as qm

        if not _qdrant.collection_exists(COLLECTION):
            _qdrant.create_collection(
                collection_name=COLLECTION,
                vectors_config=qm.VectorParams(size=DIM, distance=qm.Distance.COSINE),
            )
    return _qdrant


_embedder = None
_embedder_lock = threading.Lock()


def embed_texts(texts: list[str]) -> list[list[float]]:
    global _embedder
    from fastembed import TextEmbedding

    if _embedder is None:
        with _embedder_lock:
            if _embedder is None:
                _embedder = TextEmbedding(model_name=MODEL)
    return [[float(x) for x in v] for v in _embedder.embed(texts)]


# ---------------------------------------------------------------- classification

# ponytail: heuristic entity/category extraction; swap for an LLM NER pass if accuracy matters
_WORD = re.compile(r"\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b")
_STOP = {
    "I", "The", "We", "Okay", "Ok", "So", "Hey", "Hi", "Yes", "No", "And", "But",
    "Let", "It", "That", "This", "Today", "Tomorrow", "Well", "Right", "Actually",
    "AegisMind", "Umm", "Um", "Yeah", "Okay", "Hey", "Now", "Then", "If",
}
_CAT_KEYS = {
    "commitment": ["will ", "shall ", "need to", "must ", "deadline", "promise", "going to", "remind", "by friday", "by tomorrow", "send you", "due "],
    "conflict": [" but ", "however", "disagree", "conflict", "cancel", "instead", "delay", "push back", "blocked", "unfortunately", "clash", "postpone"],
    "decision": ["decided", "agreed", "final", "confirmed", "approved", "let's go", "go with", "chosen", "settled", "resolved to"],
}


def classify(text: str):
    low = " " + text.lower() + " "
    scores = {c: sum(low.count(k) for k in keys) for c, keys in _CAT_KEYS.items()}
    category = max(scores, key=scores.get) if max(scores.values()) > 0 else "general"

    words = _WORD.findall(text)
    # prefer named tokens that are not sentence-start filler
    named = [w for w in words if w not in _STOP]
    entity = "general"
    if named:
        counts: dict[str, int] = {}
        for w in named:
            counts[w] = counts.get(w, 0) + 1
        entity = max(counts, key=counts.get)
    return category, entity


# ---------------------------------------------------------------- lyzr

def _flatten_response(data) -> str:
    if isinstance(data, str):
        return data.strip()
    if isinstance(data, dict):
        for key in ("response", "output", "answer", "text", "result", "message", "content"):
            if key in data:
                out = _flatten_response(data[key])
                if out:
                    return out
        for v in data.values():
            out = _flatten_response(v)
            if out:
                return out
    if isinstance(data, list):
        for v in data:
            out = _flatten_response(v)
            if out:
                return out
    return ""


async def lyzr_chat(message: str, session_id: str, agent_id: str | None = None, user_id: str | None = None) -> tuple[str, str]:
    """Returns (reply, mode) where mode is 'live' or 'fallback'."""
    aid = (agent_id or LYZR_AGENT_ID or "").strip()
    if not (LYZR_API_KEY and aid):
        return "", "fallback"
    payload = {
        "user_id": user_id or LYZR_USER_ID,
        "agent_id": aid,
        "session_id": session_id,
        "message": message,
        "system_prompt_variables": {},
        "filter_variables": {},
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                LYZR_URL,
                json=payload,
                headers={"x-api-key": LYZR_API_KEY, "Content-Type": "application/json"},
            )
            r.raise_for_status()
            return _flatten_response(r.json()), "live"
    except Exception as e:
        emit("LYZR_MANAGER_AGENT", f"Lyzr call failed ({type(e).__name__}: {e}) — using grounded local fallback", level="warn")
        return "", "fallback"


def grounded_fallback(context: list[dict], question: str, pending: list[dict]) -> str:
    stop = {"the", "a", "an", "is", "are", "was", "what", "who", "when", "where", "why", "how", "do", "does", "did", "for", "and", "or", "of", "to", "in", "on", "my", "me", "i", "we", "you", "about", "any"}
    q_tokens = {t for t in re.findall(r"[a-z0-9']+", question.lower()) if t not in stop}
    scored = []
    for h in context:
        text = h["text"]
        hits = sum(1 for t in q_tokens if t in text.lower())
        scored.append((hits, h))
    scored.sort(key=lambda x: x[0], reverse=True)
    top = [h for n, h in scored[:3] if n > 0] or [h for _, h in scored[:2]]
    if not top:
        return f"No memories indexed yet for this session. Simulate a voice segment to build context."
    lines = [f"\u2022 {h['text']} ({h['category']}, {h['entity']}, {h['status']})" for h in top]
    head = f"Grounded recall over {len(top)} memory point(s):"
    pend = ""
    if pending:
        pend = f"\n\nOpen action items: " + "; ".join(p['text'][:90] for p in pending)
    return head + "\n" + "\n".join(lines) + pend


# ---------------------------------------------------------------- pipeline

async def run_ingest(
    uid: str,
    text: str,
    source: str,
    overview: str = "",
    speaker: str = "",
    session_id: str = "",
    title: str = "",
    started_at: float | None = None,
    is_user: bool | None = None,
    force_category: str | None = None,
):
    run_id = uuid.uuid4().hex[:8]
    try:
        emit("OMI_INGEST", f"Omi webhook received ({source}) uid={uid} \u2014 \"{text[:90]}\"",
             uid=uid, source=source, text=text, overview=overview, speaker=speaker, session_id=session_id, run_id=run_id)
        vector = (await asyncio.to_thread(embed_texts, [text]))[0]
        emit("EMBEDDING_384D", f"fastembed {MODEL} produced {len(vector)}-dim vector", dim=len(vector), model=MODEL, run_id=run_id)

        category, entity = classify(text)
        if force_category:
            category = force_category
        from qdrant_client.http import models as qm

        point_id = str(uuid.uuid4())
        payload = {
            "uid": uid,
            "text": text,
            "entity": entity,
            "category": category,
            "topic": title or overview[:80] or entity,
            "ts": started_at or time.time(),
            "status": "pending" if category == "commitment" else "resolved",
            "source": source,
            "speaker": speaker or "unknown",
            "session_id": session_id,
            "is_user": is_user,
        }
        point = qm.PointStruct(id=point_id, vector=vector, payload=payload)

        def _upsert():
            client = get_qdrant()
            client.upsert(collection_name=COLLECTION, points=[point], wait=True)
            return client

        await asyncio.to_thread(_upsert)
        emit("QDRANT_UPSERT", f"Point {point_id[:8]}\u2026 upserted into '{COLLECTION}' \u2014 entity={entity}, category={category}, status={payload['status']}",
             point_id=point_id, entity=entity, category=category, status=payload["status"], uid=uid, run_id=run_id)

        await manager_review(text, category, entity, uid, point_id, run_id)
    except Exception as e:
        emit("ACTION_TAKEN", f"Ingest pipeline failed: {type(e).__name__}: {e}", level="error", run_id=run_id)


async def manager_review(text: str, category: str, entity: str, uid: str, point_id: str, run_id: str = ""):
    worker = WORKERS.get(category, WORKERS["general"])
    worker_id = WORKER_AGENT_IDS.get(category) or LYZR_AGENT_ID
    emit("LYZR_MANAGER_AGENT",
         f"Manager Agent parsed new memory \u2014 category={category}, entity={entity}, routing decision: {worker}",
         worker=worker, category=category, entity=entity, run_id=run_id, uid=uid)

    route_prompt = (
        "You are the Manager Agent of AegisMind. A new voice memory arrived. "
        "Reply with exactly one worker name: CommitmentTracker, ConflictResolver, DecisionLedger, or AmbientRecall.\n\n"
        f"Memory: \"{text}\"\nHeuristic category: {category}\nEntity: {entity}"
    )
    route_reply, manager_mode = await lyzr_chat(route_prompt, session_id=f"manager-{uid}", user_id=uid)
    low = (route_reply or "").lower()
    for key, name in WORKERS.items():
        if name.lower() in low:
            category = key
            worker = name
            worker_id = WORKER_AGENT_IDS.get(key) or LYZR_AGENT_ID
            break

    emit("WORKER_AGENT_DISPATCH",
         f"Manager delegated to worker [{worker}] (Lyzr agent_id={worker_id or 'local-fallback'}) \u2014 manager_mode={manager_mode}",
         worker=worker, mode=manager_mode, run_id=run_id, uid=uid)

    worker_prompt = (
        f"{WORKER_PROMPTS.get(category, WORKER_PROMPTS['general'])}\n\n"
        f"Memory: \"{text}\"\nEntity: {entity}\nCategory: {category}"
    )
    reply, mode = await lyzr_chat(
        worker_prompt, session_id=f"worker-{category}-{uid}", agent_id=worker_id or None, user_id=uid
    )
    action = reply or (
        "NO ACTION — indexed for recall" if category == "general"
        else f"{worker} tracking '{entity}' as {category}"
    )
    emit("ACTION_TAKEN", f"[{worker}] {action}", worker=worker, mode=mode, point_id=point_id, run_id=run_id, uid=uid)
    await notify_omi(uid, f"AegisMind [{worker}]: {action[:220]}")


async def notify_omi(uid: str, message: str):
    """Close the loop: push the agent result back to the wearer. No-op without app credentials."""
    if not (OMI_APP_ID and OMI_APP_SECRET and uid):
        return
    url = OMI_NOTIFY_URL.format(app_id=OMI_APP_ID)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                url,
                json={"uid": uid, "message": message},
                headers={"Authorization": f"Bearer {OMI_APP_SECRET}", "Content-Type": "application/json"},
            )
            r.raise_for_status()
        emit("OMI_NOTIFY", f"Pushed result to Omi uid={uid} — {message[:80]}")
    except Exception as e:
        emit("OMI_NOTIFY", f"Omi notification skipped ({type(e).__name__}: {e})", level="warn")


async def semantic_search(query: str, uid: str, limit: int = 6, since_ts: float | None = None, until_ts: float | None = None) -> list[dict]:
    from qdrant_client.http import models as qm

    vec = (await asyncio.to_thread(embed_texts, [query]))[0]
    must = [qm.FieldCondition(key="uid", match=qm.MatchValue(value=uid))]
    if since_ts is not None or until_ts is not None:
        rng = {}
        if since_ts is not None:
            rng["gte"] = float(since_ts)
        if until_ts is not None:
            rng["lte"] = float(until_ts)
        must.append(qm.FieldCondition(key="ts", range=qm.Range(**rng)))
    flt = qm.Filter(must=must)
    client = get_qdrant()
    hits = await asyncio.to_thread(
        lambda: client.query_points(collection_name=COLLECTION, query=vec, query_filter=flt, limit=limit, with_payload=True).points
    )
    out = []
    for h in hits:
        p = dict(h.payload or {})
        p["point_id"] = str(h.id)
        p["score"] = round(float(h.score), 4)
        out.append(p)
    return out


# ---------------------------------------------------------------- app

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _loop
    _loop = asyncio.get_running_loop()
    init_db()
    emit("SYSTEM", "AegisMind booted \u2014 attaching observers to the agent workflow", level="info")

    def warmup():
        try:
            get_qdrant()
            emit("SYSTEM", f"Qdrant ready \u2014 mode={_qdrant_mode}, collection='{COLLECTION}' ({DIM}d)", mode=_qdrant_mode)
        except Exception as e:
            emit("SYSTEM", f"Qdrant warmup failed: {e}", level="error")
        try:
            embed_texts(["warmup"])
            emit("SYSTEM", f"Embedding model ready \u2014 {MODEL} ({DIM}d)", model=MODEL)
        except Exception as e:
            emit("SYSTEM", f"Embedding model warmup failed: {e}", level="error")

    asyncio.create_task(asyncio.to_thread(warmup))
    yield


app = FastAPI(title="AegisMind", lifespan=lifespan)
app.include_router(auth_router)


def memory_uid(request: Request, fallback: str = "") -> str:
    """Qdrant scope: linked Omi uid, else account id, else the caller-supplied uid."""
    user = current_user(request)
    if user:
        return (user.get("omi_uid") or user["id"] or "").strip() or fallback
    return (fallback or "").strip()


# Guard every app API route with the session cookie; OMI webhooks stay device-facing
# (uid-scoped per spec) and the SPA shell/static assets must load before login.
# /ask stays public so the official curl loop (Omi uid → Qdrant → Lyzr) works without a session.
_PUBLIC_PREFIXES = (
    "/auth/",
    "/omi/",
    "/ask",
    "/api/status",
    "/assets",
    "/static",
    "/docs",
    "/openapi.json",
    "/favicon.ico",
    "/health",
)


@app.middleware("http")
async def auth_guard(request: Request, call_next):
    path = request.url.path
    if path != "/" and not path.startswith(_PUBLIC_PREFIXES) and current_user(request) is None:
        return JSONResponse({"detail": "Not authenticated"}, status_code=401)
    return await call_next(request)

if (DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")


@app.get("/health")
async def health():
    return {"ok": True, "service": "aegismind"}


@app.get("/omi/setup-completed")
async def omi_setup_completed():
    """Omi integration apps may poll this to confirm the webhook is live."""
    return {"is_setup_completed": True}


@app.get("/")
async def index():
    index_file = DIST_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(503, "Frontend not built — run `npm install && npm run build` in frontend/")
    return FileResponse(str(index_file))


# ---------------------------------------------------------------- omi webhooks

def _as_segments(payload) -> list[dict]:
    if payload is None:
        return []
    if isinstance(payload, list):
        return [s for s in payload if isinstance(s, dict)]
    if not isinstance(payload, dict):
        return []
    for key in ("transcript_segments", "segments", "transcript"):
        raw = payload.get(key)
        if isinstance(raw, list):
            return [s if isinstance(s, dict) else {"text": str(s)} for s in raw]
        if isinstance(raw, str) and raw.strip():
            return [{"text": raw.strip()}]
    return []


def _segments_text(segments: list[dict]) -> str:
    parts = [str(s.get("text", "")).strip() for s in segments if isinstance(s, dict) and s.get("text")]
    return " ".join(p for p in parts if p)


def _primary_speaker(segments: list[dict]) -> str:
    for s in segments:
        if isinstance(s, dict) and s.get("speaker"):
            return str(s.get("speaker"))
    return ""


def _segment_start(segments: list[dict]) -> float | None:
    starts = []
    for s in segments:
        if not isinstance(s, dict):
            continue
        for key in ("start", "started_at", "timestamp", "created_at"):
            v = s.get(key)
            if isinstance(v, (int, float)):
                starts.append(float(v))
                break
    return min(starts) if starts else None


def _is_user_flag(segments: list[dict]) -> bool | None:
    flags = [s.get("is_user") for s in segments if isinstance(s, dict) and "is_user" in s]
    if not flags:
        return None
    return bool(flags[0])


def _omi_action_items(payload) -> list[str]:
    if not isinstance(payload, dict):
        return []
    structured = payload.get("structured") or {}
    raw = structured.get("action_items") or payload.get("action_items") or []
    if not isinstance(raw, list):
        return []
    out = []
    for item in raw:
        if isinstance(item, str) and item.strip():
            out.append(item.strip())
        elif isinstance(item, dict):
            text = item.get("description") or item.get("text") or item.get("title") or ""
            if str(text).strip():
                out.append(str(text).strip())
    return out


@app.post("/omi/conversation")
async def omi_conversation(request: Request, background: BackgroundTasks, uid: str = Query("demo-user")):
    """Memory-creation trigger — return 200 immediately; slow work runs in the background."""
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    # Official Omi contract: uid comes from the query string, never a browser session.
    uid = (uid or "demo-user").strip()
    segments = _as_segments(payload)
    text = _segments_text(segments)
    structured = payload.get("structured") if isinstance(payload, dict) else {}
    overview = str((structured or {}).get("overview", "")).strip()
    title = str((structured or {}).get("title", "")).strip()
    if not text:
        text = (title + " " + overview).strip()
    speaker = _primary_speaker(segments)
    started = _segment_start(segments)
    is_user = _is_user_flag(segments)
    accepted = bool(text)
    if text:
        background.add_task(
            run_ingest,
            uid,
            text,
            "omi/conversation",
            overview=overview,
            speaker=speaker,
            title=title,
            started_at=started,
            is_user=is_user,
        )
    for item in _omi_action_items(payload):
        accepted = True
        background.add_task(
            run_ingest,
            uid,
            item,
            "omi/action_item",
            overview=overview,
            speaker=speaker,
            title=title or "action item",
            started_at=started,
            is_user=is_user,
            force_category="commitment",
        )
    if not accepted:
        emit("OMI_INGEST", f"Empty conversation payload from uid={uid} — ignored", level="warn")
    return {"status": "ok", "accepted": accepted, "uid": uid}


@app.post("/omi/realtime")
async def omi_realtime(
    request: Request,
    background: BackgroundTasks,
    uid: str = Query("demo-user"),
    session_id: str = Query(""),
):
    """Real-time transcript — payload may be a list of segments or `{segments: [...]}`."""
    try:
        payload = await request.json()
    except Exception:
        payload = {}
    uid = (uid or "demo-user").strip()
    if isinstance(payload, dict) and not session_id:
        session_id = str(payload.get("session_id") or "")
    segments = _as_segments(payload)
    text = _segments_text(segments)
    speaker = _primary_speaker(segments)
    if text:
        background.add_task(
            run_ingest,
            uid,
            text,
            "omi/realtime",
            speaker=speaker,
            session_id=session_id,
            started_at=_segment_start(segments),
            is_user=_is_user_flag(segments),
        )

        category, _entity = classify(text)
        if category in ("commitment", "conflict") and session_id:
            return {
                "status": "ok",
                "accepted": True,
                "uid": uid,
                "session_id": session_id,
                "notification": {
                    "prompt": (
                        "You are AegisMind. Based on {{user_name}} and {{user_context}}, "
                        f"alert them in under 40 words that this was captured: {text[:160]}"
                    ),
                    "params": ["user_name", "user_context"],
                },
            }
    else:
        emit("OMI_INGEST", f"Empty realtime payload from uid={uid} — ignored", level="warn")
    body = {"status": "ok", "accepted": bool(text), "uid": uid}
    if session_id:
        body["session_id"] = session_id
    return body


# ---------------------------------------------------------------- events / status

def _sse(ev: dict) -> str:
    return f"data: {json.dumps(ev, default=str)}\n\n"


def _event_visible(ev: dict, uid: str) -> bool:
    ev_uid = ev.get("uid")
    if not ev_uid:
        return True
    return str(ev_uid) == str(uid)


@app.get("/api/events")
async def sse_events(request: Request):
    uid = memory_uid(request)
    q: asyncio.Queue = asyncio.Queue()
    SUBS.append(q)

    async def gen():
        try:
            for ev in list(EVENTS):
                if _event_visible(ev, uid):
                    yield _sse(ev)
            last = EVENTS[-1]["id"] if EVENTS else 0
            while True:
                try:
                    ev = await asyncio.wait_for(q.get(), timeout=15)
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
                    continue
                if ev["id"] <= last:
                    continue
                last = ev["id"]
                if not _event_visible(ev, uid):
                    continue
                yield _sse(ev)
        finally:
            if q in SUBS:
                SUBS.remove(q)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@app.get("/api/logs")
async def logs(request: Request, limit: int = 200):
    uid = memory_uid(request)
    events = [e for e in EVENTS if _event_visible(e, uid)]
    return {"events": events[-limit:]}


@app.get("/api/status")
async def status():
    qdrant_state = "offline"
    mode = _qdrant_mode
    try:
        get_qdrant().get_collections()
        qdrant_state = "online"
        mode = _qdrant_mode
    except Exception as e:
        qdrant_state = f"error: {type(e).__name__}"
    last_ingest = max((e["ts"] for e in EVENTS if e["stage"] == "OMI_INGEST"), default=None)
    return {
        "omi": {"state": "listening", "last_ingest": last_ingest},
        "qdrant": {"state": qdrant_state, "mode": mode, "collection": COLLECTION, "dim": DIM},
        "lyzr": {
            "state": "live" if (LYZR_API_KEY and LYZR_AGENT_ID) else "fallback",
            "agent_id": LYZR_AGENT_ID or None,
            "endpoint": LYZR_URL,
            "workers": {k: (WORKER_AGENT_IDS.get(k) or LYZR_AGENT_ID or "local-fallback") for k in WORKERS},
        },
        "omi_notify": bool(OMI_APP_ID and OMI_APP_SECRET),
    }


# ---------------------------------------------------------------- memory vault

@app.get("/api/memory")
async def memory(request: Request, uid: str = Query("demo-user"), since_ts: float | None = Query(None), until_ts: float | None = Query(None)):
    from qdrant_client.http import models as qm

    uid = memory_uid(request, uid)
    client = get_qdrant()
    must = [qm.FieldCondition(key="uid", match=qm.MatchValue(value=uid))]
    if since_ts is not None or until_ts is not None:
        rng = {}
        if since_ts is not None:
            rng["gte"] = float(since_ts)
        if until_ts is not None:
            rng["lte"] = float(until_ts)
        must.append(qm.FieldCondition(key="ts", range=qm.Range(**rng)))
    flt = qm.Filter(must=must)
    points, _ = await asyncio.to_thread(
        lambda: client.scroll(collection_name=COLLECTION, scroll_filter=flt, limit=300, with_payload=True, with_vectors=False)
    )
    items = []
    for p in points:
        pl = dict(p.payload or {})
        items.append({
            "point_id": str(p.id),
            "text": pl.get("text", ""),
            "entity": pl.get("entity", "general"),
            "category": pl.get("category", "general"),
            "ts": pl.get("ts", 0),
            "status": pl.get("status", "resolved"),
            "uid": pl.get("uid", uid),
            "source": pl.get("source", ""),
            "speaker": pl.get("speaker", ""),
            "topic": pl.get("topic", ""),
        })
    items.sort(key=lambda x: x["ts"], reverse=True)
    return {"count": len(items), "points": items}


# ---------------------------------------------------------------- copilot + amnesia

class AskBody(BaseModel):
    question: str
    uid: str = "demo-user"
    since_ts: float | None = None
    until_ts: float | None = None


@app.post("/ask")
async def ask(body: AskBody, request: Request):
    """Official loop: retrieve from Qdrant, then Lyzr Manager + ActionItemTracker reason over CONTEXT."""
    q = body.question.strip()
    uid = memory_uid(request, body.uid)
    run_id = uuid.uuid4().hex[:8]
    emit("LYZR_MANAGER_AGENT", f"Manager Agent received executive query \u2014 \"{q}\" (uid={uid})", question=q, uid=uid, run_id=run_id)

    hits = await semantic_search(q, uid, limit=6, since_ts=body.since_ts, until_ts=body.until_ts)
    emit("QDRANT_RETRIEVAL", f"Semantic retrieval over '{COLLECTION}' returned {len(hits)} grounded memories (uid={uid})",
         found=len(hits), run_id=run_id)

    pending = [h for h in hits if h.get("status") == "pending"]
    emit("WORKER_AGENT_DISPATCH",
         f"Dispatching workers: AmbientRecall (Q&A) + CommitmentTracker (action items) over shared Qdrant memory",
         workers=["AmbientRecall", "CommitmentTracker"], pending=len(pending), run_id=run_id)

    ctx_lines = [h.get("text", "") for h in hits if h.get("text")]
    ctx = "\n".join("- " + c for c in ctx_lines) or "none"
    qa_prompt = (
        "You are a voice-memory assistant. Each message contains CONTEXT (snippets retrieved "
        "from the user's own voice memories) and a QUESTION.\n"
        "- Answer only from the CONTEXT. If the answer is not there, say so.\n"
        "- When asked, extract action items as a short bulleted list with owners and deadlines if they were spoken.\n"
        "- Keep answers short and cite which snippet you used.\n\n"
        f"CONTEXT:\n{ctx}\n\nQUESTION: {q}"
    )
    extract_prompt = (
        f"{WORKER_PROMPTS['commitment']}\n\nCONTEXT:\n{ctx}\n\n"
        "QUESTION: Extract action items with owners and deadlines if spoken. If none, say none."
    )
    worker_id = WORKER_AGENT_IDS.get("commitment") or LYZR_AGENT_ID
    (reply, mode), (actions, action_mode) = await asyncio.gather(
        lyzr_chat(qa_prompt, session_id=f"{LYZR_AGENT_ID or 'local'}-{uid}", user_id=uid),
        lyzr_chat(
            extract_prompt,
            session_id=f"worker-commitment-{uid}",
            agent_id=worker_id or None,
            user_id=uid,
        ),
    )
    if not reply:
        reply = grounded_fallback(hits, q, pending)
        mode = "fallback"
    if not actions:
        actions = "; ".join(p.get("text", "")[:90] for p in pending) or "none"

    emit("ACTION_TAKEN", f"Executive answer generated via {'Lyzr Manager Agent' if mode == 'live' else 'grounded local manager'} \u2014 {reply[:160]}",
         mode=mode, action_mode=action_mode, run_id=run_id,
         sources=[{"text": h["text"][:120], "entity": h.get("entity"), "category": h.get("category"), "score": h.get("score")} for h in hits])
    await notify_omi(uid, f"AegisMind: {reply[:220]}")
    return {
        "answer": reply,
        "context": ctx_lines,
        "sources": hits,
        "action_items": actions,
        "mode": mode,
        "pending": len(pending),
    }


class ForgetBody(BaseModel):
    uid: str = "demo-user"
    entity: str = ""
    point_id: str = ""


@app.post("/api/forget")
async def forget(body: ForgetBody, request: Request):
    from qdrant_client.http import models as qm

    uid = memory_uid(request, body.uid.strip())
    entity, point_id = body.entity.strip(), body.point_id.strip()
    if not entity and not point_id:
        raise HTTPException(400, "Provide entity or point_id")
    client = get_qdrant()
    if point_id:
        emit("AMNESIA_PURGE", f"Selective Amnesia requested — deleting point {point_id[:8]}… (uid={uid})", uid=uid)
        await asyncio.to_thread(
            lambda: client.delete(collection_name=COLLECTION, points_selector=qm.PointIdsList(points=[point_id]), wait=True)
        )
        emit("ACTION_TAKEN", f"Selective Amnesia complete — point {point_id[:8]}… purged from Qdrant", level="warn", removed=1, entity=entity or point_id, uid=uid)
        return {"status": "ok", "removed": 1, "uid": uid, "point_id": point_id}
    emit("AMNESIA_PURGE", f"Selective Amnesia requested — purging vectors where uid='{uid}' AND entity='{entity}'", uid=uid)
    variants = list({entity, entity[:1].upper() + entity[1:]})
    flt = qm.Filter(must=[
        qm.FieldCondition(key="uid", match=qm.MatchValue(value=uid)),
        qm.FieldCondition(key="entity", match=qm.MatchAny(any=variants)),
    ])
    before = (await asyncio.to_thread(lambda: client.count(collection_name=COLLECTION, count_filter=flt))).count
    await asyncio.to_thread(lambda: client.delete(collection_name=COLLECTION, points_selector=qm.FilterSelector(filter=flt), wait=True))
    removed = int(before)
    emit("ACTION_TAKEN", f"Selective Amnesia complete — {removed} vector(s) for '{entity}' purged from Qdrant", level="warn", removed=removed, entity=entity, uid=uid)
    return {"status": "ok", "removed": removed, "uid": uid, "entity": entity}
