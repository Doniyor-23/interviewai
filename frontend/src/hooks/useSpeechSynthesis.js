import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { getAzureSpeechToken } from '../services/speechService';

const supportedNow = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
const prefix = (lang) => (lang === 'uz' ? 'uz' : lang === 'ru' ? 'ru' : 'en');
const matches = (v, lang) => v.lang?.toLowerCase().replace('_', '-').startsWith(prefix(lang));
const key = (lang) => `interviewai:voice:${lang}`;

/** Split into short chunks: long utterances get cut off after ~15s in Chrome. */
export function chunkText(text, max = 170) {
  const sentences = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*\s*/g) || [text];
  const out = [];
  for (const s of sentences) {
    let rest = s.trim();
    while (rest.length > max) { const cut = rest.lastIndexOf(' ', max); const at = cut > 40 ? cut : max; out.push(rest.slice(0, at)); rest = rest.slice(at).trim(); }
    if (rest) out.push(rest);
  }
  return out;
}

/** Browser-native text-to-speech (Web Speech API). No API key, no network service of ours. */
export function useSpeechSynthesis(lang = 'en') {
  const supported = supportedNow();
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURIState] = useState(() => { try { return localStorage.getItem(key(lang)) || ''; } catch { return ''; } });
  const [state, setState] = useState('idle'); // idle | speaking | paused
  const [azureReady, setAzureReady] = useState(false);
  const token = useRef(0);
  const azureSynth = useRef(null);

  useEffect(() => {
    if (lang !== 'uz') return;
    let alive = true;
    getAzureSpeechToken().then(() => { if (alive) setAzureReady(true); }).catch(() => { if (alive) setAzureReady(false); });
    return () => { alive = false; };
  }, [lang]);

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const load = () => setVoices(synth.getVoices() || []);
    load();
    synth.addEventListener?.('voiceschanged', load);
    return () => { synth.removeEventListener?.('voiceschanged', load); synth.cancel(); };
  }, [supported]);

  useEffect(() => { try { setVoiceURIState(localStorage.getItem(key(lang)) || ''); } catch { /* ignore */ } }, [lang]);

  const matching = useMemo(() => voices.filter((v) => matches(v, lang)), [voices, lang]);
  const voice = useMemo(() => {
    const chosen = voices.find((v) => v.voiceURI === voiceURI);
    if (chosen && matches(chosen, lang)) return chosen;
    const pool = matching.length ? matching : [];
    const rank = (v) => (/google|natural|neural|online/i.test(v.name) ? 0 : 1) + (v.lang?.toLowerCase().startsWith(lang === 'uz' ? 'uz-uz' : 'en-us') ? 0 : 0.5);
    return [...pool].sort((a, b) => rank(a) - rank(b))[0] || null;
  }, [voices, voiceURI, matching, lang]);

  const setVoiceURI = useCallback((uri) => { setVoiceURIState(uri); try { localStorage.setItem(key(lang), uri); } catch { /* ignore */ } }, [lang]);

  const cancel = useCallback(() => { token.current++; if (supportedNow()) window.speechSynthesis.cancel(); if (azureSynth.current) { azureSynth.current.close(); azureSynth.current = null; } setState('idle'); }, []);

  /** onEnd(reason): 'ended' | 'stopped' | 'error' */
  const speak = useCallback((text, { onEnd } = {}) => {
    if ((!supportedNow() && !(lang === 'uz' && azureReady)) || !text) { onEnd?.('error'); return; }
    if (lang === 'uz' && azureReady) {
      cancel();
      const my = ++token.current;
      setState('speaking');
      getAzureSpeechToken().then(({ token: authToken, region }) => {
        if (my !== token.current) return;
        const config = SpeechSDK.SpeechConfig.fromAuthorizationToken(authToken, region);
        config.speechSynthesisVoiceName = 'uz-UZ-MadinaNeural';
        const synth = new SpeechSDK.SpeechSynthesizer(config, SpeechSDK.AudioConfig.fromDefaultSpeakerOutput());
        azureSynth.current = synth;
        synth.speakTextAsync(text, () => {
          if (my !== token.current) return;
          synth.close(); azureSynth.current = null; setState('idle'); onEnd?.('ended');
        }, (err) => {
          if (my !== token.current) return;
          synth.close(); azureSynth.current = null; setState('idle'); onEnd?.('error');
          console.warn('Azure Speech synthesis failed:', err);
        });
      }).catch((err) => { if (my === token.current) { setState('idle'); onEnd?.('error'); console.warn('Azure Speech token unavailable:', err); } });
      return;
    }
    if (!supportedNow()) { onEnd?.('error'); return; }
    const synth = window.speechSynthesis;
    synth.cancel();
    const my = ++token.current;
    const parts = chunkText(text);
    let i = 0;
    const next = () => {
      if (my !== token.current) return;
      if (i >= parts.length) { setState('idle'); onEnd?.('ended'); return; }
      const u = new window.SpeechSynthesisUtterance(parts[i++]);
      u.lang = voice?.lang || (lang === 'uz' ? 'uz-UZ' : 'en-US');
      if (voice) u.voice = voice;
      u.rate = 1; u.pitch = 1;
      u.onend = next;
      u.onerror = (e) => { if (my !== token.current) return; if (e?.error === 'canceled' || e?.error === 'interrupted') return; token.current++; setState('idle'); onEnd?.('error'); };
      synth.speak(u);
    };
    setState('speaking');
    next();
  }, [voice, lang, azureReady, cancel]);

  const stop = useCallback((onEnd) => { cancel(); onEnd?.('stopped'); }, [cancel]);
  const pause = useCallback(() => { if (supportedNow() && state === 'speaking') { window.speechSynthesis.pause(); setState('paused'); } }, [state]);
  const resume = useCallback(() => { if (supportedNow() && state === 'paused') { window.speechSynthesis.resume(); setState('speaking'); } }, [state]);

  return { supported: supported || (lang === 'uz' && azureReady), voices, matching, voice, hasVoiceForLang: matching.length > 0 || (lang === 'uz' && azureReady), azureReady, voiceURI: voice?.voiceURI || '', setVoiceURI, state, speaking: state === 'speaking', paused: state === 'paused', speak, stop, cancel, pause, resume };
}
