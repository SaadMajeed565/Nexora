import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login: saveLogin } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { token, user } = await login(email, password);
      saveLogin(token, user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded border bg-white p-6">
      <h1 className="mb-4 text-xl font-bold">Log in to Nexora</h1>
      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="w-full rounded border px-3 py-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded border px-3 py-2" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="w-full rounded bg-black py-2 text-white" type="submit">Log in</button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        No account? <Link className="text-blue-600" to="/register">Register</Link>
      </p>
    </div>
  );
}
