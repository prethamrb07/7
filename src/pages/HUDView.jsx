import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Eye, User, MapPin, Pill, Navigation, Calendar,
    AlertTriangle, MessageCircle, Heart, Thermometer,
    Battery, Wifi, Clock, ChevronRight, Volume2, X
} from 'lucide-react';
import './HUDView.css';

const scenarios = [
    {
        id: 'face',
        label: 'Face Recognition',
        icon: <User size={18} />,
        color: '#3b82f6',
        description: 'Recognizing a loved one',
    },
    {
        id: 'context',
        label: 'Context Orientation',
        icon: <MapPin size={18} />,
        color: '#8b5cf6',
        description: 'Where am I? What day is it?',
    },
    {
        id: 'medication',
        label: 'Medication Alert',
        icon: <Pill size={18} />,
        color: '#10b981',
        description: 'Identifying & managing pills',
    },
    {
        id: 'navigation',
        label: 'Navigation Warning',
        icon: <Navigation size={18} />,
        color: '#f59e0b',
        description: 'Hazard detection & guidance',
    },
    {
        id: 'routine',
        label: 'Routine Reminder',
        icon: <Calendar size={18} />,
        color: '#06b6d4',
        description: 'Daily schedule anchoring',
    },
    {
        id: 'emergency',
        label: 'Emergency Alert',
        icon: <AlertTriangle size={18} />,
        color: '#ef4444',
        description: 'Fall detection & response',
    },
    {
        id: 'companion',
        label: 'Companion Chat',
        icon: <MessageCircle size={18} />,
        color: '#ec4899',
        description: 'Conversational companionship',
    },
];

const scenarioContent = {
    face: {
        whisper: "That's a familiar face — someone you know and trust. They visit often and care about you very much.",
        hudElements: [
            { type: 'face-tag', name: 'Recognized Person', relation: 'Family', confidence: 98 },
            { type: 'info', text: 'Recognized from your contacts' },
            { type: 'emotion', text: '😊 They seem happy to see you' },
        ],
        background: 'living-room',
    },
    context: {
        whisper: "You're in your kitchen at home. It's a pleasant morning. You were about to have breakfast.",
        hudElements: [
            { type: 'location', text: '🏠 Kitchen — Your Home' },
            { type: 'time', text: '📅 Today — Morning' },
            { type: 'activity', text: '🍳 Next: Breakfast time' },
            { type: 'info', text: 'Your caregiver arrives soon' },
        ],
        background: 'kitchen',
    },
    medication: {
        whisper: "Those are your blood pressure pills — the white oval ones. You already took them this morning. You don't need another dose until tomorrow.",
        hudElements: [
            { type: 'med-id', name: 'Blood Pressure Medication', status: 'ALREADY TAKEN', time: 'Taken this morning', color: '#10b981' },
            { type: 'med-warning', text: '⚠️ Do not take another dose until tomorrow morning' },
            { type: 'med-next', text: '💊 Next medication: Evening dose tonight' },
        ],
        background: 'kitchen',
    },
    navigation: {
        whisper: "Let's slow down — there are stairs just ahead. Hold the railing on your right. I've notified your caregiver.",
        hudElements: [
            { type: 'hazard', text: '⚠️ STAIRS AHEAD — 3 meters' },
            { type: 'direction', text: '👉 Hold railing on your RIGHT' },
            { type: 'alert-sent', text: '📱 Caregiver notified' },
        ],
        background: 'hallway',
    },
    routine: {
        whisper: "It's lunchtime. Your caregiver will be here in 20 minutes. Would you like to sit in the living room and wait?",
        hudElements: [
            { type: 'schedule', text: '🕐 12:30 PM — Lunchtime' },
            { type: 'upcoming', text: '👩‍⚕️ Caregiver arriving in 20 minutes' },
            { type: 'suggestion', text: '🍽️ Time for a healthy lunch' },
            { type: 'next', text: 'Next: Rest time at 1:30 PM' },
        ],
        background: 'living-room',
    },
    emergency: {
        whisper: "You're okay. I'm right here with you. I'm calling your emergency contact right now. Help is on the way. Stay still and try to stay calm.",
        hudElements: [
            { type: 'emergency-alert', text: '🆘 FALL DETECTED' },
            { type: 'calling', text: '📞 Calling emergency contact...' },
            { type: 'location-sent', text: '📍 GPS location shared with emergency contacts' },
            { type: 'vitals', text: '❤️ Heart rate: 95 bpm — Monitoring' },
        ],
        background: 'hallway',
    },
    companion: {
        whisper: "I was just thinking about that beautiful garden you planted. The flowers came out so lovely. Your family always says you have the greenest thumb.",
        hudElements: [
            { type: 'memory', text: '🌹 Garden Memories' },
            { type: 'companion-text', text: '"Your family loves your garden"' },
            { type: 'music', text: '🎵 Playing: Clair de Lune — Debussy' },
        ],
        background: 'living-room',
    },
};

