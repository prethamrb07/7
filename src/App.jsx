import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import HUDView from './pages/HUDView';
import Dashboard from './pages/Dashboard';
import FaceRegister from './pages/FaceRegister';
import FaceLive from './pages/FaceLive';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/hud" element={<HUDView />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/faces/register" element={<FaceRegister />} />
        <Route path="/faces/live" element={<FaceLive />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

