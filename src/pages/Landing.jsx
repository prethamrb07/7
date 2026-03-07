import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Brain, Eye, Pill, MapPin, Calendar, ShieldCheck,
    Heart, Users, Activity, ArrowRight, Glasses,
    MessageCircle, Bell, Lock, Sparkles, ChevronRight
} from 'lucide-react';
import './Landing.css';

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' },
};

const stagger = {
    animate: { transition: { staggerChildren: 0.1 } },
};

const features = [
    {
        icon: <Eye size={28} />,
        title: 'Face Recognition',
        description: 'Instantly identifies family, friends, and caregivers — gently whispering names and relationships to prevent social anxiety.',
        gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    },
    {
        icon: <Brain size={28} />,
        title: 'Contextual Memory',
        description: 'Detects confusion and provides gentle orientation — time, place, and situation reminders when needed most.',
        gradient: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    },
    {
        icon: <Pill size={28} />,
        title: 'Medication Safety',
        description: 'Identifies pills, tracks dosages, prevents double-dosing, and confirms medications with caregivers in real time.',
        gradient: 'linear-gradient(135deg, #10b981, #06b6d4)',
    },
    {
        icon: <MapPin size={28} />,
        title: 'Navigation Guard',
        description: 'Detects hazards like stairs, busy streets, and unfamiliar areas — providing calm audiovisual guidance to safety.',
        gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    },
    {
        icon: <Calendar size={28} />,
        title: 'Routine Anchoring',
        description: 'Maintains and gently enforces a personalized daily schedule, keeping the patient oriented throughout the day.',
        gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    },
    {
        icon: <MessageCircle size={28} />,
        title: 'Companion Chat',
        description: 'A gentle conversational companion during quiet moments — sharing memories, playing music, and providing comfort.',
        gradient: 'linear-gradient(135deg, #ec4899, #f43f5e)',
    },
];

const steps = [
    {
        number: '01',
        title: 'Wear the Glasses',
        description: 'Lightweight smart glasses that look like normal eyewear. No stigma, no blinking lights.',
        icon: <Glasses size={24} />,
    },
    {
        number: '02',
        title: 'AI Observes & Understands',
        description: 'Pehchan analyzes the environment, recognizes faces, and monitors wellbeing — all in real time.',
        icon: <Activity size={24} />,
    },
    {
        number: '03',
        title: 'Gentle Support Delivered',
        description: 'Whispered guidance through bone conduction audio. Subtle HUD overlays. Only the patient can hear or see.',
        icon: <Heart size={24} />,
    },
    {
        number: '04',
        title: 'Care Team Stays Connected',
        description: 'Family and physicians receive daily summaries, alerts, and cognitive trend insights through the companion app.',
        icon: <Users size={24} />,
    },
];

