import { useCallback, useEffect, useRef, useState } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { getAzureSpeechToken } from '../services/speechService';

const getSR = () => (typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null);
const FATAL = {
  'not-allowed': 'Microphone access was blocked. Allow the microphone in your browser (lock icon in the address bar), or type your answer instead.',
  'service-not-allowed': 'Speech recognition is not allowed in this browser or context. You can type your answer instead.',
  'audio-capture': 'No microphone was found. Connect a microphone, or type your answer instead.',
  'language-not-supported': 'This browser does not support speech recognition for the interview language. Please type your answer.',
  network: 'Speech recognition lost its connection to the browser\'s speech service. Check your internet connection, or type your answer.',
  'bad-grammar': 'Speech recognition failed. Please type your answer.',
};

/** Browser-native speech-to-text. The returned transcript remains editable before submission. */
export function useSpeechRecognition(lang = 'en') {
  const SR = getSR();
  // Without Azure, use the browser's built-in recognizer for Uzbek too. Depending
  // on the browser, it may use a remote speech service rather than on-device AI.
  const browserSupported = !!SR;
  const [azureAvailable, setAzureAvailable] = useState(false);
  const supported = browserSupported || azureAvailable;
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
  const azure = useRef(null);

  useEffect(() => {
    if (lang !== 'uz') { setAzureAvailable(false); return undefined; }
    let alive = true;
    getAzureSpeechToken().then(() => { if (alive) setAzureAvailable(true); }).catch(() => { if (alive) setAzureAvailable(false); });
    return () => { alive = false; };
  }, [lang]);

  const setTranscript = useCallback((t) => { textRef.current = t; setTranscriptState(t); }, []);

  useEffect(() => {
    if (!listening) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);

  useEffect(() => {
    if (!listening || !azure.current) return;
    const timer = setInterval(() => {
      getAzureSpeechToken().then(({ token }) => { if (azure.current) azure.current.authorizationToken = token; }).catch(() => {});
    }, 8 * 60 * 1000);
    return () => clearInterval(timer);
  }, [listening]);

  const teardown = useCallback(() => {
    want.current = false;
    const r = rec.current; rec.current = null;
    if (r) { r.onresult = r.onerror = r.onend = null; try { r.stop(); } catch { /* ignore */ } }
    if (azure.current) { const a = azure.current; azure.current = null; try { a.stopContinuousRecognitionAsync(() => a.close(), () => a.close()); } catch { a.close(); } }
    setListening(false); setInterim('');
  }, []);

  useEffect(() => teardown, [teardown]);

  const begin = useCallback(() => {
    const r = new SR();
    r.lang = lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US';
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

  const start = useCallback(async () => {
    if (!supported) { setError('Speech recognition is not supported in this browser. Type your answer instead.'); return false; }
    if (want.current) return true;
    // Azure is used for Uzbek only when the backend has an Azure Speech resource configured.
    // The browser receives a short-lived token; the subscription key remains server-side.
    if (lang === 'uz') try {
      const { token, region } = await getAzureSpeechToken();
      const config = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
      config.speechRecognitionLanguage = lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US';
      const audio = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SpeechSDK.SpeechRecognizer(config, audio);
      azure.current = recognizer;
      setError(''); finals.current = ''; base.current = textRef.current ? `${textRef.current.trim()} ` : '';
      restarts.current = 0; silent.current = 0; gotAny.current = false; want.current = true;
      recognizer.recognizing = (_s, e) => { if (e.result?.text) { gotAny.current = true; setInterim(e.result.text); } };
      recognizer.recognized = (_s, e) => {
        if (e.result?.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
          finals.current += `${e.result.text.trim()} `; gotAny.current = true; silent.current = 0;
          setTranscript(`${base.current}${finals.current}`.replace(/\s+/g, ' ').trimStart()); setInterim('');
        }
      };
      recognizer.canceled = (_s, e) => {
        if (!want.current) return;
        setError(e.errorDetails || 'Azure Speech stopped. Type your answer or try the microphone again.');
        teardown();
      };
      recognizer.sessionStopped = () => { if (want.current) teardown(); };
      await new Promise((resolve, reject) => recognizer.startContinuousRecognitionAsync(resolve, reject));
      setListening(true); return true;
    } catch (azureError) {
      want.current = false;
      setListening(false);
      if (azure.current) { azure.current.close(); azure.current = null; }
      // No Azure resource configured: retain the local-only Uzbek path and browser path for other languages.
      if (azureError?.response?.status !== 503 && azureError?.status !== 503 && azureError?.response) {
        setError(azureError.message || 'Azure Speech could not start. Type your answer instead.'); return false;
      }
    }
    setError(''); finals.current = ''; base.current = textRef.current ? `${textRef.current.trim()} ` : '';
    restarts.current = 0; silent.current = 0; gotAny.current = false; want.current = true;
    try { begin(); setListening(true); return true; } catch { want.current = false; setError('Could not start the microphone. Try again or type your answer.'); return false; }
  }, [SR, supported, lang, begin, setTranscript, teardown]);

  const stop = useCallback(() => {
    want.current = false;
    const r = rec.current; rec.current = null;
    if (r) { r.onend = null; try { r.stop(); } catch { /* ignore */ } }
    if (azure.current) { const a = azure.current; azure.current = null; try { a.stopContinuousRecognitionAsync(() => a.close(), () => a.close()); } catch { a.close(); } }
    setListening(false); setInterim('');
  }, []);

  const reset = useCallback(() => { teardown(); setTranscript(''); setSeconds(0); setError(''); finals.current = ''; base.current = ''; }, [teardown, setTranscript]);

  return { supported, listening, transcript, setTranscript, interim, error, clearError: () => setError(''), seconds, start, stop, reset };
}
