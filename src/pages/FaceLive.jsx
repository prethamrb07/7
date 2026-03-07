import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as faceapi from 'face-api.js';
import {
    Camera, Eye, Loader, Heart, Shield,
    Video, ShieldCheck, AlertCircle, UserX, Users
} from 'lucide-react';
import './FaceLive.css';
import './FaceRegister.css';

const MODEL_URL = '/models';

export default function FaceLive() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [permissionState, setPermissionState] = useState('idle');
    const [cameraActive, setCameraActive] = useState(false);
    const [recognizedPerson, setRecognizedPerson] = useState(null);
    const [unknownFace, setUnknownFace] = useState(false);
    const [faceMatcher, setFaceMatcher] = useState(null);
    const [registeredCount, setRegisteredCount] = useState(0);
    const [processingFps, setProcessingFps] = useState(0);
    const [registeredFaces, setRegisteredFaces] = useState([]);
    const detectionLoop = useRef(null);

    // Load models
    useEffect(() => {
        async function loadModels() {
            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                ]);
                setModelsLoaded(true);
                setLoading(false);
            } catch (err) {
                console.error('Failed to load models:', err);
                setLoading(false);
            }
        }
        loadModels();
    }, []);

    // Build face matcher
    useEffect(() => {
        if (!modelsLoaded) return;
        const saved = localStorage.getItem('pehchan_faces');
        if (!saved) return;
        try {
            const faces = JSON.parse(saved);
            setRegisteredCount(faces.length);
            setRegisteredFaces(faces);
            if (faces.length === 0) return;
            const labeled = faces.map(face => {
                const descriptors = face.descriptors.map(d => new Float32Array(d));
                return new faceapi.LabeledFaceDescriptors(face.id, descriptors);
            });
            setFaceMatcher(new faceapi.FaceMatcher(labeled, 0.5));
        } catch (e) {
            console.error('Failed to load face data:', e);
        }
    }, [modelsLoaded]);

    // Attach stream to video when permission granted
    useEffect(() => {
        if (permissionState === 'granted' && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            setCameraActive(true);
        }
    }, [permissionState]);

    // Request camera permission
    const requestPermission = useCallback(async () => {
        setPermissionState('requesting');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 960, height: 720, facingMode: 'user' },
            });
            streamRef.current = stream;
            setPermissionState('granted');
        } catch (err) {
            console.error('Camera permission denied:', err);
            setPermissionState('denied');
        }
    }, []);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraActive(false);
        if (detectionLoop.current) clearTimeout(detectionLoop.current);
    }, []);

    // Get face by id
    const getFaceById = useCallback((id) => {
        return registeredFaces.find(f => f.id === id) || null;
    }, [registeredFaces]);

    // Detection loop — draws BUBBLE LABELS on each face
    useEffect(() => {
        if (!cameraActive || !modelsLoaded || !faceMatcher) return;

        let running = true;
        let frameCount = 0;
        let lastFpsTime = Date.now();

        async function detect() {
            if (!running || !videoRef.current || videoRef.current.readyState < 2) {
                if (running) detectionLoop.current = setTimeout(() => requestAnimationFrame(detect), 300);
                return;
            }

            const detections = await faceapi
                .detectAllFaces(videoRef.current)
                .withFaceLandmarks()
                .withFaceDescriptors()
                .withFaceExpressions();

            frameCount++;
            const now = Date.now();
            if (now - lastFpsTime >= 1000) {
                setProcessingFps(frameCount);
                frameCount = 0;
                lastFpsTime = now;
            }

            if (canvasRef.current) {
                const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                let bestMatch = null;

                if (detections.length > 0) {
                    const resized = faceapi.resizeResults(detections, dims);

                    resized.forEach((det) => {
                        const match = faceMatcher.findBestMatch(det.descriptor);
                        const box = det.detection.box;
                        const isKnown = match.label !== 'unknown';
                        const person = isKnown ? getFaceById(match.label) : null;
                        const confidence = Math.round((1 - match.distance) * 100);

                        // Bounding box
                        ctx.strokeStyle = isKnown ? '#34d399' : '#ef4444';
                        ctx.lineWidth = 2.5;
                        ctx.strokeRect(box.x, box.y, box.width, box.height);

                        // Corner accents
                        const c = 18;
                        ctx.lineWidth = 3.5;
                        ctx.strokeStyle = isKnown ? '#6ee7b7' : '#f87171';
                        ctx.beginPath(); ctx.moveTo(box.x, box.y + c); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x + c, box.y); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(box.x + box.width - c, box.y); ctx.lineTo(box.x + box.width, box.y); ctx.lineTo(box.x + box.width, box.y + c); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(box.x, box.y + box.height - c); ctx.lineTo(box.x, box.y + box.height); ctx.lineTo(box.x + c, box.y + box.height); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(box.x + box.width - c, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height - c); ctx.stroke();

                        // ===== BUBBLE LABEL ABOVE HEAD =====
                        const label = person
                            ? `${person.name} — ${person.relationship}`
                            : 'Not recognized';

                        ctx.font = 'bold 14px Inter, system-ui, sans-serif';
                        const mainWidth = ctx.measureText(label).width;
                        const bubbleWidth = mainWidth + 24;
                        const bubbleHeight = 32;
                        const bubbleX = box.x + (box.width - bubbleWidth) / 2;
                        const bubbleY = box.y - bubbleHeight - 18;

                        // Bubble background
                        ctx.fillStyle = isKnown
                            ? 'rgba(16, 185, 129, 0.92)'
                            : 'rgba(239, 68, 68, 0.92)';
                        ctx.beginPath();
                        ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 10);
                        ctx.fill();

                        // Bubble pointer triangle
                        const triX = box.x + box.width / 2;
                        ctx.beginPath();
                        ctx.moveTo(triX - 8, bubbleY + bubbleHeight);
                        ctx.lineTo(triX, bubbleY + bubbleHeight + 10);
                        ctx.lineTo(triX + 8, bubbleY + bubbleHeight);
                        ctx.closePath();
                        ctx.fill();

                        // Label text
                        ctx.font = 'bold 14px Inter, system-ui, sans-serif';
                        ctx.fillStyle = '#ffffff';
                        ctx.fillText(label, bubbleX + 12, bubbleY + 21);

                        // Track best known for side panel
                        if (person && (!bestMatch || confidence > bestMatch.confidence)) {
                            bestMatch = { ...person, confidence };
                        }
                    });
                }

                if (bestMatch) {
                    setRecognizedPerson(bestMatch);
                    setUnknownFace(false);
                } else if (detections.length > 0) {
                    setRecognizedPerson(null);
                    setUnknownFace(true);
                } else {
                    setRecognizedPerson(null);
                    setUnknownFace(false);
                }
            }

            if (running) {
                detectionLoop.current = setTimeout(() => requestAnimationFrame(detect), 200);
            }
        }

        detect();
        return () => {
            running = false;
            if (detectionLoop.current) clearTimeout(detectionLoop.current);
        };
    }, [cameraActive, modelsLoaded, faceMatcher, getFaceById]);

    // Cleanup
    useEffect(() => { return () => stopCamera(); }, [stopCamera]);

    // ---- LOADING ----
    if (loading) {
        return (
            <div className="face-page">
                <div className="face-loading">
                    <Loader className="spin" size={40} />
                    <h2>Loading Face Recognition...</h2>
                    <p>Preparing AI models</p>
                </div>
            </div>
        );
    }

    // ---- PERMISSION SCREEN ----
    if (permissionState !== 'granted') {
        return (
            <div className="face-page live-page">
                <div className="permission-screen">
                    <motion.div className="permission-card glass-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <div className="permission-icon-wrap"><Video size={48} /></div>
                        <h2>Camera Access Required</h2>
                        <p>Pehchan needs your camera to recognize familiar faces in real time. All processing happens locally.</p>
                        <div className="permission-features">
                            <div className="perm-feature"><ShieldCheck size={16} /><span>AI runs entirely in your browser</span></div>
                            <div className="perm-feature"><Camera size={16} /><span>Camera is only active when you choose</span></div>
                            <div className="perm-feature"><Heart size={16} /><span>
                                {registeredCount > 0 ? `${registeredCount} face${registeredCount > 1 ? 's' : ''} ready to recognize` : 'Register faces first on the Register Face page'}
                            </span></div>
                        </div>
                        {permissionState === 'denied' && (
                            <div className="permission-denied-msg">
                                <AlertCircle size={16} /><span>Camera access denied. Allow camera in your browser settings.</span>
                            </div>
                        )}
                        <button className="btn-primary btn-large" onClick={requestPermission}
                            disabled={permissionState === 'requesting' || registeredCount === 0}>
                            {permissionState === 'requesting'
                                ? <><Loader className="spin" size={16} /> Requesting Access...</>
                                : permissionState === 'denied'
                                    ? <><Camera size={18} /> Try Again</>
                                    : <><Camera size={18} /> Allow Camera & Start</>}
                        </button>
                    </motion.div>
                </div>
            </div>
        );
    }

    // ---- LIVE RECOGNITION UI ----
    return (
        <div className="face-page live-page">
            <div className="live-container">
                <div className="live-status-bar">
                    <div className="live-status-left">
                        <Eye size={16} />
                        <span className="live-title">Pehchan Live Recognition</span>
                        {cameraActive && <span className="live-badge-green">● ACTIVE</span>}
                    </div>
                    <div className="live-status-right">
                        <span className="live-fps">{processingFps} FPS</span>
                        <span className="live-registered"><Shield size={12} />{registeredCount} registered</span>
                    </div>
                </div>

                <div className="live-grid">
                    {/* Camera Feed */}
                    <div className="live-camera-col">
                        <div className="live-camera-wrapper">
                            <video ref={videoRef} autoPlay muted playsInline className="live-video" />
                            <canvas ref={canvasRef} className="live-canvas" />
                        </div>
                        <button className="btn-secondary btn-stop" onClick={stopCamera}>Stop Camera</button>
                    </div>

                    {/* Side Panel */}
                    <div className="live-info-col">
                        <AnimatePresence mode="wait">
                            {recognizedPerson ? (
                                <motion.div key="recognized" className="recognition-card glass-card"
                                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>

                                    {/* Person header */}
                                    <div className="rec-header">
                                        <div className="rec-avatar" style={{ borderColor: recognizedPerson.color }}>
                                            {recognizedPerson.photo
                                                ? <img src={recognizedPerson.photo} alt="" className="rec-avatar-img" />
                                                : <span style={{ color: recognizedPerson.color }}>{recognizedPerson.name.charAt(0)}</span>}
                                        </div>
                                        <div className="rec-identity">
                                            <h2>{recognizedPerson.name}</h2>
                                            <span className="rec-relation" style={{ color: recognizedPerson.color }}>{recognizedPerson.relationship}</span>
                                        </div>
                                        <div className="rec-confidence">
                                            <div className="conf-ring" style={{
                                                '--conf': `${recognizedPerson.confidence}%`,
                                                '--conf-color': recognizedPerson.confidence > 85 ? '#34d399' : recognizedPerson.confidence > 60 ? '#fbbf24' : '#f87171'
                                            }}>
                                                <span>{recognizedPerson.confidence}%</span>
                                            </div>
                                            <span className="conf-label">Match</span>
                                        </div>
                                    </div>

                                    {/* Person info — relationship & notes */}
                                    <div className="rec-info-block">
                                        <div className="rec-info-row">
                                            <span className="rec-info-label">Relationship</span>
                                            <span className="rec-info-value">{recognizedPerson.relationship}</span>
                                        </div>
                                        {recognizedPerson.notes && (
                                            <div className="rec-info-row">
                                                <span className="rec-info-label">About</span>
                                                <span className="rec-info-value">{recognizedPerson.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div key="waiting" className="recognition-card glass-card waiting-card"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    {unknownFace ? (
                                        <><UserX size={40} className="waiting-icon" /><h3>Not Recognized</h3><p>This person is not registered. Add them on the Register Face page.</p></>
                                    ) : (
                                        <><Eye size={40} className="waiting-icon" /><h3>Scanning...</h3><p>Looking for familiar faces in the camera feed.</p></>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Registered people list */}
                        {registeredFaces.length > 0 && (
                            <div className="registered-list glass-card">
                                <h4 className="registered-list-title">
                                    <Users size={14} /> Registered People
                                </h4>
                                {registeredFaces.map(face => (
                                    <div key={face.id} className="registered-item">
                                        {face.photo ? (
                                            <img src={face.photo} alt="" className="registered-thumb" />
                                        ) : (
                                            <div className="registered-initial" style={{ borderColor: face.color }}>
                                                <span style={{ color: face.color }}>{face.name.charAt(0)}</span>
                                            </div>
                                        )}
                                        <div className="registered-info">
                                            <span className="registered-name">{face.name}</span>
                                            <span className="registered-rel">{face.relationship}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