export default function Landing() {
    return (
        <div className="landing">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-bg">
                    <div className="hero-orb hero-orb-1" />
                    <div className="hero-orb hero-orb-2" />
                    <div className="hero-orb hero-orb-3" />
                </div>

                <motion.div
                    className="hero-content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    <motion.div className="hero-badge" {...fadeUp}>
                        <Sparkles size={14} />
                        <span>AI-Powered Assistive Technology</span>
                    </motion.div>

                    <motion.h1
                        className="hero-title"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        A quiet friend who
                        <br />
                        <span className="gradient-text">always remembers</span>
                    </motion.h1>

                    <motion.p
                        className="hero-subtitle"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                    >
                        Pehchan is an AI companion embedded in smart glasses, providing
                        real-time, compassionate support for patients with Alzheimer's and
                        dementia — helping them navigate daily life with independence, safety,
                        and dignity.
                    </motion.p>

                    <motion.div
                        className="hero-actions"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                    >
                        <Link to="/hud" className="btn btn-primary btn-lg">
                            <Eye size={20} />
                            Try HUD Demo
                        </Link>
                        <Link to="/dashboard" className="btn btn-secondary btn-lg">
                            Caregiver Dashboard
                            <ArrowRight size={18} />
                        </Link>
                    </motion.div>

                    {/* Hero Stats */}
                    <motion.div
                        className="hero-stats"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                    >
                        <div className="stat-item">
                            <span className="stat-value">6.7M+</span>
                            <span className="stat-label">Americans with Alzheimer's</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-item">
                            <span className="stat-value">24/7</span>
                            <span className="stat-label">Real-time monitoring</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-item">
                            <span className="stat-value">100%</span>
                            <span className="stat-label">On-device privacy</span>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Floating Glasses Visualization */}
                <motion.div
                    className="hero-visual"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                >
                    <div className="glasses-mockup animate-float">
                        <div className="glasses-frame">
                            <div className="glasses-lens left-lens">
                                <div className="lens-hud">
                                    <div className="hud-element hud-name">
                                        <span className="hud-dot" />
                                        Recognized — Family
                                    </div>
                                    <div className="hud-element hud-time">10:30 AM · Tuesday</div>
                                    <div className="hud-element hud-heart">❤️ 72 bpm</div>
                                </div>
                            </div>
                            <div className="glasses-bridge" />
                            <div className="glasses-lens right-lens">
                                <div className="lens-hud">
                                    <div className="hud-element hud-reminder">
                                        <Calendar size={12} />
                                        Lunch in 2 hours
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="glasses-arms">
                            <div className="arm left-arm" />
                            <div className="arm right-arm" />
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Features Section */}
            <section className="section features-section" id="features">
                <motion.div
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="section-tag">Core Capabilities</span>
                    <h2 className="section-title">
                        Invisible technology,{' '}
                        <span className="gradient-text">visible compassion</span>
                    </h2>
                    <p className="section-subtitle">
                        Every feature is designed to maximize independence while providing a
                        safety net of continuous, dignified support.
                    </p>
                </motion.div>

                <motion.div
                    className="features-grid"
                    variants={stagger}
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                >
                    {features.map((feature, i) => (
                        <motion.div
                            key={i}
                            className="feature-card glass-card"
                            variants={fadeUp}
                            whileHover={{ y: -5 }}
                        >
                            <div
                                className="feature-icon"
                                style={{ background: feature.gradient }}
                            >
                                {feature.icon}
                            </div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-desc">{feature.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* How It Works Section */}
            <section className="section how-it-works">
                <motion.div
                    className="section-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="section-tag">How It Works</span>
                    <h2 className="section-title">
                        Seamless support in{' '}
                        <span className="gradient-text">four steps</span>
                    </h2>
                </motion.div>

                <div className="steps-container">
                    {steps.map((step, i) => (
                        <motion.div
                            key={i}
                            className="step-card"
                            initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: i * 0.15 }}
                        >
                            <div className="step-number">{step.number}</div>
                            <div className="step-content">
                                <div className="step-icon">{step.icon}</div>
                                <h3>{step.title}</h3>
                                <p>{step.description}</p>
                            </div>
                            {i < steps.length - 1 && <div className="step-connector" />}
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Privacy Section */}
            <section className="section privacy-section">
                <motion.div
                    className="privacy-card glass-card"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="privacy-header">
                        <div className="privacy-icon">
                            <Lock size={32} />
                        </div>
                        <h2>
                            Privacy & Dignity{' '}
                            <span className="gradient-text">by Design</span>
                        </h2>
                        <p>
                            Pehchan is not a surveillance tool. It is a dignity-first
                            assistive technology built on trust, transparency, and consent.
                        </p>
                    </div>

                    <div className="privacy-grid">
                        {[
                            {
                                icon: <ShieldCheck size={20} />,
                                title: 'HIPAA Compliant',
                                text: 'Full compliance with healthcare data protection standards.',
                            },
                            {
                                icon: <Lock size={20} />,
                                title: 'On-Device Processing',
                                text: 'Facial recognition data is stored locally, never uploaded to third-party servers.',
                            },
                            {
                                icon: <Bell size={20} />,
                                title: '"Stop Listening" Command',
                                text: 'The patient can pause AI monitoring at any time for full autonomy.',
                            },
                            {
                                icon: <Users size={20} />,
                                title: 'Consent-Based Recognition',
                                text: 'Only pre-authorized individuals are added to the recognition database.',
                            },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                className="privacy-item"
                                initial={{ opacity: 0, y: 15 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <div className="privacy-item-icon">{item.icon}</div>
                                <h4>{item.title}</h4>
                                <p>{item.text}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* CTA Section */}
            <section className="section cta-section">
                <motion.div
                    className="cta-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2>
                        Experience Pehchan
                    </h2>
                    <p>
                        See how the AR heads-up display works from the patient's perspective,
                        or explore the caregiver management dashboard.
                    </p>
                    <div className="cta-buttons">
                        <Link to="/hud" className="btn btn-primary btn-lg">
                            <Eye size={20} />
                            Launch HUD Demo
                            <ChevronRight size={18} />
                        </Link>
                        <Link to="/dashboard" className="btn btn-secondary btn-lg">
                            Open Dashboard
                            <ChevronRight size={18} />
                        </Link>
                    </div>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="footer">
                <div className="footer-inner">
                    <div className="footer-brand">
                        <Brain size={20} />
                        <span>Pehchan</span>
                    </div>
                    <p className="footer-tagline">
                        A quiet, invisible friend who always remembers — so the patient doesn't
                        have to.
                    </p>
                    <p className="footer-copy">
                        © 2026 Pehchan · Built for Omi Smart Glasses · Dignity-First
                        Assistive Technology
                    </p>
                </div>
            </footer>
        </div>
    );
}
