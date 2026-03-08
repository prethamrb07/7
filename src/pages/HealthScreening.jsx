import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Mic, Brain, AlertTriangle, Play, Square,
    RotateCcw, CheckCircle, Wind, MessageSquare, Grid3X3
} from 'lucide-react';
import './HealthScreening.css';

/* ============================
   WORD LIST FOR SPEECH TEST
   ============================ */
const WORD_POOL = [
    'apple', 'basket', 'morning', 'garden', 'river',
    'silver', 'bottle', 'window', 'purple', 'hammer',
    'kitchen', 'orange', 'blanket', 'circle', 'mountain',
    'finger', 'planet', 'doctor', 'pencil', 'button',
];

function randomPhrase(n = 4) {
    const words = [];
    const pool = [...WORD_POOL];
    for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        words.push(pool.splice(idx, 1)[0]);
    }
    return words.join(' ');
}

/* ============================
   LEVENSHTEIN SIMILARITY
   ============================ */
function levenshtein(a, b) {
    const m = a.length + 1;
    const n = b.length + 1;
    const dp = Array.from({ length: m }, () => Array(n).fill(0));
    for (let i = 0; i < m; i++) dp[i][0] = i;
    for (let j = 0; j < n; j++) dp[0][j] = j;
    for (let i = 1; i < m; i++) {
        for (let j = 1; j < n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]) + 1;
        }
    }
    const dist = dp[m - 1][n - 1];
    return 1 - dist / Math.max(a.length, b.length, 1);
}

/* ============================
   MAIN COMPONENT
   ============================ */
