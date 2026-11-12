import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import i18n from '../i18n';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    authService.me().then((r) => {
      if (!alive) return;
      setUser(r.user);
      const language = r.user?.preferredLanguage;
      if (['uz', 'en', 'ru'].includes(language)) {
        i18n.changeLanguage(language);
        try { localStorage.setItem('interviewai:language', language); } catch { /* storage unavailable */ }
      }
    }).catch(() => alive && setUser(null)).finally(() => alive && setLoading(false));
    const expired = () => setUser(null);
    window.addEventListener('auth:expired', expired);
    return () => { alive = false; window.removeEventListener('auth:expired', expired); };
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } finally { setUser(null); }
  }, []);

  const value = useMemo(() => ({ user, setUser, loading, logout }), [user, loading, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
