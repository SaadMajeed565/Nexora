import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/studio', label: 'Studio' },
  { to: '/blueprints', label: 'Blueprints' },
  { to: '/library', label: 'Library' },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="nx-grain relative min-h-screen">
      <header className="relative z-20 border-b border-line/80 bg-surface-raised/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="animate-fade-in">
              <p className="nx-brand leading-none">Nexora</p>
              <p className="mt-1 text-sm text-ink-muted">Prompt-to-agent platform</p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-ink">{user?.name}</p>
                <p className="text-xs text-ink-muted">{user?.email}</p>
              </div>
              <button type="button" onClick={logout} className="nx-btn-secondary !py-2 !text-xs uppercase tracking-[0.14em]">
                Log out
              </button>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line/70 pt-4">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className="nx-nav-link">
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
