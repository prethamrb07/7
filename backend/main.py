"""
Pehchan — FastAPI Backend Server

Connects to Omi smart glasses via webhooks and serves data to the React dashboard.

Endpoints:
  Webhooks (receive from Omi):
    POST /webhooks/memory      — Triggered when a conversation ends
    POST /webhooks/realtime    — Triggered with live speech segments

  REST API (serve to React dashboard):
    GET  /api/activities       — Activity timeline
    GET  /api/alerts           — Alert history
    GET  /api/stats            — Dashboard statistics
    GET  /api/conversations    — Conversation history
    POST /api/alerts/{id}/resolve — Resolve an alert

  WebSocket:
    WS   /ws/live              — Real-time updates to dashboard

  Test:
    POST /test/distress        — Simulate a distress event
    POST /test/memory          — Simulate a memory creation
"""

import os
import json
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from models import (
    OmiMemoryPayload,
    OmiRealtimePayload,
    ActivityEvent,
    Alert,
    TranscriptSegment,
)
from database import (
    init_db,
    add_activity,
    add_alert,
    save_conversation,
    get_activities,
    get_alerts,
    get_dashboard_stats,
    resolve_alert,
)
from analyzer import (
    analyze_transcript,
    analyze_memory,
    classify_conversation,
    get_icon_for_type,
)
from notifier import notify_caregiver, notify_from_analysis, format_daily_summary

load_dotenv()

# ======================================
# WebSocket Manager for live updates
# ======================================

class ConnectionManager:
    """Manages WebSocket connections for real-time dashboard updates."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"📡 Dashboard connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"📡 Dashboard disconnected. Active: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Send update to all connected dashboards."""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


# ======================================
# App Lifecycle
# ======================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print("\n🧠 Pehchan Backend — Online")
    print("   Waiting for Omi webhook events...\n")
    yield
    print("\n🧠 Pehchan Backend — Shutting down\n")


# ======================================
# FastAPI App
# ======================================

