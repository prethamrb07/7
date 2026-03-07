import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

// Simple hash for basic password obfuscation (not cryptographically secure)
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load session on mount
    useEffect(() => {
        const session = localStorage.getItem('pehchan_session');
        if (session) {
            try {
                setUser(JSON.parse(session));
            } catch (e) {
                localStorage.removeItem('pehchan_session');
            }
        }
        setLoading(false);
    }, []);

    // Get all registered users
    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem('pehchan_users') || '[]');
        } catch {
            return [];
        }
    }

    function signup(name, email, password) {
        const users = getUsers();
        const normalizedEmail = email.toLowerCase().trim();

        if (users.find(u => u.email === normalizedEmail)) {
            return { success: false, error: 'An account with this email already exists.' };
        }

        const newUser = {
            id: Date.now().toString(),
            name: name.trim(),
            email: normalizedEmail,
            passwordHash: simpleHash(password),
            createdAt: new Date().toISOString(),
        };

        users.push(newUser);
        localStorage.setItem('pehchan_users', JSON.stringify(users));

        const session = { id: newUser.id, name: newUser.name, email: newUser.email };
        localStorage.setItem('pehchan_session', JSON.stringify(session));
        setUser(session);

        return { success: true };
    }

    function login(email, password) {
        const users = getUsers();
        const normalizedEmail = email.toLowerCase().trim();
        const found = users.find(u => u.email === normalizedEmail);

        if (!found) {
            return { success: false, error: 'No account found with this email.' };
        }

        if (found.passwordHash !== simpleHash(password)) {
            return { success: false, error: 'Incorrect password.' };
        }

        const session = { id: found.id, name: found.name, email: found.email };
        localStorage.setItem('pehchan_session', JSON.stringify(session));
        setUser(session);

        return { success: true };
    }

    function logout() {
        localStorage.removeItem('pehchan_session');
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}
