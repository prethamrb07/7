import { NavLink, useNavigate } from 'react-router-dom';
import { Eye, LayoutDashboard, Activity, ScanFace, UserPlus, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <NavLink to="/" className="navbar-logo">
                    <img src="/pehchan-logo.png" alt="Pehchan" className="logo-img" />
                    <span className="logo-text">Pehchan</span>
                </NavLink>

                <div className="navbar-links">
                    <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        Home
                    </NavLink>
                    <NavLink to="/hud" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Eye size={16} /> HUD Demo
                    </NavLink>
                    <NavLink to="/faces/register" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <UserPlus size={16} /> Register Face
                    </NavLink>
                    <NavLink to="/faces/live" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <ScanFace size={16} /> Face ID
                    </NavLink>
                    <NavLink to="/health" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Activity size={16} /> Health
                    </NavLink>
                    <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard size={16} /> Dashboard
                    </NavLink>
                </div>

                <div className="navbar-right">
                    {user && (
                        <button className="navbar-logout" onClick={handleLogout} title="Sign out">
                            <span className="navbar-user-name">{user.name}</span>
                            <LogOut size={14} />
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
