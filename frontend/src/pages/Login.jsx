import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: saveLogin } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await login(email, password);
      saveLogin(token, user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="nx-auth-shell">
      <div className="nx-auth-orb -left-24 top-10 h-[28rem] w-[28rem]" />
      <div className="nx-auth-orb bottom-0 right-0 h-[22rem] w-[22rem] [animation-delay:-6s]" />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[1.15fr_0.85fr]">
        <section className="flex flex-col justify-between px-6 py-10 sm:px-10 lg:py-14">
          <p className="nx-brand animate-rise-in">Nexora</p>
          <div className="max-w-xl animate-rise-in [animation-delay:80ms]">
            <p className="nx-eyebrow">Secure multi-agent platform</p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Describe an agent. Ship the runtime.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted sm:text-lg">
              Turn plain language into blueprints, match library agents, and operate with production discipline.
            </p>
          </div>
          <p className="hidden text-xs uppercase tracking-[0.18em] text-ink-muted lg:block">
            Blueprint · Match · Deploy · Chat
          </p>
        </section>

        <section className="flex items-center px-6 pb-12 sm:px-10 lg:px-8 lg:pb-0">
          <div className="nx-panel w-full max-w-md animate-rise-in p-7 sm:p-8 [animation-delay:120ms]">
            <p className="nx-eyebrow">Welcome back</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">Log in</h2>
            {error && <p className="nx-alert-error mt-4">{error}</p>}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="nx-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  className="nx-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="nx-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  className="nx-input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button className="nx-btn-primary w-full" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Continue'}
              </button>
            </form>
            <p className="mt-6 text-sm text-ink-muted">
              No account? <Link className="nx-link" to="/register">Create one</Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
