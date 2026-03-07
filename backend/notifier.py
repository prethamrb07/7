"""
Pehchan — Caregiver Notification System

Sends alerts to designated caregivers when the patient shows signs of distress,
confusion, or safety concerns. Currently logs to console; designed for easy
extension to SMS (Twilio), push notifications, or email.
"""

import os
from datetime import datetime
from models import Alert, AnalysisResult

# In production, these would come from a secure database
CAREGIVER_PHONE = os.getenv("CAREGIVER_PHONE", "+15035550147")
CAREGIVER_EMAIL = os.getenv("ALERT_EMAIL", "sarah.mitchell@email.com")


async def notify_caregiver(alert: Alert):
    """
    Send alert to the designated caregiver.

    Currently prints to console. In production, this would integrate with:
    - Twilio for SMS
    - Firebase Cloud Messaging for push notifications
    - SendGrid/SES for email
    - The Pehchan companion mobile app
    """
    severity_emoji = {
        "critical": "🚨",
        "warning": "⚠️",
        "info": "ℹ️",
    }

    emoji = severity_emoji.get(alert.severity, "ℹ️")
    timestamp = datetime.now().strftime("%I:%M %p")

    print(f"\n{'='*60}")
    print(f"{emoji} CAREGIVER ALERT — {alert.severity.upper()}")
    print(f"{'='*60}")
    print(f"Time:        {timestamp}")
    print(f"Type:        {alert.alert_type}")
    print(f"Title:       {alert.title}")
    print(f"Description: {alert.description}")
    print(f"Notify:      {CAREGIVER_PHONE} / {CAREGIVER_EMAIL}")
    print(f"{'='*60}\n")

    # TODO: Uncomment when Twilio is configured
    # await send_sms(CAREGIVER_PHONE, f"{emoji} Pehchan Alert: {alert.title}")

    # TODO: Uncomment when push notifications are configured
    # await send_push_notification(alert)

    return True


async def notify_from_analysis(analysis: AnalysisResult, transcript_text: str):
    """
    Create and send an alert based on transcript analysis results.
    Only sends for warning and critical severity.
    """
    if analysis.alert_severity not in ("warning", "critical"):
        return None

    if analysis.is_distressed:
        alert = Alert(
            alert_type="distress",
            title="Verbal distress detected",
            description=f'Patient said: "{transcript_text[:200]}". '
                        f"Detected: {', '.join(analysis.distress_phrases[:3])}",
            severity=analysis.alert_severity,
        )
    elif analysis.is_confused:
        alert = Alert(
            alert_type="confusion",
            title="Confusion detected",
            description=f'Patient appears confused: "{transcript_text[:200]}". '
                        f"Indicators: {', '.join(analysis.confusion_phrases[:3])}",
            severity=analysis.alert_severity,
        )
    else:
        alert = Alert(
            alert_type="general",
            title="Attention needed",
            description=f"Keywords detected: {', '.join(analysis.detected_keywords[:5])}",
            severity=analysis.alert_severity,
        )

    alert.caregiver_notified = True
    await notify_caregiver(alert)
    return alert


def format_daily_summary(activities: list[dict], alerts: list[dict]) -> str:
    """
    Generate a human-readable daily summary for the caregiver companion app.
    This is the kind of message Sarah would see:
    "Mom had a calm morning, took her medications, and watched TV."
    """
    activity_count = len(activities)
    alert_count = len(alerts)
    critical_count = sum(1 for a in alerts if a.get("severity") == "critical")

    if critical_count > 0:
        mood = "a challenging"
    elif alert_count > 2:
        mood = "a busy"
    elif alert_count > 0:
        mood = "a mostly calm"
    else:
        mood = "a calm"

    summary_parts = [f"Eleanor had {mood} day."]

    # Medication check
    med_events = [a for a in activities if a.get("event_type") == "medication"]
    if med_events:
        summary_parts.append("She took her medications on schedule.")

    # Navigation assists
    nav_events = [a for a in alerts if a.get("alert_type") in ("navigation", "wandering")]
    if nav_events:
        summary_parts.append(
            f"{len(nav_events)} navigation assist{'s' if len(nav_events) > 1 else ''} "
            f"{'were' if len(nav_events) > 1 else 'was'} provided."
        )

    # Cognitive activities
    cog_events = [a for a in activities if a.get("event_type") == "cognitive"]
    if cog_events:
        summary_parts.append("She engaged in cognitive activities.")

    # Companion interactions
    comp_events = [a for a in activities if a.get("event_type") == "companion"]
    if comp_events:
        summary_parts.append("She had some pleasant conversations.")

    if critical_count > 0:
        summary_parts.append(
            f"⚠️ {critical_count} critical alert{'s' if critical_count > 1 else ''} "
            f"{'were' if critical_count > 1 else 'was'} handled."
        )

    return " ".join(summary_parts)
