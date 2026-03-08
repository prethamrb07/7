import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bluetooth, BluetoothOff, Battery, Cpu, Radio, Volume2,
    Mic, MicOff, AlertTriangle, Wifi, Play, Square, Trash2,
    Glasses
} from 'lucide-react';
import './OmiConnect.css';

/* ============================
   OMI BLE CONSTANTS
   ============================ */
const OMI_AUDIO_SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
const OMI_AUDIO_DATA_UUID = '19b10001-e8f2-537e-4f6c-d104768a1214';
const OMI_CODEC_UUID = '19b10002-e8f2-537e-4f6c-d104768a1214';
const BATTERY_SERVICE_UUID = 0x180F;
const BATTERY_LEVEL_UUID = 0x2A19;
const DEVICE_INFO_SERVICE_UUID = 0x180A;
const FIRMWARE_REV_UUID = 0x2A26;
const MODEL_NUMBER_UUID = 0x2A24;

const SAMPLE_RATE = 16000; // 16kHz PCM16

/* ============================
   MAIN COMPONENT
   ============================ */
export default function OmiConnect() {
    const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected
    const [device, setDevice] = useState(null);
    const [deviceInfo, setDeviceInfo] = useState({
        name: '',
        model: '',
        firmware: '',
        battery: 0,
    });
    const [streaming, setStreaming] = useState(false);
    const [transcripts, setTranscripts] = useState([]);
    const [audioLevel, setAudioLevel] = useState(0);
    const [supported, setSupported] = useState(true);

    const serverRef = useRef(null);
    const audioCharRef = useRef(null);
    const canvasRef = useRef(null);
    const animRef = useRef(null);
    const audioBufferRef = useRef([]);
    const recognitionRef = useRef(null);

    // Check browser support
    useEffect(() => {
        if (!navigator.bluetooth) {
            setSupported(false);
        }
    }, []);

    // ---- CONNECT via Web Bluetooth ----
    const connectToOmi = useCallback(async () => {
        if (!navigator.bluetooth) {
            alert('Web Bluetooth is not supported in this browser. Use Chrome on desktop or Android.');
            return;
        }

        try {
            setStatus('connecting');

            // Request device with Omi Audio service
            const bleDevice = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: [OMI_AUDIO_SERVICE_UUID] },
                    { namePrefix: 'Omi' },
                    { namePrefix: 'Friend' },
                ],
                optionalServices: [
                    BATTERY_SERVICE_UUID,
                    DEVICE_INFO_SERVICE_UUID,
                    OMI_AUDIO_SERVICE_UUID,
                ],
            });

            bleDevice.addEventListener('gattserverdisconnected', handleDisconnect);
            setDevice(bleDevice);

            // Connect to GATT server
            const server = await bleDevice.gatt.connect();
            serverRef.current = server;

            // Read device info
            const info = { name: bleDevice.name || 'Omi Device', model: '', firmware: '', battery: 0 };

            try {
                const batteryService = await server.getPrimaryService(BATTERY_SERVICE_UUID);
                const batteryChar = await batteryService.getCharacteristic(BATTERY_LEVEL_UUID);
                const batteryVal = await batteryChar.readValue();
                info.battery = batteryVal.getUint8(0);

                // Listen for battery updates
                await batteryChar.startNotifications();
                batteryChar.addEventListener('characteristicvaluechanged', (e) => {
                    const level = e.target.value.getUint8(0);
                    setDeviceInfo(prev => ({ ...prev, battery: level }));
                });
            } catch (e) {
                console.log('Battery service not available:', e.message);
            }

            try {
                const deviceInfoService = await server.getPrimaryService(DEVICE_INFO_SERVICE_UUID);
                try {
                    const modelChar = await deviceInfoService.getCharacteristic(MODEL_NUMBER_UUID);
                    const modelVal = await modelChar.readValue();
                    info.model = new TextDecoder().decode(modelVal);
                } catch (_) { }
                try {
                    const fwChar = await deviceInfoService.getCharacteristic(FIRMWARE_REV_UUID);
                    const fwVal = await fwChar.readValue();
                    info.firmware = new TextDecoder().decode(fwVal);
                } catch (_) { }
            } catch (e) {
                console.log('Device info service not available:', e.message);
            }

            // Get audio service
            try {
                const audioService = await server.getPrimaryService(OMI_AUDIO_SERVICE_UUID);
                const audioChar = await audioService.getCharacteristic(OMI_AUDIO_DATA_UUID);
                audioCharRef.current = audioChar;

                // Try to read codec
                try {
                    const codecChar = await audioService.getCharacteristic(OMI_CODEC_UUID);
                    const codecVal = await codecChar.readValue();
                    console.log('Codec:', codecVal.getUint8(0));
                } catch (_) { }
            } catch (e) {
                console.log('Audio service:', e.message);
            }

            setDeviceInfo(info);
            setStatus('connected');

        } catch (err) {
            console.error('BLE connection failed:', err);
            setStatus('disconnected');
            if (err.name !== 'NotFoundError') {
                // NotFoundError = user cancelled the picker
                alert('Connection failed: ' + err.message);
            }
        }
    }, []);

    const handleDisconnect = useCallback(() => {
        setStatus('disconnected');
        setStreaming(false);
        setDevice(null);
        serverRef.current = null;
        audioCharRef.current = null;
        if (animRef.current) cancelAnimationFrame(animRef.current);
    }, []);

    const disconnect = useCallback(() => {
        if (device && device.gatt.connected) {
            device.gatt.disconnect();
        }
        handleDisconnect();
    }, [device, handleDisconnect]);

    // ---- AUDIO STREAMING ----
    const startStreaming = useCallback(async () => {
        if (!audioCharRef.current) return;

        try {
            await audioCharRef.current.startNotifications();
            audioCharRef.current.addEventListener('characteristicvaluechanged', handleAudioData);
            setStreaming(true);
            audioBufferRef.current = [];

            // Start speech recognition in parallel
            startSpeechRecognition();

            // Start visualizer
            drawVisualizer();
        } catch (err) {
            console.error('Failed to start audio stream:', err);
        }
    }, []);

    const stopStreaming = useCallback(async () => {
        if (audioCharRef.current) {
            try {
                audioCharRef.current.removeEventListener('characteristicvaluechanged', handleAudioData);
                await audioCharRef.current.stopNotifications();
            } catch (_) { }
        }
        setStreaming(false);
        if (animRef.current) cancelAnimationFrame(animRef.current);
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (_) { }
        }
    }, []);

    const handleAudioData = useCallback((event) => {
        const data = event.target.value;
        // PCM16 little-endian, 2 bytes per sample
        const samples = [];
        for (let i = 0; i < data.byteLength; i += 2) {
            const sample = data.getInt16(i, true); // little-endian
            samples.push(sample);
        }
        audioBufferRef.current = samples;

        // Calculate RMS audio level
        const rms = Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length);
        const normalized = Math.min(1, rms / 10000);
        setAudioLevel(normalized);
    }, []);

    // ---- SPEECH RECOGNITION (browser-based transcription) ----
    const startSpeechRecognition = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    const text = event.results[i][0].transcript.trim();
                    if (text) {
                        const now = new Date();
                        const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        setTranscripts(prev => [{ id: Date.now(), text, time }, ...prev]);
                    }
                }
            }
        };

        recognition.onerror = (e) => {
            console.log('Speech recognition error:', e.error);
            // Restart on non-fatal errors
            if (e.error === 'no-speech' || e.error === 'audio-capture') {
                setTimeout(() => {
                    try { recognition.start(); } catch (_) { }
                }, 1000);
            }
        };

        recognition.onend = () => {
            // Auto-restart if still streaming
            if (streaming) {
                try { recognition.start(); } catch (_) { }
            }
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
        } catch (_) { }
    }, [streaming]);

    // ---- VISUALIZER ----
    const drawVisualizer = useCallback(() => {
        const draw = () => {
            if (!canvasRef.current) return;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = 120;

            ctx.fillStyle = 'rgba(6, 10, 20, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const samples = audioBufferRef.current;
            if (samples.length > 0) {
                ctx.beginPath();
                ctx.strokeStyle = '#7c8a5c';
                ctx.lineWidth = 2;

                const step = Math.ceil(samples.length / canvas.width);
                for (let i = 0; i < canvas.width; i++) {
                    const idx = i * step;
                    const val = idx < samples.length ? samples[idx] / 32768 : 0;
                    const y = (0.5 + val * 0.4) * canvas.height;
                    if (i === 0) ctx.moveTo(i, y);
                    else ctx.lineTo(i, y);
                }
                ctx.stroke();
            } else {
                // Draw flat line
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
                ctx.lineWidth = 1;
                ctx.moveTo(0, canvas.height / 2);
                ctx.lineTo(canvas.width, canvas.height / 2);
                ctx.stroke();
            }

            animRef.current = requestAnimationFrame(draw);
        };
        draw();
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (_) { }
            }
        };
    }, []);

    // Canvas resize
    useEffect(() => {
        if (canvasRef.current && canvasRef.current.parentElement) {
            canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
            canvasRef.current.height = 120;
        }
    }, [status]);

    return (
        <div className="omi-page">
            <div className="omi-container">
                <div className="omi-header">
                    <h1>
                        <span className="gradient-text">Omi Connect</span>
                    </h1>
                    <p>
                        Connect directly to your Omi Smart Glasses via Bluetooth.
                        Stream audio, view transcripts, and monitor device status — no Omi app required.
                    </p>
                </div>

                {/* Browser Support Warning */}
                {!supported && (
                    <div className="omi-browser-warning">
                        <AlertTriangle size={16} />
                        <div>
                            <strong>Web Bluetooth is not supported in this browser.</strong><br />
                            Please use <strong>Google Chrome</strong> on desktop or Android. Safari and Firefox don't support Web Bluetooth yet.
                        </div>
                    </div>
                )}

                {/* Connection Card */}
                <motion.div
                    className={`omi-connect-card ${status}`}
                    layout
                >
                    <div className={`omi-device-icon ${status}`}>
                        {status === 'connected' ? '🟢' : status === 'connecting' ? '🔵' : '👓'}
                    </div>

                    <div className={`omi-status-label ${status}`}>
                        {status === 'connected' && `Connected to ${deviceInfo.name}`}
                        {status === 'connecting' && 'Connecting...'}
                        {status === 'disconnected' && 'No Device Connected'}
                    </div>

                    <div className="omi-status-sub">
                        {status === 'connected'
                            ? 'Omi glasses paired via Bluetooth Low Energy'
                            : status === 'connecting'
                                ? 'Searching for nearby Omi devices...'
                                : 'Pair your Omi Smart Glasses to start streaming'}
                    </div>

                    {status === 'disconnected' && (
                        <button
                            className="omi-connect-btn"
                            onClick={connectToOmi}
                            disabled={!supported}
                        >
                            <Bluetooth size={16} /> Connect Omi Glasses
                        </button>
                    )}

                    {status === 'connecting' && (
                        <button className="omi-connect-btn" disabled>
                            <Radio size={16} className="spin" /> Scanning...
                        </button>
                    )}

                    {status === 'connected' && (
                        <button className="omi-connect-btn disconnect" onClick={disconnect}>
                            <BluetoothOff size={14} /> Disconnect
                        </button>
                    )}
                </motion.div>

                {/* Device Info */}
                {status === 'connected' && (
                    <motion.div
                        className="omi-info-grid"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="omi-info-card">
                            <div className="omi-info-value">
                                <Battery size={18} style={{ color: deviceInfo.battery > 20 ? '#7c8a5c' : '#b06060' }} />{' '}
                                {deviceInfo.battery}%
                            </div>
                            <div className="omi-info-label">Battery</div>
                        </div>
                        <div className="omi-info-card">
                            <div className="omi-info-value">{deviceInfo.model || 'Omi'}</div>
                            <div className="omi-info-label">Model</div>
                        </div>
                        <div className="omi-info-card">
                            <div className="omi-info-value">{deviceInfo.firmware || '—'}</div>
                            <div className="omi-info-label">Firmware</div>
                        </div>
                        <div className="omi-info-card">
                            <div className="omi-info-value">
                                {streaming
                                    ? <><span className="omi-live-dot" /> Live</>
                                    : 'Idle'}
                            </div>
                            <div className="omi-info-label">Stream</div>
                        </div>
                    </motion.div>
                )}

                {/* Audio Stream Panel */}
                {status === 'connected' && (
                    <motion.div
                        className="omi-audio-panel"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="omi-panel-header">
                            <Volume2 size={18} style={{ color: '#7c8a5c' }} />
                            <h3>Audio Stream</h3>
                        </div>

                        <div className="omi-audio-visualizer">
                            <canvas ref={canvasRef} />
                        </div>

                        <div className="omi-stream-controls">
                            {!streaming ? (
                                <button className="omi-stream-btn" onClick={startStreaming}>
                                    <Play size={14} /> Start Streaming
                                </button>
                            ) : (
                                <button className="omi-stream-btn active" onClick={stopStreaming}>
                                    <Square size={14} /> Stop Streaming
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Transcripts */}
                {status === 'connected' && (
                    <motion.div
                        className="omi-transcript"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="omi-panel-header">
                            <Mic size={18} style={{ color: '#b8a89a' }} />
                            <h3>Live Transcripts</h3>
                            {transcripts.length > 0 && (
                                <button
                                    className="omi-stream-btn"
                                    onClick={() => setTranscripts([])}
                                    style={{ marginLeft: 'auto' }}
                                >
                                    <Trash2 size={12} /> Clear
                                </button>
                            )}
                        </div>

                        {transcripts.length === 0 ? (
                            <div className="omi-transcript-empty">
                                {streaming
                                    ? '🎙️ Listening for speech...'
                                    : "Start streaming to see live transcripts from your Omi glasses"}
                            </div>
                        ) : (
                            <div className="omi-transcript-list">
                                <AnimatePresence>
                                    {transcripts.map(t => (
                                        <motion.div
                                            key={t.id}
                                            className="omi-transcript-item"
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <div className="omi-transcript-time">{t.time}</div>
                                            <div className="omi-transcript-text">{t.text}</div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
