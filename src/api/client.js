/**
 * Pehchan — API Client
 *
 * Connects the React dashboard to the FastAPI backend.
 * Falls back to mock data when the backend is unavailable.
 */

const API_BASE = 'http://localhost:8080';
const WS_URL = 'ws://localhost:8080/ws/live';

/**
 * Fetch with fallback — returns null if the backend is unreachable.
 */
async function apiFetch(endpoint, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn(`[Pehchan API] ${endpoint} — offline or error:`, err.message);
        return null;
    }
}

/**
 * Get activity timeline events.
 */
export async function getActivities(limit = 50) {
    return apiFetch(`/api/activities?limit=${limit}`);
}

/**
 * Get alert history.
 */
export async function getAlerts(limit = 50, unresolvedOnly = false) {
    return apiFetch(`/api/alerts?limit=${limit}&unresolved=${unresolvedOnly}`);
}

/**
 * Get dashboard stats.
 */
export async function getStats() {
    return apiFetch('/api/stats');
}

/**
 * Get conversation history.
 */
export async function getConversations(limit = 20) {
    return apiFetch(`/api/conversations?limit=${limit}`);
}

/**
 * Get daily summary.
 */
export async function getSummary() {
    return apiFetch('/api/summary');
}

/**
 * Resolve an alert.
 */
export async function resolveAlert(alertId) {
    return apiFetch(`/api/alerts/${alertId}/resolve`, { method: 'POST' });
}

/**
 * Trigger test distress event.
 */
export async function testDistress() {
    return apiFetch('/test/distress', { method: 'POST' });
}

/**
 * Trigger test memory event.
 */
export async function testMemory() {
    return apiFetch('/test/memory', { method: 'POST' });
}

/**
 * Check if backend is online.
 */
export async function checkHealth() {
    const data = await apiFetch('/');
    return data !== null;
}

/**
 * WebSocket connection for live dashboard updates.
 *
 * Usage:
 *   const ws = connectLive((event) => {
 *     if (event.type === 'activity') { ... }
 *     if (event.type === 'alert') { ... }
 *     if (event.type === 'transcript') { ... }
 *   });
 *
 *   // Later: ws.close();
 */
export function connectLive(onMessage) {
    let ws = null;
    let reconnectTimer = null;
    let pingInterval = null;

    function connect() {
        try {
            ws = new WebSocket(WS_URL);

            ws.onopen = () => {
                console.log('📡 Connected to Pehchan live feed');
                // Keep-alive ping every 30s
                pingInterval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send('ping');
                    }
                }, 30000);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type !== 'pong') {
                        onMessage(data);
                    }
                } catch (err) {
                    // Ignore non-JSON messages
                }
            };

            ws.onclose = () => {
                console.log('📡 Disconnected from live feed. Reconnecting in 5s...');
                clearInterval(pingInterval);
                reconnectTimer = setTimeout(connect, 5000);
            };

            ws.onerror = () => {
                // Will trigger onclose
            };
        } catch (err) {
            console.warn('📡 WebSocket connection failed. Retrying in 5s...');
            reconnectTimer = setTimeout(connect, 5000);
        }
    }

    connect();

    // Return control object
    return {
        close: () => {
            clearTimeout(reconnectTimer);
            clearInterval(pingInterval);
            if (ws) ws.close();
        },
    };
}
