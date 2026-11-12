import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const KEY = 'interviewai:config';
export const DEFAULT_CONFIG = { career: 'frontend', experienceLevel: 'junior', difficulty: 'medium', durationMinutes: 20, language: 'uz', interviewType: 'mixed', cameraEnabled: false };

const load = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    const siteLanguage = localStorage.getItem('interviewai:language');
    return { ...DEFAULT_CONFIG, ...saved, language: saved.language || (['uz', 'en', 'ru'].includes(siteLanguage) ? siteLanguage : DEFAULT_CONFIG.language), languageExplicit: Object.hasOwn(saved, 'language') };
  } catch { return { ...DEFAULT_CONFIG, languageExplicit: false }; }
};

const Ctx = createContext(null);

/** Holds the selected interview setup. Part 2's interview room reads it from here. */
export function InterviewConfigProvider({ children }) {
  const [config, setConfigState] = useState(load);
  const setConfig = useCallback((patch) => {
    setConfigState((prev) => {
      const next = { ...prev, ...patch };
      if (Object.hasOwn(patch, 'language')) next.languageExplicit = true;
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);
  const value = useMemo(() => ({ config, setConfig }), [config, setConfig]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useInterviewConfig = () => useContext(Ctx);
