"""
Pehchan — SQLite database layer for persisting activities, alerts, and stats.
Uses aiosqlite for async database operations.
"""

import aiosqlite
import os
import json
from datetime import datetime, timedelta
from models import ActivityEvent, Alert, DashboardStats

DB_PATH = os.getenv("DB_PATH", "pehchan.db")


async def init_db():
    """Initialize database tables."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                event_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT DEFAULT '📝',
                severity TEXT DEFAULT 'info',
                source TEXT DEFAULT 'omi',
                omi_memory_id TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                alert_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                severity TEXT DEFAULT 'warning',
                resolved INTEGER DEFAULT 0,
                caregiver_notified INTEGER DEFAULT 0,
                omi_memory_id TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                omi_memory_id TEXT UNIQUE,
                title TEXT,
                overview TEXT,
                transcript TEXT,
                category TEXT,
                started_at TEXT,
                finished_at TEXT,
                action_items TEXT,
                language TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.commit()
    print("✅ Database initialized")


async def add_activity(event: ActivityEvent) -> int:
    """Insert an activity event. Returns the new row ID."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """INSERT INTO activities
               (timestamp, event_type, title, description, icon, severity, source, omi_memory_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                event.timestamp,
                event.event_type,
                event.title,
                event.description,
                event.icon,
                event.severity,
                event.source,
                event.omi_memory_id,
            ),
        )
        await db.commit()
        return cursor.lastrowid


async def add_alert(alert: Alert) -> int:
    """Insert a caregiver alert. Returns the new row ID."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            """INSERT INTO alerts
               (timestamp, alert_type, title, description, severity, resolved, caregiver_notified, omi_memory_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                alert.timestamp,
                alert.alert_type,
                alert.title,
                alert.description,
                alert.severity,
                int(alert.resolved),
                int(alert.caregiver_notified),
                alert.omi_memory_id,
            ),
        )
        await db.commit()
        return cursor.lastrowid


async def save_conversation(memory_data: dict):
    """Save a processed Omi memory/conversation."""
    structured = memory_data.get("structured", {}) or {}
    action_items = structured.get("action_items", [])

    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT OR REPLACE INTO conversations
               (omi_memory_id, title, overview, transcript, category,
                started_at, finished_at, action_items, language)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                memory_data.get("id"),
                structured.get("title"),
                structured.get("overview"),
                memory_data.get("transcript"),
                structured.get("category"),
                memory_data.get("started_at"),
                memory_data.get("finished_at"),
                json.dumps(action_items),
                memory_data.get("language"),
            ),
        )
        await db.commit()


async def get_activities(limit: int = 50, since: str = None) -> list[dict]:
    """Get recent activity events."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        if since:
            cursor = await db.execute(
                "SELECT * FROM activities WHERE timestamp >= ? ORDER BY timestamp DESC LIMIT ?",
                (since, limit),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM activities ORDER BY timestamp DESC LIMIT ?",
                (limit,),
            )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_alerts(limit: int = 50, unresolved_only: bool = False) -> list[dict]:
    """Get alert history."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        if unresolved_only:
            cursor = await db.execute(
                "SELECT * FROM alerts WHERE resolved = 0 ORDER BY timestamp DESC LIMIT ?",
                (limit,),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?",
                (limit,),
            )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def resolve_alert(alert_id: int):
    """Mark an alert as resolved."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE alerts SET resolved = 1 WHERE id = ?",
            (alert_id,),
        )
        await db.commit()


async def get_dashboard_stats() -> DashboardStats:
    """Get aggregated stats for today."""
    today = datetime.now().strftime("%Y-%m-%d")

    async with aiosqlite.connect(DB_PATH) as db:
        # Activities today
        cursor = await db.execute(
            "SELECT COUNT(*) FROM activities WHERE timestamp LIKE ?",
            (f"{today}%",),
        )
        total_activities = (await cursor.fetchone())[0]

        # Alerts today
        cursor = await db.execute(
            "SELECT COUNT(*) FROM alerts WHERE timestamp LIKE ?",
            (f"{today}%",),
        )
        total_alerts = (await cursor.fetchone())[0]

        # Critical alerts today
        cursor = await db.execute(
            "SELECT COUNT(*) FROM alerts WHERE timestamp LIKE ? AND severity = 'critical'",
            (f"{today}%",),
        )
        critical_alerts = (await cursor.fetchone())[0]

        # Conversations today
        cursor = await db.execute(
            "SELECT COUNT(*) FROM conversations WHERE created_at LIKE ?",
            (f"{today}%",),
        )
        conversations = (await cursor.fetchone())[0]

        # Distress events
        cursor = await db.execute(
            "SELECT COUNT(*) FROM alerts WHERE timestamp LIKE ? AND alert_type = 'distress'",
            (f"{today}%",),
        )
        distress = (await cursor.fetchone())[0]

        # Orientation assists
        cursor = await db.execute(
            "SELECT COUNT(*) FROM activities WHERE timestamp LIKE ? AND event_type = 'context'",
            (f"{today}%",),
        )
        orientation = (await cursor.fetchone())[0]

        # Last activity
        cursor = await db.execute(
            "SELECT timestamp FROM activities ORDER BY timestamp DESC LIMIT 1"
        )
        row = await cursor.fetchone()
        last_time = row[0] if row else None

        return DashboardStats(
            total_activities_today=total_activities,
            total_alerts_today=total_alerts,
            critical_alerts_today=critical_alerts,
            conversations_today=conversations,
            distress_events_today=distress,
            orientation_assists_today=orientation,
            last_activity_time=last_time,
        )
