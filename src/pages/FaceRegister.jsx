import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as faceapi from 'face-api.js';
import {
    Camera, UserPlus, Trash2, CheckCircle2, AlertCircle,
    Loader, X, Heart, Users, Save, ShieldCheck, Video
} from 'lucide-react';
import './FaceRegister.css';

const MODEL_URL = '/models';

export default function FaceRegister() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [permissionState, setPermissionState] = useState('idle');
    const [cameraActive, setCameraActive] = useState(false);
    const [detectedFace, setDetectedFace] = useState(null);
    const [registeredFaces, setRegisteredFaces] = useState([]);
    const [formData, setFormData] = useState({ name: '', relationship: '', notes: '' });
    const [capturedDescriptors, setCapturedDescriptors] = useState([]);
    const [capturedPhotos, setCapturedPhotos] = useState([]);
    const [captureCount, setCaptureCount] = useState(0);
    const [message, setMessage] = useState(null);
    const detectionInterval = useRef(null);

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
                console.error('Failed to load face models:', err);
                setMessage({ type: 'error', text: 'Failed to load face recognition models.' });
                setLoading(false);
            }
        }
        loadModels();
    }, []);

    // Load saved faces
    useEffect(() => {
        const saved = localStorage.getItem('pehchan_faces');
        if (saved) {
            try { setRegisteredFaces(JSON.parse(saved)); } catch (e) { }
        }
    }, []);

    // When permissionState becomes 'granted', attach stream to video
    useEffect(() => {
        if (permissionState === 'granted' && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            setCameraActive(true);
        }
    }, [permissionState]);

    // Request camera permission — stores stream in ref
    const requestPermission = useCallback(async () => {
        setPermissionState('requesting');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
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
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
        setDetectedFace(null);
        if (detectionInterval.current) clearInterval(detectionInterval.current);
    }, []);

    // Restart camera (after stopping)
    const restartCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setCameraActive(true);
        } catch (err) {
            console.error('Failed to restart camera:', err);
        }
    }, []);

    // Face detection loop
    useEffect(() => {
        if (!cameraActive || !modelsLoaded) return;

        detectionInterval.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;

            const detection = await faceapi
                .detectSingleFace(videoRef.current)
                .withFaceLandmarks()
                .withFaceDescriptor()
                .withFaceExpressions();

            if (detection && canvasRef.current) {
                setDetectedFace(detection);
                const dims = faceapi.matchDimensions(canvasRef.current, videoRef.current, true);
                const resized = faceapi.resizeResults(detection, dims);
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                const box = resized.detection.box;
                // Blue bounding box
                ctx.strokeStyle = '#7c8a5c';
                ctx.lineWidth = 2;
                ctx.strokeRect(box.x, box.y, box.width, box.height);

                // Corner accents
                const c = 16;
                ctx.strokeStyle = '#6b7a4e';
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(box.x, box.y + c); ctx.lineTo(box.x, box.y); ctx.lineTo(box.x + c, box.y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(box.x + box.width - c, box.y); ctx.lineTo(box.x + box.width, box.y); ctx.lineTo(box.x + box.width, box.y + c); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(box.x, box.y + box.height - c); ctx.lineTo(box.x, box.y + box.height); ctx.lineTo(box.x + c, box.y + box.height); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(box.x + box.width - c, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height); ctx.lineTo(box.x + box.width, box.y + box.height - c); ctx.stroke();

                // Green label
                const label = '✅ Face Detected — Ready to Capture';
                ctx.font = 'bold 12px Inter, system-ui, sans-serif';
                const tw = ctx.measureText(label).width;
                const lx = box.x + (box.width - tw - 16) / 2;
                const ly = box.y + box.height + 8;
                ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
                ctx.beginPath(); ctx.roundRect(lx, ly, tw + 16, 24, 6); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.fillText(label, lx + 8, ly + 16);
            } else {
                setDetectedFace(null);
                if (canvasRef.current) {
                    canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
            }
        }, 300);

        return () => { if (detectionInterval.current) clearInterval(detectionInterval.current); };
    }, [cameraActive, modelsLoaded]);

    // Cleanup on unmount
    useEffect(() => { return () => stopCamera(); }, [stopCamera]);

    // Capture face — save descriptor + snapshot photo
    const captureFace = () => {
        if (!detectedFace) {
            setMessage({ type: 'error', text: 'No face detected. Look at the camera.' });
            return;
        }
        // Save descriptor
        const descriptor = Array.from(detectedFace.descriptor);
        setCapturedDescriptors(prev => [...prev, descriptor]);

        // Snapshot the video frame as image
        const video = videoRef.current;
        if (video) {
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = video.videoWidth;
            tmpCanvas.height = video.videoHeight;
            const tmpCtx = tmpCanvas.getContext('2d');
            tmpCtx.drawImage(video, 0, 0);
            const dataUrl = tmpCanvas.toDataURL('image/jpeg', 0.8);
            setCapturedPhotos(prev => [...prev, dataUrl]);
        }

        setCaptureCount(prev => prev + 1);
        setMessage({ type: 'success', text: `Captured! (${captureCount + 1}/3) — Move your head slightly for the next.` });
    };

    // Save face
    const saveFace = () => {
        if (capturedDescriptors.length === 0) {
            setMessage({ type: 'error', text: 'Capture at least one face image first.' });
            return;
        }
        if (!formData.name.trim()) {
            setMessage({ type: 'error', text: 'Enter a name.' });
            return;
        }
        if (!formData.relationship.trim()) {
            setMessage({ type: 'error', text: 'Select a relationship.' });
            return;
        }

        const newFace = {
            id: Date.now().toString(),
            name: formData.name.trim(),
            relationship: formData.relationship.trim(),
            notes: formData.notes.trim(),
            descriptors: capturedDescriptors,
            photo: capturedPhotos[0] || null,
            registeredAt: new Date().toISOString(),
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        };

        const updated = [...registeredFaces, newFace];
        setRegisteredFaces(updated);
        localStorage.setItem('pehchan_faces', JSON.stringify(updated));

        setFormData({ name: '', relationship: '', notes: '' });
        setCapturedDescriptors([]);
        setCapturedPhotos([]);
        setCaptureCount(0);
        setMessage({ type: 'success', text: `${newFace.name} registered! They can now be recognized.` });
    };

    const deleteFace = (id) => {
        const updated = registeredFaces.filter(f => f.id !== id);
        setRegisteredFaces(updated);
        localStorage.setItem('pehchan_faces', JSON.stringify(updated));
        setMessage({ type: 'success', text: 'Face removed.' });
    };

    const resetCapture = () => {
        setCapturedDescriptors([]);
        setCapturedPhotos([]);
        setCaptureCount(0);
        setFormData({ name: '', relationship: '', notes: '' });
    };

    // ---- LOADING ----
    if (loading) {
        return (
            <div className="face-page">
                <div className="face-loading">
                    <Loader className="spin" size={40} />
                    <h2>Loading Face Recognition Models...</h2>
                    <p>This may take a moment on first load</p>
                </div>
            </div>
        );
    }

    // ---- PERMISSION SCREEN ----
    if (permissionState !== 'granted') {
        return (
            <div className="face-page">
                <div className="permission-screen">
                    <motion.div className="permission-card glass-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                        <div className="permission-icon-wrap"><Video size={48} /></div>
                        <h2>Camera Access Required</h2>
                        <p>Pehchan needs your camera to scan and recognize familiar faces. Your data stays on this device and is never uploaded.</p>
                        <div className="permission-features">
                            <div className="perm-feature"><ShieldCheck size={16} /><span>All processing happens locally in your browser</span></div>
                            <div className="perm-feature"><Camera size={16} /><span>Camera is only active when you choose</span></div>
                            <div className="perm-feature"><Heart size={16} /><span>Face data is stored only on your device</span></div>
                        </div>
                        {permissionState === 'denied' && (
                            <div className="permission-denied-msg">
                                <AlertCircle size={16} />
                                <span>Camera access was denied. Please allow camera in your browser settings and try again.</span>
                            </div>
                        )}
                        <button className="btn-primary btn-large" onClick={requestPermission} disabled={permissionState === 'requesting'}>
                            {permissionState === 'requesting'
                                ? <><Loader className="spin" size={16} /> Requesting Access...</>
                                : permissionState === 'denied'
                                    ? <><Camera size={18} /> Try Again</>
                                    : <><Camera size={18} /> Allow Camera Access</>}
                        </button>
                    </motion.div>
                </div>
            </div>
        );
    }

    // ---- MAIN REGISTRATION UI ----
    return (
        <div className="face-page">
            <div className="face-container">
                <motion.div className="face-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="face-title-row">
                        <UserPlus size={28} />
                        <div>
                            <h1>Register Faces</h1>
                            <p>Add familiar people so Pehchan can recognize them</p>
                        </div>
                    </div>
                </motion.div>

                <AnimatePresence>
                    {message && (
                        <motion.div className={`face-message ${message.type}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            <span>{message.text}</span>
                            <button onClick={() => setMessage(null)}><X size={14} /></button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="face-main-grid">
                    {/* Camera */}
                    <motion.div className="face-camera-section glass-card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <div className="face-camera-wrapper">
                            <video ref={videoRef} autoPlay muted playsInline className="face-video" />
                            <canvas ref={canvasRef} className="face-canvas" />
                            {!cameraActive && (
                                <div className="camera-placeholder">
                                    <Camera size={48} />
                                    <p>Camera stopped</p>
                                    <button className="btn-primary" onClick={restartCamera}>
                                        <Camera size={16} /> Restart Camera
                                    </button>
                                </div>
                            )}
                            {cameraActive && !detectedFace && (
                                <div className="camera-overlay">
                                    <div className="face-indicator">👀 Looking for face...</div>
                                </div>
                            )}
                        </div>

                        {cameraActive && (
                            <div className="camera-controls">
                                <button className="btn-primary" onClick={captureFace} disabled={!detectedFace}>
                                    <Camera size={16} /> Capture ({captureCount}/3)
                                </button>
                                <button className="btn-secondary" onClick={stopCamera}>Stop Camera</button>
                            </div>
                        )}

                        {/* Show captured photo thumbnails */}
                        {capturedPhotos.length > 0 && (
                            <div className="captured-photos">
                                <span className="photos-label">Captured Photos:</span>
                                <div className="photos-row">
                                    {capturedPhotos.map((photo, i) => (
                                        <div key={i} className="photo-thumb">
                                            <img src={photo} alt={`Capture ${i + 1}`} />
                                            <span className="photo-num">{i + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Form */}
                    <motion.div className="face-form-section glass-card" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                        <h3 className="form-title">Person Details</h3>

                        <div className="form-group">
                            <label>Full Name *</label>
                            <input type="text" placeholder="e.g., Sarah Mitchell" value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} />
                        </div>

                        <div className="form-group">
                            <label>Relationship *</label>
                            <select value={formData.relationship}
                                onChange={e => setFormData(prev => ({ ...prev, relationship: e.target.value }))}>
                                <option value="">Select relationship</option>
                                <option value="Daughter">Daughter</option>
                                <option value="Son">Son</option>
                                <option value="Spouse">Spouse</option>
                                <option value="Grandchild">Grandchild</option>
                                <option value="Sibling">Sibling</option>
                                <option value="Caregiver">Caregiver</option>
                                <option value="Doctor">Doctor</option>
                                <option value="Nurse">Nurse</option>
                                <option value="Friend">Friend</option>
                                <option value="Neighbor">Neighbor</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Notes (what to tell the patient)</label>
                            <textarea placeholder="e.g., She visits every Sunday. She loves you very much."
                                value={formData.notes}
                                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                rows={3} />
                        </div>

                        <div className="form-actions">
                            <button className="btn-primary btn-save" onClick={saveFace}
                                disabled={capturedDescriptors.length === 0 || !formData.name}>
                                <Save size={16} /> Save Person
                            </button>
                            <button className="btn-secondary" onClick={resetCapture}>Reset</button>
                        </div>
                    </motion.div>
                </div>

                {/* Gallery */}
                <motion.div className="face-gallery-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <h3 className="section-label"><Users size={16} /> Registered People ({registeredFaces.length})</h3>

                    {registeredFaces.length === 0 ? (
                        <div className="gallery-empty glass-card">
                            <Heart size={32} /><p>No faces registered yet. Capture a familiar face above.</p>
                        </div>
                    ) : (
                        <div className="gallery-grid">
                            {registeredFaces.map((face, i) => (
                                <motion.div key={face.id} className="gallery-card glass-card"
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                                    {face.photo ? (
                                        <img className="gallery-photo" src={face.photo} alt={face.name} />
                                    ) : (
                                        <div className="gallery-avatar" style={{ borderColor: face.color }}>
                                            <span style={{ color: face.color }}>{face.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                    )}
                                    <h4>{face.name}</h4>
                                    <span className="gallery-relation" style={{ color: face.color }}>{face.relationship}</span>
                                    {face.notes && <p className="gallery-notes">{face.notes}</p>}
                                    <div className="gallery-meta">
                                        <span>{face.descriptors.length} captures</span>
                                        <button className="btn-delete" onClick={() => deleteFace(face.id)} title="Remove">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
