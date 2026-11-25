import { createContext, useContext, useEffect, useState } from 'react';
import { fetchMe } from '../services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('nexora_token'));

  // Restore the session after a page refresh (token survives, user does not).
  useEffect(() => {
    if (token && !user) {
      fetchMe()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('nexora_token');
          setToken(null);
          setUser(null);
        });
    }
  }, []);

  const login = (nextToken, nextUser) => {
    localStorage.setItem('nexora_token', nextToken);
    setToken(nextToken);
    setUser(nextUser);
  };

  const logout = () => {
    localStorage.removeItem('nexora_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