export default function HealthScreening() {
    const [activeTest, setActiveTest] = useState(null);
    const [results, setResults] = useState({ breath: null, speech: null, memory: null });

    const tests = [
        {
            id: 'breath',
            name: 'Breathing Analysis',
            desc: 'Record your breathing to detect irregularities',
            icon: <Wind size={22} />,
            gradient: 'linear-gradient(135deg, #8a9a68, #a3b07e)',
        },
        {
            id: 'speech',
            name: 'Speech Clarity',
            desc: 'Read a phrase aloud to test speech patterns',
            icon: <MessageSquare size={22} />,
            gradient: 'linear-gradient(135deg, #b8a89a, #d4917a)',
        },
        {
            id: 'memory',
            name: 'Memory Pattern',
            desc: 'Remember and repeat a visual pattern',
            icon: <Grid3X3 size={22} />,
            gradient: 'linear-gradient(135deg, #7c8a5c, #a3b07e)',
        },
    ];

    return (
        <div className="screening-page">
            <div className="screening-container">
                <div className="screening-header">
                    <h1>
                        <span className="gradient-text">Health Screening</span>
                    </h1>
                    <p>
                        Quick cognitive and respiratory assessments to monitor early warning signs.
                        Inspired by <a href="https://github.com/neel-banga/BrainWave-MountainHacks" target="_blank" rel="noopener" style={{ color: '#7c8a5c' }}>BrainWave</a>.
                    </p>
                    <div className="screening-disclaimer">
                        <AlertTriangle size={14} />
                        <span>This is a screening tool, not a medical diagnosis. Consult a doctor for concerns.</span>
                    </div>
                </div>

                {/* Test Selection */}
                <div className="test-selection">
                    {tests.map(t => (
                        <motion.div
                            key={t.id}
                            className={`test-select-card ${activeTest === t.id ? 'active' : ''} ${results[t.id] !== null ? 'completed' : ''}`}
                            onClick={() => setActiveTest(t.id)}
                            whileHover={{ y: -3 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {results[t.id] !== null && (
                                <span className="test-card-badge done">
                                    <CheckCircle size={10} /> Done
                                </span>
                            )}
                            <div className="test-card-icon" style={{ background: t.gradient }}>{t.icon}</div>
                            <div className="test-card-name">{t.name}</div>
                            <div className="test-card-desc">{t.desc}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Active Test Panel */}
                <AnimatePresence mode="wait">
                    {activeTest && (
                        <motion.div
                            key={activeTest}
                            className="test-panel"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeTest === 'breath' && (
                                <BreathTest result={results.breath} onResult={r => setResults(p => ({ ...p, breath: r }))} />
                            )}
                            {activeTest === 'speech' && (
                                <SpeechTest result={results.speech} onResult={r => setResults(p => ({ ...p, speech: r }))} />
                            )}
                            {activeTest === 'memory' && (
                                <MemoryTest result={results.memory} onResult={r => setResults(p => ({ ...p, memory: r }))} />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

/* =============================================
   TEST 1: BREATHING ANALYSIS
   ============================================= */
function BreathTest({ result, onResult }) {
    const [recording, setRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const canvasRef = useRef(null);
    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const streamRef = useRef(null);
    const animRef = useRef(null);
    const dataRef = useRef([]);
    const timerRef = useRef(null);

    const DURATION = 10; // seconds

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioCtxRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            analyserRef.current = analyser;
            dataRef.current = [];
            setRecording(true);
            setSeconds(0);

            // Timer
            let sec = 0;
            timerRef.current = setInterval(() => {
                sec++;
                setSeconds(sec);
                if (sec >= DURATION) {
                    stopRecording();
                }
            }, 1000);

            // Visualize
            const draw = () => {
                if (!canvasRef.current || !analyserRef.current) return;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyser.getByteFrequencyData(dataArray);

                // Collect amplitude data
                const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
                dataRef.current.push(avg);

                ctx.fillStyle = 'rgba(6, 10, 20, 0.3)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const barWidth = (canvas.width / bufferLength) * 2.5;
                let x = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
                    const hue = (dataArray[i] / 255) * 120;
                    ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
                    ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                    x += barWidth + 1;
                }
                animRef.current = requestAnimationFrame(draw);
            };
            draw();
        } catch (err) {
            console.error('Microphone access denied:', err);
        }
    }, []);

    const stopRecording = useCallback(() => {
        setRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
        if (animRef.current) cancelAnimationFrame(animRef.current);
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (audioCtxRef.current) audioCtxRef.current.close();

        // Analyze collected data
        const data = dataRef.current;
        if (data.length === 0) return;

        const avgAmplitude = data.reduce((a, b) => a + b, 0) / data.length;
        const maxAmp = Math.max(...data);
        const variance = data.reduce((sum, v) => sum + Math.pow(v - avgAmplitude, 2), 0) / data.length;
        const stdDev = Math.sqrt(variance);

        // Higher variance and spikes may indicate wheezing
        const irregularity = Math.min(100, Math.round((stdDev / (avgAmplitude + 1)) * 100));
        const score = Math.max(0, 100 - irregularity);

        onResult({
            score,
            avgAmplitude: Math.round(avgAmplitude),
            maxAmplitude: Math.round(maxAmp),
            irregularity,
            samples: data.length,
        });
    }, [onResult]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animRef.current) cancelAnimationFrame(animRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close();
        };
    }, []);

    // Canvas resize
    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
            canvasRef.current.height = 200;
        }
    }, []);

    if (result) {
        const level = result.score >= 75 ? 'good' : result.score >= 50 ? 'moderate' : 'concern';
        return (
            <div className="test-result">
                <Activity size={32} style={{ color: '#8a9a68', marginBottom: 12 }} />
                <div className={`result-score ${level}`}>{result.score}%</div>
                <div className="result-label">Breathing Regularity Score</div>
                <div className="result-message">
                    {result.score >= 75
                        ? 'Your breathing pattern appears regular and consistent. No irregularities detected.'
                        : result.score >= 50
                            ? 'Some variation detected in your breathing pattern. This could be normal, but consider monitoring.'
                            : 'Notable irregularities detected. Please consult a healthcare professional for a proper evaluation.'}
                </div>
                <div className="test-actions">
                    <button className="test-btn test-btn-secondary" onClick={() => onResult(null)}>
                        <RotateCcw size={14} /> Retake
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="test-panel-header">
                <Wind size={20} style={{ color: '#8a9a68' }} />
                <div>
                    <h2>Breathing Analysis</h2>
                    <p>Breathe normally into your microphone for {DURATION} seconds</p>
                </div>
            </div>
            <div className="breath-visualizer">
                <canvas ref={canvasRef} />
            </div>
            <div className="breath-controls">
                {!recording ? (
                    <button className="test-btn test-btn-primary" onClick={startRecording}>
                        <Mic size={16} /> Start Recording
                    </button>
                ) : (
                    <>
                        <div className="breath-timer">{DURATION - seconds}s</div>
                        <button className="test-btn test-btn-danger" onClick={stopRecording}>
                            <Square size={14} /> Stop
                        </button>
                    </>
                )}
            </div>
        </>
    );
}

/* =============================================
   TEST 2: SPEECH CLARITY
   ============================================= */
function SpeechTest({ result, onResult }) {
    const [phrase] = useState(() => randomPhrase(4));
    const [listening, setListening] = useState(false);
    const [recognized, setRecognized] = useState('');
    const recognitionRef = useRef(null);

    const startListening = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech recognition is not supported in this browser. Try Chrome.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript.toLowerCase().trim();
            setRecognized(text);
            setListening(false);

            const similarity = levenshtein(phrase.toLowerCase(), text);
            const score = Math.round(similarity * 100);

            onResult({ score, phrase, recognized: text });
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setListening(false);
        };

        recognition.onend = () => setListening(false);

        recognitionRef.current = recognition;
        recognition.start();
        setListening(true);
        setRecognized('');
    }, [phrase, onResult]);

    if (result) {
        const level = result.score >= 80 ? 'good' : result.score >= 55 ? 'moderate' : 'concern';
        return (
            <div className="test-result">
                <MessageSquare size={32} style={{ color: '#b8a89a', marginBottom: 12 }} />
                <div className={`result-score ${level}`}>{result.score}%</div>
                <div className="result-label">Speech Clarity Score</div>
                <div className="result-message">
                    <strong>Target:</strong> "{result.phrase}"<br />
                    <strong>Heard:</strong> "{result.recognized}"<br /><br />
                    {result.score >= 80
                        ? 'Excellent speech clarity. Words were recognized clearly and accurately.'
                        : result.score >= 55
                            ? 'Some words were difficult to recognize. This could be due to background noise or microphone quality.'
                            : 'Significant differences detected. If this occurs consistently, please consult a healthcare professional.'}
                </div>
                <div className="test-actions">
                    <button className="test-btn test-btn-secondary" onClick={() => onResult(null)}>
                        <RotateCcw size={14} /> Retake
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="test-panel-header">
                <MessageSquare size={20} style={{ color: '#b8a89a' }} />
                <div>
                    <h2>Speech Clarity Test</h2>
                    <p>Read the phrase below aloud clearly</p>
                </div>
            </div>
            <div className="speech-phrase">
                <div className="speech-phrase-label">Read this phrase aloud:</div>
                <div className="speech-phrase-text">"{phrase}"</div>
            </div>
            <div className="test-actions">
                <button className="test-btn test-btn-primary" onClick={startListening} disabled={listening}>
                    {listening
                        ? <><Mic size={16} /> Listening...</>
                        : <><Mic size={16} /> Start Speaking</>}
                </button>
            </div>
            {recognized && (
                <div className="speech-recognized">
                    <div className="speech-recognized-label">We heard:</div>
                    <div className="speech-recognized-text">"{recognized}"</div>
                </div>
            )}
        </>
    );
}

