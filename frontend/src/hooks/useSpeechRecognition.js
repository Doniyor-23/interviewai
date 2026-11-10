import { useCallback, useEffect, useRef, useState } from 'react';

const getSR = () => (typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null);
const FATAL = {
  'not-allowed': 'Microphone access was blocked. Allow the microphone in your browser (lock icon in the address bar), or type your answer instead.',
  'service-not-allowed': 'Speech recognition is not allowed in this browser or context. You can type your answer instead.',
  'audio-capture': 'No microphone was found. Connect a microphone, or type your answer instead.',
  'language-not-supported': 'This browser does not support speech recognition for the interview language. Please type your answer.',
  network: 'Speech recognition lost its connection to the browser\'s speech service. Check your internet connection, or type your answer.',
  'bad-grammar': 'Speech recognition failed. Please type your answer.',
};

/** Browser-native speech-to-text. `transcript` is the editable answer text; raw audio is never captured by us. */
export function useSpeechRecognition(lang = 'en') {
  const SR = getSR();
  const supported = !!SR;
  const [listening, setListening] = useState(false);
  const [transcript, setTranscriptState] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const rec = useRef(null);
  const want = useRef(false);
  const base = useRef('');
  const finals = useRef('');
  const textRef = useRef('');
  const restarts = useRef(0);
  const silent = useRef(0);
  const gotAny = useRef(false);

  const setTranscript = useCallback((t) => { textRef.current = t; setTranscriptState(t); }, []);

  useEffect(() => {
    if (!listening) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);

  const teardown = useCallback(() => {
    want.current = false;
    const r = rec.current; rec.current = null;
    if (r) { r.onresult = r.onerror = r.onend = null; try { r.stop(); } catch { /* ignore */ } }
    setListening(false); setInterim('');
  }, []);

  useEffect(() => teardown, [teardown]);

  const begin = useCallback(() => {
    const r = new SR();
    r.lang = lang === 'uz' ? 'uz-UZ' : 'en-US';
    r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) { finals.current += `${res[0].transcript.trim()} `; gotAny.current = true; silent.current = 0; } else live += res[0].transcript;
      }
      if (live) { gotAny.current = true; silent.current = 0; }
      setTranscript(`${base.current}${finals.current}`.replace(/\s+/g, ' ').trimStart());
      setInterim(live);
    };
    r.onerror = (e) => {
      const code = e?.error;
      if (code === 'aborted') return;
      if (code === 'no-speech') { silent.current++; return; } // onend decides whether to retry
      if (FATAL[code]) { setError(FATAL[code]); teardown(); return; }
      setError(`Speech recognition error (${code || 'unknown'}). You can type your answer instead.`); teardown();
    };
    r.onend = () => {
      if (!want.current) { setListening(false); setInterim(''); return; }
      // Chrome ends sessions after silence or time limits: restart transparently, within reason.
      if (silent.current >= 2 && !gotAny.current) { setError('We did not hear anything. Check your microphone and try again, or type your answer.'); teardown(); return; }
      if (restarts.current++ > 30) { teardown(); return; }
      try { r.start(); } catch { teardown(); }
    };
    rec.current = r;
    r.start();
  }, [SR, lang, teardown, setTranscript]);

  const start = useCallback(() => {
    if (!SR) { setError('Speech recognition is not supported in this browser. Use Chrome or Edge, or type your answer.'); return false; }
    if (want.current) return true;
    setError(''); finals.current = ''; base.current = textRef.current ? `${textRef.current.trim()} ` : '';
    restarts.current = 0; silent.current = 0; gotAny.current = false; want.current = true;
    try { begin(); setListening(true); return true; } catch { want.current = false; setError('Could not start the microphone. Try again or type your answer.'); return false; }
  }, [SR, begin]);

  const stop = useCallback(() => {
    want.current = false;
    const r = rec.current; rec.current = null;
    if (r) { r.onend = null; try { r.stop(); } catch { /* ignore */ } }
    setListening(false); setInterim('');
  }, []);

  const reset = useCallback(() => { teardown(); setTranscript(''); setSeconds(0); setError(''); finals.current = ''; base.current = ''; }, [teardown, setTranscript]);

  return { supported, listening, transcript, setTranscript, interim, error, clearError: () => setError(''), seconds, start, stop, reset };
}
