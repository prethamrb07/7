"""
Pehchan — Pydantic data models for Omi webhook payloads and internal data.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# ======================================
# Omi Webhook Payload Models
# ======================================

class TranscriptSegment(BaseModel):
    """A single segment from Omi real-time transcript."""
    text: str
    speaker: Optional[str] = None
    speaker_id: Optional[int] = None
    is_user: bool = False
    start: Optional[float] = None
    end: Optional[float] = None


class OmiRealtimePayload(BaseModel):
    """Payload received from Omi real-time transcript webhook."""
    segments: list[TranscriptSegment] = []
    session_id: Optional[str] = None


class StructuredMemory(BaseModel):
    """Structured data from an Omi memory."""
    title: Optional[str] = None
    overview: Optional[str] = None
    emoji: Optional[str] = None
    category: Optional[str] = None
    action_items: list[str] = []
    events: list[dict] = []


class OmiMemoryPayload(BaseModel):
    """Payload received from Omi memory creation webhook."""
    id: Optional[str] = None
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    transcript: Optional[str] = None
    transcript_segments: list[TranscriptSegment] = []
    structured: Optional[StructuredMemory] = None
    plugins_results: list[dict] = []
    source: Optional[str] = None
    language: Optional[str] = None
    discarded: bool = False


# ======================================
# Internal Pehchan Models
# ======================================

class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertType(str, Enum):
    DISTRESS = "distress"
    WANDERING = "wandering"
    FALL = "fall"
    MEDICATION = "medication"
    NAVIGATION = "navigation"
    VITALS = "vitals"
    CONFUSION = "confusion"


class ActivityEvent(BaseModel):
    """An activity event for the dashboard timeline."""
    id: Optional[int] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    event_type: str  # face_recognition, medication, navigation, context, companion, etc.
    title: str
    description: str
    icon: str = "📝"
    severity: str = "info"  # info, success, warning
    source: str = "omi"  # omi, manual, system
    omi_memory_id: Optional[str] = None


class Alert(BaseModel):
    """A caregiver alert."""
    id: Optional[int] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    alert_type: str
    title: str
    description: str
    severity: str = "warning"
    resolved: bool = False
    caregiver_notified: bool = False
    omi_memory_id: Optional[str] = None


class AnalysisResult(BaseModel):
    """Result from analyzing a transcript for Pehchan cues."""
    is_distressed: bool = False
    is_confused: bool = False
    is_asking_for_help: bool = False
    distress_phrases: list[str] = []
    confusion_phrases: list[str] = []
    detected_keywords: list[str] = []
    suggested_response: Optional[str] = None
    alert_severity: Optional[str] = None


class DashboardStats(BaseModel):
    """Aggregated stats for the dashboard."""
    total_activities_today: int = 0
    total_alerts_today: int = 0
    critical_alerts_today: int = 0
    conversations_today: int = 0
    distress_events_today: int = 0
    orientation_assists_today: int = 0
    last_activity_time: Optional[str] = None
