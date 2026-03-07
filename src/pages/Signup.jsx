import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Signup() {
    const { signup, isAuthenticated } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (isAuthenticated) return <Navigate to="/" replace />;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!name.trim() || !email.trim() || !password || !confirmPassword) {
            setError('Please fill in all fields.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSubmitting(true);

        setTimeout(() => {
            const result = signup(name, email, password);
            if (!result.success) {
                setError(result.error);
            }
            setSubmitting(false);
        }, 400);
    };

    return (
        <div className="auth-page">
            <motion.div
                className="auth-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div className="auth-branding">
                    <img src="/pehchan-logo.png" alt="Pehchan" className="auth-logo" />
                    <h1>Create Account</h1>
                    <p>Join Pehchan to start recognizing familiar faces</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label htmlFor="signup-name">Full Name</label>
                        <input
                            id="signup-name"
                            type="text"
                            placeholder="Your name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            autoComplete="name"
                            autoFocus
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="signup-email">Email</label>
                        <input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="signup-password">Password</label>
                        <input
                            id="signup-password"
                            type="password"
                            placeholder="At least 6 characters"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="signup-confirm">Confirm Password</label>
                        <input
                            id="signup-confirm"
                            type="password"
                            placeholder="Re-enter password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                    </div>

                    {error && (
                        <div className="auth-error">
                            <AlertCircle size={14} />
                            <span>{error}</span>
                        </div>
                    )}

                    <button type="submit" className="auth-submit" disabled={submitting}>
                        {submitting
                            ? <><Loader className="spin" size={16} /> Creating account...</>
                            : <><UserPlus size={16} /> Create Account</>}
                    </button>
                </form>

                <div className="auth-divider">
                    Already have an account?
                    <Link to="/login">Sign in</Link>
                </div>
            </motion.div>
        </div>
    );
}
