import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart, Thermometer, Footprints, Moon, Battery, Wifi,
    Brain, Clock, Pill, Calendar, Users, AlertTriangle,
    Activity, TrendingUp, ChevronRight, CheckCircle2,
    XCircle, Bell, Shield, MapPin, Eye, Phone, Settings,
    Radio, Zap, TestTube
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from 'recharts';
import { patient } from '../data/patient';
import { contacts } from '../data/contacts';
import { medications, adherenceHistory } from '../data/medications';
import { schedule } from '../data/schedule';
import { activityLog, alertHistory, cognitiveData } from '../data/activityLog';
import {
    getActivities, getAlerts, getStats, getSummary,
    testDistress, testMemory, checkHealth, connectLive
} from '../api/client';
import './Dashboard.css';

const tabs = [
    { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
    { id: 'medications', label: 'Medications', icon: <Pill size={16} /> },
    { id: 'schedule', label: 'Schedule', icon: <Calendar size={16} /> },
    { id: 'contacts', label: 'Contacts', icon: <Users size={16} /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell size={16} /> },
    { id: 'trends', label: 'Trends', icon: <TrendingUp size={16} /> },
];

const fadeUp = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
};

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [backendOnline, setBackendOnline] = useState(false);
    const [liveActivities, setLiveActivities] = useState([]);
    const [liveAlerts, setLiveAlerts] = useState([]);
    const [liveSummary, setLiveSummary] = useState(null);
    const [liveStats, setLiveStats] = useState(null);
    const [unresolvedCount, setUnresolvedCount] = useState(0);

    // Check backend health and fetch data
    const fetchData = useCallback(async () => {
        const online = await checkHealth();
        setBackendOnline(online);

        if (online) {
            const [activitiesRes, alertsRes, statsRes, summaryRes] = await Promise.all([
                getActivities(50),
                getAlerts(50),
                getStats(),
                getSummary(),
            ]);
            if (activitiesRes) setLiveActivities(activitiesRes.activities || []);
            if (alertsRes) {
                setLiveAlerts(alertsRes.alerts || []);
                setUnresolvedCount((alertsRes.alerts || []).filter(a => !a.resolved).length);
            }
            if (statsRes) setLiveStats(statsRes);
            if (summaryRes) setLiveSummary(summaryRes.summary);
        }
    }, []);

    // Initial fetch + polling every 15s
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // WebSocket for real-time updates
    useEffect(() => {
        const ws = connectLive((event) => {
            if (event.type === 'activity') {
                setLiveActivities(prev => [event.data, ...prev].slice(0, 50));
            }
            if (event.type === 'alert' || event.type === 'urgent_alert') {
                const alertData = event.data.alert || event.data;
                setLiveAlerts(prev => [alertData, ...prev].slice(0, 50));
                setUnresolvedCount(prev => prev + 1);
            }
        });
        return () => ws.close();
    }, []);

    // Test simulation handlers
    const handleTestDistress = async () => {
        await testDistress();
        setTimeout(fetchData, 500);
    };

    const handleTestMemory = async () => {
        await testMemory();
        setTimeout(fetchData, 500);
    };

    const alertBadgeCount = backendOnline ? unresolvedCount : 2;

    return (
        <div className="dashboard">
            {/* Dashboard Header */}
            <div className="dashboard-header">
                <div className="dashboard-header-content">
                    <div className="patient-info">
                        <div className="patient-avatar">
                            <span>👵</span>
                        </div>
                        <div>
                            <h1>
                                {patient.firstName} {patient.lastName}
                            </h1>
                            <p className="patient-condition">{patient.condition}</p>
                        </div>
                    </div>
                    <div className="header-meta">
                        <div className="glasses-status">
                            <div className={`status-dot ${patient.glassesStatus.connected ? 'connected' : 'disconnected'}`} />
                            <span>Glasses {patient.glassesStatus.connected ? 'Connected' : 'Offline'}</span>
                            <Battery size={14} />
                            <span>{patient.glassesStatus.batteryLevel}%</span>
                        </div>
                        <div className={`backend-status ${backendOnline ? 'online' : 'offline'}`}>
                            <Radio size={12} />
                            <span>Omi Backend {backendOnline ? 'Connected' : 'Offline'}</span>
                        </div>
                        {backendOnline && (
                            <div className="test-buttons">
                                <button className="test-btn" onClick={handleTestDistress} title="Simulate distress event">
                                    <Zap size={12} /> Test Alert
                                </button>
                                <button className="test-btn" onClick={handleTestMemory} title="Simulate memory creation">
                                    <TestTube size={12} /> Test Memory
                                </button>
                            </div>
                        )}
                        <div className="last-sync">
                            Last sync: {new Date(patient.glassesStatus.lastSync).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="dashboard-tabs">
                <div className="tabs-inner">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.id === 'alerts' && alertBadgeCount > 0 && (
                                <span className="tab-badge">{alertBadgeCount}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="dashboard-content">
                {activeTab === 'overview' && (
                    <OverviewTab
                        liveActivities={liveActivities}
                        liveSummary={liveSummary}
                        liveStats={liveStats}
                        backendOnline={backendOnline}
                    />
                )}
                {activeTab === 'medications' && <MedicationsTab />}
                {activeTab === 'schedule' && <ScheduleTab />}
                {activeTab === 'contacts' && <ContactsTab />}
                {activeTab === 'alerts' && (
                    <AlertsTab
                        liveAlerts={liveAlerts}
                        backendOnline={backendOnline}
                    />
                )}
                {activeTab === 'trends' && <TrendsTab />}
            </div>
        </div>
    );
}

/* ========================================
   OVERVIEW TAB
   ======================================== */
function OverviewTab({ liveActivities, liveSummary, liveStats, backendOnline }) {
    // Use live data from backend, fallback to mock data
    const displayActivities = backendOnline && liveActivities.length > 0
        ? liveActivities.map((a, i) => ({
            id: a.id || i,
            time: new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            icon: a.icon || '📝',
            title: a.title,
            description: a.description,
            severity: a.severity || 'info',
        }))
        : activityLog;

    const summaryText = liveSummary || (
        `${patient.firstName} had a calm morning, took her medications on time, ` +
        `completed a crossword puzzle session with above-average engagement, and enjoyed a garden walk. ` +
        `One navigation assist was provided at 9:35 AM for a step hazard at the back door. ` +
        `She asked about Robert during a companion conversation — handled with gentle memory sharing.`
    );

    return (
        <motion.div className="tab-content" {...fadeUp}>
            {/* Vitals Cards */}
            <div className="section-label">Current Vitals</div>
            <div className="vitals-grid">
                <VitalCard
                    icon={<Heart size={20} />}
                    label="Heart Rate"
                    value={`${patient.vitals.heartRate}`}
                    unit="bpm"
                    color="#f43f5e"
                    status="Normal"
                />
                <VitalCard
                    icon={<Thermometer size={20} />}
                    label="Temperature"
                    value={`${patient.vitals.bodyTemp}`}
                    unit="°F"
                    color="#f59e0b"
                    status="Normal"
                />
                <VitalCard
                    icon={<Footprints size={20} />}
                    label="Steps Today"
                    value={patient.vitals.stepsToday.toLocaleString()}
                    unit=""
                    color="#3b82f6"
                    status="On track"
                />
                <VitalCard
                    icon={<Moon size={20} />}
                    label="Sleep Last Night"
                    value={`${patient.vitals.sleepHours}`}
                    unit="hrs"
                    color="#8b5cf6"
                    status="Good"
                />
            </div>

            {/* Live Stats from Backend */}
            {backendOnline && liveStats && (
                <>
                    <div className="section-label">Omi Live Stats — Today</div>
                    <div className="vitals-grid">
                        <VitalCard
                            icon={<Activity size={20} />}
                            label="Activities"
                            value={`${liveStats.total_activities_today}`}
                            unit=""
                            color="#3b82f6"
                            status="Today"
                        />
                        <VitalCard
                            icon={<Bell size={20} />}
                            label="Alerts"
                            value={`${liveStats.total_alerts_today}`}
                            unit=""
                            color="#f59e0b"
                            status={liveStats.critical_alerts_today > 0 ? `${liveStats.critical_alerts_today} critical` : 'None critical'}
                        />
                        <VitalCard
                            icon={<Brain size={20} />}
                            label="Conversations"
                            value={`${liveStats.conversations_today}`}
                            unit=""
                            color="#8b5cf6"
                            status="Processed"
                        />
                        <VitalCard
                            icon={<MapPin size={20} />}
                            label="Orientation"
                            value={`${liveStats.orientation_assists_today}`}
                            unit=""
                            color="#10b981"
                            status="Assists"
                        />
                    </div>
                </>
            )}

            {/* Activity Timeline */}
            <div className="section-label">
                Today's Activity
                {backendOnline && liveActivities.length > 0 && (
                    <span className="live-badge">● LIVE</span>
                )}
            </div>
            <div className="activity-timeline">
                {displayActivities.map((event, i) => (
                    <motion.div
                        key={event.id}
                        className={`timeline-item ${event.severity}`}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                    >
                        <div className="timeline-time">{event.time}</div>
                        <div className="timeline-dot" />
                        <div className="timeline-content">
                            <div className="timeline-icon">{event.icon}</div>
                            <div>
                                <div className="timeline-title">{event.title}</div>
                                <div className="timeline-desc">{event.description}</div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Summary */}
            <div className="section-label">Daily Summary</div>
            <div className="summary-card glass-card">
                <p className="summary-text">
                    <strong>{patient.firstName}</strong> {summaryText.replace(/^Eleanor\s*/i, '')}
                </p>
                <div className="summary-meta">
                    <span className="badge badge-green">
                        <CheckCircle2 size={12} />
                        Calm Day
                    </span>
                    <span className="badge badge-blue">
                        <Pill size={12} />
                        Meds on Track
                    </span>
                    <span className="badge badge-amber">
                        <AlertTriangle size={12} />
                        {backendOnline && liveStats ? `${liveStats.total_alerts_today} Alert${liveStats.total_alerts_today !== 1 ? 's' : ''}` : '1 Navigation Assist'}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

function VitalCard({ icon, label, value, unit, color, status }) {
    return (
        <div className="vital-card glass-card">
            <div className="vital-icon" style={{ color, background: `${color}15` }}>
                {icon}
            </div>
            <div className="vital-label">{label}</div>
            <div className="vital-value" style={{ color }}>
                {value}
                <span className="vital-unit">{unit}</span>
            </div>
            <div className="vital-status">
                <div className="status-indicator" style={{ background: color }} />
                {status}
            </div>
        </div>
    );
}

/* ========================================
   MEDICATIONS TAB
   ======================================== */
function MedicationsTab() {
    return (
        <motion.div className="tab-content" {...fadeUp}>
            <div className="section-label">Today's Medications</div>
            <div className="meds-grid">
                {medications.map((med) => (
                    <div key={med.id} className="med-card glass-card">
                        <div className="med-header">
                            <span className="med-icon-large">{med.icon}</span>
                            <div className="med-info">
                                <h3>{med.name}</h3>
                                <p className="med-purpose">{med.purpose}</p>
                            </div>
                            <div className={`med-badge ${med.takenToday ? 'taken' : 'pending'}`}>
                                {med.takenToday ? (
                                    <>
                                        <CheckCircle2 size={14} />
                                        Taken
                                    </>
                                ) : (
                                    <>
                                        <Clock size={14} />
                                        Pending
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="med-details">
                            <div className="med-detail-row">
                                <span className="med-detail-label">Dosage</span>
                                <span>{med.dosage}</span>
                            </div>
                            <div className="med-detail-row">
                                <span className="med-detail-label">Schedule</span>
                                <span>{med.frequency}</span>
                            </div>
                            <div className="med-detail-row">
                                <span className="med-detail-label">Appearance</span>
                                <span>{med.color}</span>
                            </div>
                            <div className="med-detail-row">
                                <span className="med-detail-label">Next dose</span>
                                <span>
                                    {new Date(med.nextDose).toLocaleString('en-US', {
                                        weekday: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="section-label">Adherence — Last 7 Days</div>
            <div className="chart-card glass-card">
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={adherenceHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="date"
                            stroke="#64748b"
                            fontSize={12}
                            tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short' })}
                        />
                        <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                        <Tooltip
                            contentStyle={{
                                background: '#1a2236',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#f1f5f9',
                            }}
                        />
                        <Bar
                            dataKey="percentage"
                            fill="#3b82f6"
                            radius={[6, 6, 0, 0]}
                            name="Adherence %"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}

/* ========================================
   SCHEDULE TAB
   ======================================== */
function ScheduleTab() {
    return (
        <motion.div className="tab-content" {...fadeUp}>
            <div className="section-label">Today's Schedule — Tuesday, March 7</div>
            <div className="schedule-timeline">
                {schedule.map((item, i) => (
                    <motion.div
                        key={item.id}
                        className={`schedule-item ${item.completed ? 'completed' : ''}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <div className="schedule-time">{item.time}</div>
                        <div className="schedule-marker">
                            <div className={`schedule-dot ${item.completed ? 'done' : ''}`}>
                                {item.completed && <CheckCircle2 size={14} />}
                            </div>
                            {i < schedule.length - 1 && <div className="schedule-line" />}
                        </div>
                        <div className="schedule-content">
                            <div className="schedule-header-row">
                                <span className="schedule-icon">{item.icon}</span>
                                <h4>{item.activity}</h4>
                            </div>
                            <div className="schedule-location">
                                <MapPin size={12} />
                                {item.location}
                            </div>
                            <p className="schedule-notes">{item.notes}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

/* ========================================
   CONTACTS TAB
   ======================================== */
function ContactsTab() {
    return (
        <motion.div className="tab-content" {...fadeUp}>
            <div className="section-label">Recognized People</div>
            <div className="contacts-grid">
                {contacts.map((contact) => (
                    <div key={contact.id} className="contact-card glass-card">
                        <div className="contact-avatar" style={{ background: `${contact.color}20`, borderColor: contact.color }}>
                            <span>{contact.avatar}</span>
                        </div>
                        <h3 className="contact-name">{contact.name}</h3>
                        <span className="contact-relation" style={{ color: contact.color }}>
                            {contact.relationship}
                        </span>
                        <div className="contact-details">
                            <div className="contact-detail">
                                <Calendar size={12} />
                                <span>{contact.visitFrequency}</span>
                            </div>
                            <div className="contact-detail">
                                <Clock size={12} />
                                <span>Last: {new Date(contact.lastVisit).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="contact-detail">
                                <Phone size={12} />
                                <span>{contact.phone}</span>
                            </div>
                        </div>
                        <p className="contact-notes">{contact.notes}</p>
                        <div className="contact-status">
                            {contact.authorized ? (
                                <span className="badge badge-green">
                                    <Shield size={10} />
                                    Authorized
                                </span>
                            ) : (
                                <span className="badge badge-red">
                                    <XCircle size={10} />
                                    Pending
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}

/* ========================================
   ALERTS TAB
   ======================================== */
function AlertsTab({ liveAlerts, backendOnline }) {
    // Combine live and mock alerts
    const displayAlerts = backendOnline && liveAlerts.length > 0
        ? [
            ...liveAlerts.map((a, i) => ({
                id: `live-${a.id || i}`,
                title: a.title,
                description: a.description,
                severity: a.severity || 'warning',
                date: a.timestamp,
                time: new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                type: a.alert_type || 'general',
                resolved: a.resolved || false,
                source: 'omi',
            })),
            ...alertHistory.map(a => ({ ...a, source: 'mock' })),
        ]
        : alertHistory.map(a => ({ ...a, source: 'mock' }));

    return (
        <motion.div className="tab-content" {...fadeUp}>
            <div className="section-label">
                Alert History
                {backendOnline && liveAlerts.length > 0 && (
                    <span className="live-badge">● LIVE</span>
                )}
            </div>
            <div className="alerts-list">
                {displayAlerts.map((alert, i) => (
                    <motion.div
                        key={alert.id}
                        className={`alert-card glass-card severity-${alert.severity}`}
                        initial={{ opacity: 0, x: -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <div className="alert-icon-col">
                            {alert.severity === 'critical' ? (
                                <AlertTriangle size={20} />
                            ) : (
                                <Bell size={20} />
                            )}
                        </div>
                        <div className="alert-content">
                            <div className="alert-header-row">
                                <h4>{alert.title}</h4>
                                <span className={`alert-severity-badge ${alert.severity}`}>
                                    {alert.severity}
                                </span>
                                {alert.source === 'omi' && (
                                    <span className="badge badge-blue" style={{ marginLeft: 8, fontSize: '0.65rem' }}>
                                        <Radio size={10} /> Omi
                                    </span>
                                )}
                            </div>
                            <p>{alert.description}</p>
                            <div className="alert-meta">
                                <span>
                                    <Calendar size={12} />
                                    {new Date(alert.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <span>
                                    <Clock size={12} />
                                    {alert.time}
                                </span>
                                <span className="alert-type">{alert.type}</span>
                            </div>
                        </div>
                        <div className="alert-status-col">
                            {alert.resolved ? (
                                <span className="badge badge-green">
                                    <CheckCircle2 size={12} />
                                    Resolved
                                </span>
                            ) : (
                                <span className="badge badge-red">Active</span>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

/* ========================================
   TRENDS TAB
   ======================================== */
function TrendsTab() {
    return (
        <motion.div className="tab-content" {...fadeUp}>
            <div className="section-label">Cognitive & Engagement Trends — Past Week</div>
            <div className="charts-grid">
                <div className="chart-card glass-card">
                    <h3 className="chart-title">Engagement & Orientation</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={cognitiveData}>
                            <defs>
                                <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="oriGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                            <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{
                                    background: '#1a2236',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#f1f5f9',
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="engagement"
                                stroke="#3b82f6"
                                fill="url(#engGrad)"
                                name="Engagement"
                                strokeWidth={2}
                            />
                            <Area
                                type="monotone"
                                dataKey="orientation"
                                stroke="#8b5cf6"
                                fill="url(#oriGrad)"
                                name="Orientation"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card glass-card">
                    <h3 className="chart-title">Recognition & Mood</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={cognitiveData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                            <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                            <Tooltip
                                contentStyle={{
                                    background: '#1a2236',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#f1f5f9',
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="recognition"
                                stroke="#10b981"
                                name="Recognition"
                                strokeWidth={2}
                                dot={{ fill: '#10b981', r: 4 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="mood"
                                stroke="#f59e0b"
                                name="Mood"
                                strokeWidth={2}
                                dot={{ fill: '#f59e0b', r: 4 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="section-label">Medication Adherence</div>
            <div className="chart-card glass-card">
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={adherenceHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="date"
                            stroke="#64748b"
                            fontSize={12}
                            tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short' })}
                        />
                        <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                        <Tooltip
                            contentStyle={{
                                background: '#1a2236',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#f1f5f9',
                            }}
                        />
                        <Bar
                            dataKey="percentage"
                            fill="#10b981"
                            radius={[6, 6, 0, 0]}
                            name="Adherence %"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