/* =============================================
   TEST 3: MEMORY PATTERN
   ============================================= */
function MemoryTest({ result, onResult }) {
    const [phase, setPhase] = useState('ready'); // ready, showing, input, done
    const [pattern, setPattern] = useState([]);
    const [userPattern, setUserPattern] = useState([]);
    const [highlightIdx, setHighlightIdx] = useState(-1);
    const [round, setRound] = useState(1);
    const [score, setScore] = useState(0);
    const MAX_ROUNDS = 3;

    const generatePattern = useCallback((length) => {
        const p = [];
        while (p.length < length) {
            const cell = Math.floor(Math.random() * 9);
            if (!p.includes(cell)) p.push(cell);
        }
        return p;
    }, []);

    const startRound = useCallback(() => {
        const length = round + 2; // 3, 4, 5 cells
        const newPattern = generatePattern(length);
        setPattern(newPattern);
        setUserPattern([]);
        setPhase('showing');
        setHighlightIdx(-1);

        // Show each cell sequentially
        let i = 0;
        const showNext = () => {
            if (i < newPattern.length) {
                setHighlightIdx(newPattern[i]);
                setTimeout(() => {
                    setHighlightIdx(-1);
                    i++;
                    setTimeout(showNext, 300);
                }, 700);
            } else {
                setPhase('input');
            }
        };
        setTimeout(showNext, 500);
    }, [round, generatePattern]);

    const handleCellClick = useCallback((idx) => {
        if (phase !== 'input') return;
        const newUserPattern = [...userPattern, idx];
        setUserPattern(newUserPattern);

        if (newUserPattern.length === pattern.length) {
            // Evaluate
            let correct = 0;
            for (let i = 0; i < pattern.length; i++) {
                if (newUserPattern[i] === pattern[i]) correct++;
            }
            const roundScore = Math.round((correct / pattern.length) * 100);
            const newTotal = score + roundScore;

            if (round >= MAX_ROUNDS) {
                const avgScore = Math.round(newTotal / MAX_ROUNDS);
                onResult({ score: avgScore, rounds: MAX_ROUNDS });
            } else {
                setScore(newTotal);
                setRound(r => r + 1);
                setPhase('ready');
            }
        }
    }, [phase, userPattern, pattern, score, round, onResult]);

    const getCellClass = (idx) => {
        if (phase === 'showing' && highlightIdx === idx) return 'memory-cell highlighted';
        if (phase === 'input' && userPattern.includes(idx)) {
            const pos = userPattern.indexOf(idx);
            return pos < pattern.length && pattern[pos] === idx
                ? 'memory-cell correct'
                : 'memory-cell selected';
        }
        return 'memory-cell';
    };

    if (result) {
        const level = result.score >= 75 ? 'good' : result.score >= 50 ? 'moderate' : 'concern';
        return (
            <div className="test-result">
                <Brain size={32} style={{ color: '#7c8a5c', marginBottom: 12 }} />
                <div className={`result-score ${level}`}>{result.score}%</div>
                <div className="result-label">Memory Accuracy ({result.rounds} rounds)</div>
                <div className="result-message">
                    {result.score >= 75
                        ? 'Strong memory performance. You accurately recalled the patterns shown to you.'
                        : result.score >= 50
                            ? 'Moderate memory recall. Some patterns were difficult to remember. This is normal but worth monitoring.'
                            : 'Difficulty recalling patterns was observed. If this is consistent, please consult a healthcare professional.'}
                </div>
                <div className="test-actions">
                    <button className="test-btn test-btn-secondary" onClick={() => onResult(null)}>
                        <RotateCcw size={14} /> Retake
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="test-panel-header">
                <Grid3X3 size={20} style={{ color: '#7c8a5c' }} />
                <div>
                    <h2>Memory Pattern Test</h2>
                    <p>Watch the pattern, then repeat it in order</p>
                </div>
            </div>

            <div className="memory-round-info">Round {round} of {MAX_ROUNDS}</div>

            <div className="memory-phase-label">
                {phase === 'ready' && 'Press Start to begin'}
                {phase === 'showing' && '👀 Watch the pattern carefully...'}
                {phase === 'input' && '🖱️ Now tap the cells in the same order!'}
            </div>

            <div className="memory-grid">
                {Array.from({ length: 9 }, (_, i) => (
                    <motion.div
                        key={i}
                        className={getCellClass(i)}
                        onClick={() => handleCellClick(i)}
                        whileTap={phase === 'input' ? { scale: 0.9 } : {}}
                    />
                ))}
            </div>

            <div className="test-actions">
                {phase === 'ready' && (
                    <button className="test-btn test-btn-primary" onClick={startRound}>
                        <Play size={14} /> {round === 1 ? 'Start Test' : 'Next Round'}
                    </button>
                )}
            </div>
        </>
    );
}
