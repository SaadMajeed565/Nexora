import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login: saveLogin } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const { token, user } = await register(name, email, password);
      saveLogin(token, user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded border bg-white p-6">
      <h1 className="mb-4 text-xl font-bold">Create your Nexora account</h1>
      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="w-full rounded border px-3 py-2" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="w-full rounded border px-3 py-2" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded border px-3 py-2" type="password" placeholder="Password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="w-full rounded bg-black py-2 text-white" type="submit">Register</button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        Already have an account? <Link className="text-blue-600" to="/login">Log in</Link>
      </p>
    </div>
  );
}
