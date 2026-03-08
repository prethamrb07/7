import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import HUDView from './pages/HUDView';
import Dashboard from './pages/Dashboard';
import FaceRegister from './pages/FaceRegister';
import FaceLive from './pages/FaceLive';
import Login from './pages/Login';
import Signup from './pages/Signup';
import HealthScreening from './pages/HealthScreening';
import OmiConnect from './pages/OmiConnect';

function AppLayout() {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup'].includes(location.pathname);

  return (
    <>
      {!isAuthPage && <Navbar />}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Landing /></ProtectedRoute>} />
        <Route path="/hud" element={<ProtectedRoute><HUDView /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/faces/register" element={<ProtectedRoute><FaceRegister /></ProtectedRoute>} />
        <Route path="/faces/live" element={<ProtectedRoute><FaceLive /></ProtectedRoute>} />
        <Route path="/health" element={<ProtectedRoute><HealthScreening /></ProtectedRoute>} />
        <Route path="/omi" element={<ProtectedRoute><OmiConnect /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
