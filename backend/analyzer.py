"""
Pehchan — Transcript Analyzer

Analyzes real-time transcripts and conversation memories for:
- Distress signals (fear, confusion, pain)
- Confusion indicators (disorientation, repetition)
- Help requests
- Medication mentions
- Safety concerns
"""

from models import AnalysisResult


# Distress keywords and phrases
DISTRESS_KEYWORDS = [
    "i'm scared", "i am scared",
    "help me", "help",
    "i don't know where i am", "where am i",
    "i'm lost", "i am lost",
    "i'm afraid", "i am afraid",
    "leave me alone",
    "who are you", "i don't know you",
    "i want to go home",
    "it hurts", "i'm in pain", "pain",
    "i can't breathe", "can't breathe",
    "something is wrong",
    "i fell", "i'm falling",
    "please help",
    "i'm confused", "i am confused",
]

# Confusion indicators
CONFUSION_KEYWORDS = [
    "what day is it", "what time is it",
    "where is this", "what is this place",
    "who is that", "who are they",
    "i don't remember", "i can't remember",
    "what was i doing",
    "why am i here",
    "is this my house", "is this my home",
    "i already did that", "didn't i already",
    "what's happening",
    "i'm not sure", "i don't understand",
    "what did you say",
]

# Medication-related phrases
MEDICATION_KEYWORDS = [
    "medicine", "medication", "pill", "pills",
    "take my medicine", "take my pills",
    "did i take", "have i taken",
    "need to take", "time for medicine",
    "prescription", "dose", "dosage",
]

# Safety concern phrases
SAFETY_KEYWORDS = [
    "stairs", "steps", "fall",
    "hot", "burning", "fire",
    "door", "outside", "leaving",
    "sharp", "knife", "cut",
    "dizzy", "faint", "lightheaded",
]


def analyze_transcript(text: str) -> AnalysisResult:
    """
    Analyze a transcript segment for Pehchan-relevant signals.

    Returns an AnalysisResult with detected patterns and suggested responses.
    """
    text_lower = text.lower().strip()
    result = AnalysisResult()

    # Check for distress
    for phrase in DISTRESS_KEYWORDS:
        if phrase in text_lower:
            result.is_distressed = True
            result.distress_phrases.append(phrase)
            result.detected_keywords.append(phrase)

    # Check for confusion
    for phrase in CONFUSION_KEYWORDS:
        if phrase in text_lower:
            result.is_confused = True
            result.confusion_phrases.append(phrase)
            result.detected_keywords.append(phrase)

    # Check for help requests
    help_phrases = ["help me", "please help", "i need help", "somebody help"]
    for phrase in help_phrases:
        if phrase in text_lower:
            result.is_asking_for_help = True
            result.detected_keywords.append(phrase)

    # Determine severity
    if result.is_distressed and result.is_asking_for_help:
        result.alert_severity = "critical"
        result.suggested_response = (
            "You're safe. I'm right here with you. "
            "I'm letting your family know you need help."
        )
    elif result.is_distressed:
        result.alert_severity = "critical"
        result.suggested_response = (
            "It's okay. You're at home and you're safe. "
            "Would you like me to call someone?"
        )
    elif result.is_confused:
        result.alert_severity = "warning"
        result.suggested_response = (
            "You're at home. Everything is okay. "
            "Let me help you remember."
        )
    else:
        result.alert_severity = "info"

    return result


def analyze_memory(title: str, overview: str, transcript: str) -> AnalysisResult:
    """
    Analyze a complete conversation memory for patterns.
    Combines analysis of the full text content.
    """
    combined = f"{title or ''} {overview or ''} {transcript or ''}"
    return analyze_transcript(combined)


def classify_conversation(title: str, overview: str) -> str:
    """
    Classify a conversation into a category for the activity log.
    Returns an event_type string.
    """
    text = f"{title or ''} {overview or ''}".lower()

    if any(w in text for w in MEDICATION_KEYWORDS):
        return "medication"
    if any(w in text for w in SAFETY_KEYWORDS):
        return "safety"
    if any(w in text for w in CONFUSION_KEYWORDS):
        return "context"
    if any(w in text for w in ["visit", "came", "arrived", "greeted"]):
        return "face_recognition"
    if any(w in text for w in ["walk", "exercise", "garden", "outside"]):
        return "navigation"
    if any(w in text for w in ["remember", "memory", "story", "husband", "wife", "child"]):
        return "companion"
    if any(w in text for w in ["puzzle", "game", "read", "paint", "activity"]):
        return "cognitive"

    return "routine"


def get_icon_for_type(event_type: str) -> str:
    """Return an appropriate emoji icon for an event type."""
    icons = {
        "medication": "💊",
        "safety": "⚠️",
        "context": "📍",
        "face_recognition": "👤",
        "navigation": "🗺️",
        "companion": "💬",
        "cognitive": "🧩",
        "routine": "📝",
        "distress": "🆘",
        "conversation": "🗣️",
    }
    return icons.get(event_type, "📝")
