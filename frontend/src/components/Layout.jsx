import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Nexora</h1>
            <p className="text-sm text-gray-500">Prompt-to-Agent Platform</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">{user?.name}</span>
            <button onClick={logout} className="rounded border px-3 py-1 text-sm">Log out</button>
          </div>
        </div>
        <nav className="mt-3 flex gap-4 text-sm">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/studio">Prompt Studio</Link>
          <Link to="/blueprints">Blueprints</Link>
          <Link to="/library">Library</Link>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