app = FastAPI(
    title="Pehchan API",
    description="AI companion backend for Alzheimer's patients using Omi smart glasses",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ======================================
# WEBHOOK ENDPOINTS (receive from Omi)
# ======================================

@app.post("/webhooks/memory")
async def webhook_memory(request: Request, uid: str = Query(default="")):
    """
    Omi Memory Creation Webhook.

    Triggered when a conversation ends and Omi creates a memory.
    We analyze the conversation, log it, and send alerts if needed.
    """
    body = await request.json()
    print(f"\n📩 Memory webhook received (uid: {uid})")

    # Parse the memory payload
    try:
        memory = OmiMemoryPayload(**body) if isinstance(body, dict) else OmiMemoryPayload()
    except Exception:
        memory = OmiMemoryPayload()

    # Skip discarded memories
    if memory.discarded:
        print("   ⏭️ Discarded memory — skipping")
        return {"status": "skipped", "reason": "discarded"}

    # Save conversation to database
    await save_conversation(body if isinstance(body, dict) else {})

    # Analyze the content
    structured = memory.structured or type('S', (), {'title': None, 'overview': None})()
    title = getattr(structured, 'title', None) or "Conversation"
    overview = getattr(structured, 'overview', None) or ""
    transcript = memory.transcript or ""

    analysis = analyze_memory(title, overview, transcript)
    event_type = classify_conversation(title, overview)
    icon = get_icon_for_type(event_type)

    # Create activity event
    activity = ActivityEvent(
        timestamp=memory.created_at or datetime.now().isoformat(),
        event_type=event_type,
        title=title,
        description=overview or f"Conversation processed: {title}",
        icon=icon,
        severity="warning" if analysis.is_confused else ("success" if not analysis.is_distressed else "warning"),
        source="omi",
        omi_memory_id=memory.id,
    )
    activity_id = await add_activity(activity)
    print(f"   ✅ Activity logged: {title} (id: {activity_id})")

    # If concerning, create alert
    if analysis.is_distressed or analysis.is_confused:
        alert = await notify_from_analysis(analysis, transcript[:200])
        if alert:
            alert_id = await add_alert(alert)
            print(f"   🚨 Alert created (id: {alert_id})")

            # Broadcast to connected dashboards
            await manager.broadcast({
                "type": "alert",
                "data": alert.model_dump(),
            })

    # Broadcast activity to dashboards
    await manager.broadcast({
        "type": "activity",
        "data": activity.model_dump(),
    })

    return {"status": "ok", "activity_id": activity_id}


@app.post("/webhooks/realtime")
async def webhook_realtime(request: Request, uid: str = Query(default="")):
    """
    Omi Real-Time Transcript Webhook.

    Triggered as the patient speaks. We analyze each segment for
    distress signals and confusion indicators in real time.
    """
    body = await request.json()

    # Handle both list of segments and wrapped payload
    segments = []
    if isinstance(body, list):
        segments = body
    elif isinstance(body, dict):
        segments = body.get("segments", [body])

    for seg_data in segments:
        text = seg_data.get("text", "") if isinstance(seg_data, dict) else str(seg_data)
        if not text.strip():
            continue

        print(f"🎤 Realtime: \"{text[:80]}...\"" if len(text) > 80 else f"🎤 Realtime: \"{text}\"")

        # Analyze the segment
        analysis = analyze_transcript(text)

        if analysis.is_distressed or analysis.is_confused:
            # Create immediate alert
            alert = await notify_from_analysis(analysis, text)
            if alert:
                alert_id = await add_alert(alert)

                # Create activity event
                activity = ActivityEvent(
                    event_type="distress" if analysis.is_distressed else "context",
                    title="Distress detected" if analysis.is_distressed else "Confusion detected",
                    description=f'Patient said: "{text[:200]}"',
                    icon="🆘" if analysis.is_distressed else "📍",
                    severity="warning",
                    source="omi_realtime",
                )
                await add_activity(activity)

                # Broadcast immediately to dashboard
                await manager.broadcast({
                    "type": "urgent_alert",
                    "data": {
                        "alert": alert.model_dump(),
                        "analysis": analysis.model_dump(),
                        "suggested_response": analysis.suggested_response,
                    },
                })

        # Always broadcast transcript to dashboard
        await manager.broadcast({
            "type": "transcript",
            "data": {"text": text, "timestamp": datetime.now().isoformat()},
        })

    return {"status": "ok"}


# ======================================
# REST API ENDPOINTS (serve to React dashboard)
# ======================================

@app.get("/api/activities")
async def api_get_activities(limit: int = 50, since: Optional[str] = None):
    """Get activity events for the dashboard timeline."""
    activities = await get_activities(limit=limit, since=since)
    return {"activities": activities}


@app.get("/api/alerts")
async def api_get_alerts(limit: int = 50, unresolved: bool = False):
    """Get alert history for the dashboard."""
    alerts = await get_alerts(limit=limit, unresolved_only=unresolved)
    return {"alerts": alerts}


@app.post("/api/alerts/{alert_id}/resolve")
async def api_resolve_alert(alert_id: int):
    """Mark an alert as resolved."""
    await resolve_alert(alert_id)
    await manager.broadcast({
        "type": "alert_resolved",
        "data": {"alert_id": alert_id},
    })
    return {"status": "ok", "alert_id": alert_id}


@app.get("/api/stats")
async def api_get_stats():
    """Get aggregated dashboard statistics."""
    stats = await get_dashboard_stats()
    return stats.model_dump()


@app.get("/api/conversations")
async def api_get_conversations(limit: int = 20):
    """Get conversation history."""
    import aiosqlite
    DB_PATH = os.getenv("DB_PATH", "pehchan.db")
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM conversations ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        return {"conversations": [dict(row) for row in rows]}


@app.get("/api/summary")
async def api_get_summary():
    """Generate a daily summary for the caregiver app."""
    activities = await get_activities(limit=100)
    alerts = await get_alerts(limit=50)
    summary = format_daily_summary(activities, alerts)
    return {"summary": summary, "generated_at": datetime.now().isoformat()}


# ======================================
# WEBSOCKET — Live Dashboard Updates
# ======================================

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time dashboard updates.
    
    The React dashboard connects here to receive live:
    - New activity events
    - Alert notifications
    - Real-time transcript segments
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for client messages
            data = await websocket.receive_text()
            # Client can send commands like "ping"
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ======================================
# TEST ENDPOINTS — For development
# ======================================

@app.post("/test/distress")
async def test_distress():
    """Simulate a distress detection event for testing."""
    test_text = "I'm scared. I don't know where I am. Please help me."

    analysis = analyze_transcript(test_text)
    alert = await notify_from_analysis(analysis, test_text)
    if alert:
        alert_id = await add_alert(alert)
        activity = ActivityEvent(
            event_type="distress",
            title="Distress detected (TEST)",
            description=f'Patient said: "{test_text}"',
            icon="🆘",
            severity="warning",
            source="test",
        )
        await add_activity(activity)

        await manager.broadcast({
            "type": "urgent_alert",
            "data": {
                "alert": alert.model_dump(),
                "analysis": analysis.model_dump(),
            },
        })

        return {
            "status": "alert_created",
            "alert_id": alert_id,
            "analysis": analysis.model_dump(),
        }

    return {"status": "no_alert"}


@app.post("/test/memory")
async def test_memory():
    """Simulate a memory creation event for testing."""
    test_memory = {
        "id": f"test-{datetime.now().strftime('%H%M%S')}",
        "created_at": datetime.now().isoformat(),
        "transcript": "Eleanor asked about her husband Robert. She wanted to know when he was coming home. Maria gently reminded her about their favorite memories together.",
        "structured": {
            "title": "Conversation about Robert",
            "overview": "Eleanor had a heartfelt conversation about her late husband Robert, sharing memories of their time together.",
            "category": "personal",
            "action_items": [],
        },
        "discarded": False,
    }

    # Process through the memory webhook handler logic
    activity = ActivityEvent(
        timestamp=datetime.now().isoformat(),
        event_type="companion",
        title=test_memory["structured"]["title"],
        description=test_memory["structured"]["overview"],
        icon="💬",
        severity="info",
        source="test",
        omi_memory_id=test_memory["id"],
    )
    activity_id = await add_activity(activity)
    await save_conversation(test_memory)

    await manager.broadcast({
        "type": "activity",
        "data": activity.model_dump(),
    })

    return {"status": "ok", "activity_id": activity_id}


@app.get("/")
async def root():
    """Health check and welcome message."""
    return {
        "name": "Pehchan API",
        "version": "1.0.0",
        "status": "online",
        "description": "AI companion backend for Alzheimer's patients",
        "endpoints": {
            "webhooks": {
                "memory": "POST /webhooks/memory?uid=USER_ID",
                "realtime": "POST /webhooks/realtime?uid=USER_ID",
            },
            "api": {
                "activities": "GET /api/activities",
                "alerts": "GET /api/alerts",
                "stats": "GET /api/stats",
                "conversations": "GET /api/conversations",
                "summary": "GET /api/summary",
            },
            "websocket": "WS /ws/live",
            "test": {
                "distress": "POST /test/distress",
                "memory": "POST /test/memory",
            },
        },
    }


# ======================================
# Run
# ======================================

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8080"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