const backgroundScenes = {
    'living-room': {
        gradient: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
        objects: ['🛋️', '📺', '🪴', '🖼️', '💡'],
    },
    kitchen: {
        gradient: 'linear-gradient(180deg, #1a1a2e 0%, #1e3a3a 40%, #0f3460 100%)',
        objects: ['🍳', '☕', '🧊', '💡', '🪴'],
    },
    hallway: {
        gradient: 'linear-gradient(180deg, #1a1a2e 0%, #2d1b3d 40%, #0f3460 100%)',
        objects: ['🚪', '🖼️', '💡', '🪜'],
    },
};

export default function HUDView() {
    const [activeScenario, setActiveScenario] = useState('face');
    const [showWhisper, setShowWhisper] = useState(false);
    const [whisperText, setWhisperText] = useState('');
    const [typingIndex, setTypingIndex] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const currentTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });

    const scenario = scenarioContent[activeScenario];
    const scene = backgroundScenes[scenario.background];

    useEffect(() => {
        setShowWhisper(false);
        setWhisperText('');
        setTypingIndex(0);

        const timer = setTimeout(() => {
            setShowWhisper(true);
        }, 800);

        return () => clearTimeout(timer);
    }, [activeScenario]);

    useEffect(() => {
        if (!showWhisper) return;
        const fullText = scenario.whisper;
        if (typingIndex < fullText.length) {
            const timer = setTimeout(() => {
                setWhisperText(fullText.slice(0, typingIndex + 1));
                setTypingIndex((prev) => prev + 1);
            }, 30);
            return () => clearTimeout(timer);
        }
    }, [showWhisper, typingIndex, scenario.whisper]);

    return (
        <div className="hud-page">
            {/* Scenario Sidebar */}
            <motion.div
                className={`hud-sidebar ${sidebarOpen ? 'open' : 'closed'}`}
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <div className="sidebar-header">
                    <Eye size={20} />
                    <h3>HUD Demo Scenarios</h3>
                    <button className="sidebar-close" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        {sidebarOpen ? <X size={18} /> : <ChevronRight size={18} />}
                    </button>
                </div>
                <p className="sidebar-desc">
                    Select a scenario to see the AR heads-up display in action.
                </p>
                <div className="scenario-list">
                    {scenarios.map((s) => (
                        <button
                            key={s.id}
                            className={`scenario-btn ${activeScenario === s.id ? 'active' : ''}`}
                            onClick={() => setActiveScenario(s.id)}
                            style={{
                                '--accent': s.color,
                            }}
                        >
                            <div className="scenario-icon" style={{ background: s.color }}>
                                {s.icon}
                            </div>
                            <div className="scenario-info">
                                <span className="scenario-label">{s.label}</span>
                                <span className="scenario-desc">{s.description}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Toggle button when sidebar closed */}
            {!sidebarOpen && (
                <button className="sidebar-toggle" onClick={() => setSidebarOpen(true)}>
                    <ChevronRight size={20} />
                </button>
            )}

            {/* HUD Display Area */}
            <div className="hud-display" style={{ background: scene.gradient }}>
                {/* Scan Line Effect */}
                <div className="hud-scanline" />

                {/* Corner Frames */}
                <div className="hud-corner top-left" />
                <div className="hud-corner top-right" />
                <div className="hud-corner bottom-left" />
                <div className="hud-corner bottom-right" />

                {/* Top Status Bar */}
                <div className="hud-status-bar">
                    <div className="status-left">
                        <span className="status-item">
                            <Clock size={12} />
                            {currentTime}
                        </span>
                        <span className="status-item">
                            <MapPin size={12} />
                            Home
                        </span>
                    </div>
                    <div className="status-center">
                        <span className="status-pehchan">
                            <Eye size={12} />
                            Pehchan Active
                        </span>
                    </div>
                    <div className="status-right">
                        <span className="status-item">
                            <Heart size={12} />
                            72 bpm
                        </span>
                        <span className="status-item">
                            <Battery size={12} />
                            84%
                        </span>
                        <span className="status-item">
                            <Wifi size={12} />
                        </span>
                    </div>
                </div>

                {/* Scene Objects (subtle background elements) */}
                <div className="scene-objects">
                    {scene.objects.map((obj, i) => (
                        <span
                            key={i}
                            className="scene-object"
                            style={{
                                left: `${15 + i * 18}%`,
                                top: `${30 + (i % 3) * 15}%`,
                                fontSize: `${24 + (i % 2) * 12}px`,
                                opacity: 0.15,
                                animationDelay: `${i * 0.5}s`,
                            }}
                        >
                            {obj}
                        </span>
                    ))}
                </div>

                {/* HUD Overlay Elements */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeScenario}
                        className="hud-overlay-content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        {/* Face Recognition - special layout */}
                        {activeScenario === 'face' && (
                            <div className="hud-face-recognition">
                                <motion.div
                                    className="face-target"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <div className="face-circle">
                                        <span className="face-emoji">👤</span>
                                        <div className="face-scan-ring" />
                                    </div>
                                    <motion.div
                                        className="face-label"
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                    >
                                        <div className="face-name">Recognized Person</div>
                                        <div className="face-relation">
                                            <span className="relation-dot" />
                                            Family
                                        </div>
                                        <div className="face-confidence">
                                            Confidence: {scenario.hudElements[0].confidence}%
                                        </div>
                                    </motion.div>
                                </motion.div>
                            </div>
                        )}

                        {/* Emergency - special layout */}
                        {activeScenario === 'emergency' && (
                            <div className="hud-emergency">
                                <motion.div
                                    className="emergency-pulse"
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        opacity: [0.8, 1, 0.8],
                                    }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                />
                            </div>
                        )}

                        {/* Navigation - special layout */}
                        {activeScenario === 'navigation' && (
                            <div className="hud-nav-overlay">
                                <motion.div
                                    className="nav-arrow-container"
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    <div className="nav-hazard-zone">
                                        <AlertTriangle size={32} />
                                        <span>STAIRS — 3m</span>
                                    </div>
                                    <div className="nav-direction-arrow">
                                        <span>👉 RAILING →</span>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        {/* Generic HUD elements */}
                        <div className={`hud-elements ${activeScenario === 'emergency' ? 'emergency-mode' : ''}`}>
                            {scenario.hudElements.map((el, i) => (
                                <motion.div
                                    key={i}
                                    className={`hud-element-card ${el.type}`}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.2 }}
                                >
                                    {el.type === 'med-id' ? (
                                        <>
                                            <div className="med-name">{el.name}</div>
                                            <div className="med-status" style={{ color: el.color }}>
                                                ✓ {el.status}
                                            </div>
                                            <div className="med-time">{el.time}</div>
                                        </>
                                    ) : el.type === 'face-tag' ? null : (
                                        <span>{el.text}</span>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Whisper Subtitle - What Pehchan Says */}
                <AnimatePresence>
                    {showWhisper && (
                        <motion.div
                            className={`hud-whisper ${activeScenario === 'emergency' ? 'whisper-emergency' : ''}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="whisper-header">
                                <Volume2 size={14} />
                                <span>Pehchan whispers:</span>
                            </div>
                            <p className="whisper-text">
                                "{whisperText}
                                {typingIndex < scenario.whisper.length && (
                                    <span className="whisper-cursor">|</span>
                                )}
                                "
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom Info */}
                <div className="hud-bottom-bar">
                    <span className="hud-label">
                        Pehchan HUD — Demo Mode
                    </span>
                    <span className="hud-label">
                        <Thermometer size={12} />
                        98.4°F
                    </span>
                    <span className="hud-label">
                        Steps: 1,247
                    </span>
                </div>
            </div>
        </div>
    );
}
