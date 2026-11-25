import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PromptStudio from './pages/PromptStudio';
import Blueprints from './pages/Blueprints';
import BlueprintReview from './pages/BlueprintReview';
import AgentLibrary from './pages/AgentLibrary';
import AgentDetail from './pages/AgentDetail';
import Chat from './pages/Chat';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/studio" element={<PromptStudio />} />
        <Route path="/blueprints" element={<Blueprints />} />
        <Route path="/blueprints/:id" element={<BlueprintReview />} />
        <Route path="/library" element={<AgentLibrary />} />
        <Route path="/library/:id" element={<AgentDetail />} />
        <Route path="/chat/:agentId" element={<Chat />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
