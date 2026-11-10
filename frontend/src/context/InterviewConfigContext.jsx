import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const KEY = 'interviewai:config';
export const DEFAULT_CONFIG = { career: 'frontend', experienceLevel: 'junior', difficulty: 'medium', durationMinutes: 20, language: 'en', interviewType: 'mixed' };

const load = () => {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return DEFAULT_CONFIG; }
};

const Ctx = createContext(null);

/** Holds the selected interview setup. Part 2's interview room reads it from here. */
export function InterviewConfigProvider({ children }) {
  const [config, setConfigState] = useState(load);
  const setConfig = useCallback((patch) => {
    setConfigState((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);
  const value = useMemo(() => ({ config, setConfig }), [config, setConfig]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useInterviewConfig = () => useContext(Ctx);
