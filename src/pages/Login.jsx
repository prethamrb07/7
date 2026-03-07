import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
    const { login, isAuthenticated } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (isAuthenticated) return <Navigate to="/" replace />;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !password) {
            setError('Please fill in all fields.');
            return;
        }

        setSubmitting(true);

        // Small delay for UX feel
        setTimeout(() => {
            const result = login(email, password);
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
                    <h1>Welcome Back</h1>
                    <p>Sign in to continue to Pehchan</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label htmlFor="login-email">Email</label>
                        <input
                            id="login-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            autoComplete="email"
                            autoFocus
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="login-password">Password</label>
                        <input
                            id="login-password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete="current-password"
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
                            ? <><Loader className="spin" size={16} /> Signing in...</>
                            : <><LogIn size={16} /> Sign In</>}
                    </button>
                </form>

                <div className="auth-divider">
                    Don't have an account?
                    <Link to="/signup">Sign up</Link>
                </div>
            </motion.div>
        </div>
    );
}
