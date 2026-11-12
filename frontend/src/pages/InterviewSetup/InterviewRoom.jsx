import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Keyboard, Mic, MicOff, Pause, Play, RotateCcw, Send, Settings2, Square, Volume2, X } from 'lucide-react';
import Logo from '../../components/common/Logo';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { FormAlert } from '../../components/common/ErrorNotice';
import { PageLoader } from '../../components/common/Spinner';
import ConfigSummary from './ConfigSummary';
import { AiOrb, StatusPill, Waveform } from '../../components/interview/Visuals';
import VoiceSettings from '../../components/interview/VoiceSettings';
import WebcamPreview from '../../components/interview/WebcamPreview';
import AnswerFeedback from '../../components/interview/AnswerFeedback';
import StageFeedback from '../../components/interview/StageFeedback';
import { useInterviewConfig } from '../../context/InterviewConfigContext';
import { useToast } from '../../context/ToastContext';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useWebcam } from '../../hooks/useWebcam';
import { useTranslation } from 'react-i18next';
import { interviewService } from '../../services/interviewService';
import { labelOf } from '../../utils/careers';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const TICKING = ['preparing', 'speaking', 'waiting', 'listening', 'processing', 'review', 'preparing_next', 'stage_loading', 'stage_feedback'];
const THINKING = ['processing', 'preparing', 'preparing_next', 'stage_loading', 'completing'];
const loadPref = () => { try { return localStorage.getItem('interviewai:speechOn') !== 'false'; } catch { return true; } };

export default function InterviewRoom() {
  const { t } = useTranslation();
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { config } = useInterviewConfig();
  const [state, setState] = useState(null);
  const [ui, setUi] = useState(routeId ? 'loading' : 'lobby');
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [conflictId, setConflictId] = useState(null);
  const [showEnd, setShowEnd] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');
  const [speechOn, setSpeechOnState] = useState(loadPref);
  const [elapsed, setElapsed] = useState(0);
  const [review, setReview] = useState(null);
  const submitting = useRef(false);
  const usedMic = useRef(false);
  const retry = useRef(null);
  const speakTimer = useRef(null);

  const lang = state?.config?.language || config.language;
  const synth = useSpeechSynthesis(lang);
  const rec = useSpeechRecognition(lang);
  const webcam = useWebcam();
  const setSpeechOn = (v) => { setSpeechOnState(v); if (!v) synth.cancel(); try { localStorage.setItem('interviewai:speechOn', String(v)); } catch { /* ignore */ } };

  /* ---- timer (counts only while the interview is actively running) ---- */
  useEffect(() => {
    if (paused || !TICKING.includes(ui)) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [paused, ui]);

  /* ---- recover an existing interview after refresh / returning later ---- */
  useEffect(() => {
    if (!routeId) return;
    let alive = true;
    interviewService.get(routeId).then((r) => {
      if (!alive) return;
      setState(r.state); setElapsed(r.state.timeSpentSeconds || 0);
      if (r.state.phase === 'completed') navigate(`/interviews/${routeId}`, { replace: true });
      else setUi(r.state.phase === 'closed' ? 'closed' : 'lobby');
    }).catch((e) => { if (alive) { setErr(e.message); setUi('notfound'); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If recognition stops by itself (permission error etc.) return to the waiting state.
  useEffect(() => { if (ui === 'listening' && !rec.listening) setUi('waiting'); }, [ui, rec.listening]);
  useEffect(() => () => { clearTimeout(speakTimer.current); }, []);

  /* ---- AI voice ---- */
  const present = (text) => {
    clearTimeout(speakTimer.current);
    if (!speechOn || !synth.supported) { setUi('waiting'); return; }
    if (!synth.hasVoiceForLang) {
      setVoiceNotice(lang === 'uz' ? 'Bu qurilmada o‘zbekcha ovoz topilmadi. Savol matn ko‘rinishida berildi.' : lang === 'ru' ? 'На устройстве не найден русский голос. Вопрос показан текстом.' : 'No English voice is available on this device. The question is shown as text.');
      setUi('waiting');
      return;
    }
    setVoiceNotice('');
    setUi('speaking');
    const done = () => { clearTimeout(speakTimer.current); setUi((u) => (u === 'speaking' ? 'waiting' : u)); };
    synth.speak(text, { onEnd: done });
    // Safety net: some browsers never fire `end` when a voice is missing.
    speakTimer.current = setTimeout(() => { synth.cancel(); done(); }, 8000 + text.length * 120);
  };
  const repeat = () => { if (rec.listening) rec.stop(); present(state.question.text); };
  const stopSpeech = () => { clearTimeout(speakTimer.current); synth.stop(() => setUi((u) => (u === 'speaking' ? 'waiting' : u))); };

  /* ---- server-driven flow ---- */
  const fail = (e, fn) => { setErr(e.message); retry.current = fn; setUi('error'); };

  async function enterState(s) {
    setState(s); setErr(''); setElapsed((e) => Math.max(e, s.timeSpentSeconds || 0));
    if (s.phase === 'completed') return navigate(`/interviews/${s.interviewId}`, { replace: true });
    if (s.phase === 'closed') return setUi('closed');
    if (s.phase === 'start') return advance(s.interviewId);
    if (s.phase === 'review') return setUi('review');
    if (s.phase === 'stage_feedback') return setUi('stage_feedback');
    rec.reset(); usedMic.current = false;
    if (s.answer?.transcript) rec.setTranscript(s.answer.transcript); // retrying an answer that was saved but not yet evaluated
    present(s.question.text);
  }

  async function begin(abandon = false) {
    setUi('preparing'); setErr(''); setConflictId(null);
    try {
      const { languageExplicit: _languageExplicit, ...interviewConfig } = config;
      const r = await interviewService.start({ ...interviewConfig, cameraEnabled: webcam.enabled, abandonActive: abandon });
      setElapsed(0);
      navigate(`/interview/room/${r.state.interviewId}`, { replace: true });
      await enterState(r.state);
    } catch (e) {
      if (e.code === 'ACTIVE_INTERVIEW') setConflictId(e.data.activeId); else setErr(e.message);
      setUi('lobby');
    }
  }

  async function advance(iid = state?.interviewId) {
    setUi('preparing_next'); setErr('');
    try {
      const r = await interviewService.nextQuestion(iid, { elapsedSeconds: elapsed });
      if (r.type === 'stage_complete') return await loadStageFeedback(iid);
      await enterState(r.state);
    } catch (e) { fail(e, () => advance(iid)); }
  }
  async function loadStageFeedback(iid) {
    setUi('stage_loading');
    try { const r = await interviewService.stageFeedback(iid, { elapsedSeconds: elapsed }); await enterState(r.state); } catch (e) { fail(e, () => loadStageFeedback(iid)); }
  }
  async function finish(early) {
    setShowEnd(false); rec.stop(); synth.cancel(); webcam.disable(); clearTimeout(speakTimer.current); setUi('completing'); setErr('');
    try {
      const r = await interviewService.complete(state.interviewId, { early, elapsedSeconds: elapsed });
      if (r.abandoned) { toast.success(r.message); navigate('/dashboard', { replace: true }); } else navigate(`/interviews/${state.interviewId}`, { replace: true });
    } catch (e) { fail(e, () => finish(early)); }
  }

  async function submit() {
    const text = rec.transcript.trim();
    if (text.length < 2 || submitting.current) return; // prevents duplicate submissions
    submitting.current = true;
    rec.stop(); synth.cancel(); clearTimeout(speakTimer.current); setErr(''); setUi('processing');
    try {
      const r = await interviewService.answer(state.interviewId, { questionId: state.question.id, transcript: text, inputMode: usedMic.current ? 'voice' : 'text', durationSeconds: rec.seconds, elapsedSeconds: elapsed });
      setState(r.state);
      if (r.state.phase === 'review') setUi('review'); else await enterState(r.state);
    } catch (e) {
      if (e.code === 'STALE_QUESTION' && e.data.state) await enterState(e.data.state);
      else { setErr(`${e.message}${e.data?.answerSaved ? ' Your answer is saved. Press Submit to try again.' : ''}`); setUi('waiting'); }
    } finally { submitting.current = false; }
  }

  const toggleMic = async () => {
    if (rec.listening) { rec.stop(); setUi('waiting'); return; }
    clearTimeout(speakTimer.current); synth.cancel();
    usedMic.current = true;
    setUi('waiting');
    if (await rec.start()) setUi('listening'); else setUi('waiting');
  };
  const pause = () => { setPaused(true); if (synth.speaking) synth.pause(); if (rec.listening) { rec.stop(); setUi('waiting'); } };
  const resume = () => { setPaused(false); if (synth.paused) synth.resume(); };
  const openReview = async () => {
    try { const r = await interviewService.get(state.interviewId); const s = state.stage.key; setReview(r.interview.questions.filter((q) => q.stage === s).map((q) => ({ q, a: r.interview.answers.find((a) => String(a.questionId) === String(q._id)) }))); } catch (e) { toast.error(e.message); }
  };
  const testVoice = () => synth.speak(lang === 'uz' ? 'Salom! Men sizning suhbatdoshingizman.' : lang === 'ru' ? 'Здравствуйте! Я ваш AI-интервьюер.' : 'Hello! I am your AI interviewer.');

  /* ---- simple screens ---- */
  if (ui === 'loading') return <div className="min-h-screen bg-ink-900"><PageLoader /></div>;
  if (ui === 'notfound' || ui === 'closed') {
    return (
      <Shell><div className="surface mx-auto mt-16 max-w-md p-8 text-center"><AlertCircle className="mx-auto text-amber-300" />
        <h1 className="mt-3 text-xl font-semibold">{ui === 'closed' ? t('room.ended') : t('room.notFound')}</h1>
        <p className="mt-2 text-sm text-muted">{ui === 'closed' ? t('room.closed') : err}</p>
        <Button to="/dashboard" className="mt-6">{t('room.backDashboard')}</Button></div></Shell>
    );
  }

  /* ---- lobby / resume gate (also provides the user gesture browsers need before audio) ---- */
  if (ui === 'lobby' || (ui === 'preparing' && !state)) {
    const cfg = state?.config || config;
    const resumeable = routeId && state;
    return (
      <Shell>
        <div className="mx-auto grid max-w-4xl items-start gap-6 py-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-5">
            <div><h1 className="text-3xl font-semibold">{resumeable ? t('room.resumeTitle') : t('room.readyTitle')}</h1>
              <p className="mt-2 text-muted">{resumeable ? t('room.resumeProgress', { question: state.progress.questionNumber, stage: state.stage.name }) : t('room.intro')}</p></div>
            {conflictId && (
              <div className="surface border-amber-400/40 p-5"><p className="font-semibold">{t('room.conflictTitle')}</p>
                <p className="mt-1 text-sm text-muted">{t('room.conflictText')}</p>
                <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => window.location.assign(`/interview/room/${conflictId}`)}>{t('room.resume')}</Button><Button size="sm" variant="outlineDanger" onClick={() => begin(true)}>{t('room.discard')}</Button></div></div>
            )}
            <FormAlert>{err}</FormAlert>
            <div className="surface p-5"><h2 className="mb-4 flex items-center gap-2 font-sans text-base font-semibold"><Volume2 size={18} className="text-brand-soft" />{t('room.voiceMic')}</h2>
              <VoiceSettings synth={synth} speechOn={speechOn} setSpeechOn={setSpeechOn} lang={cfg.language} recognitionSupported={rec.supported} test={testVoice} /></div>
            <div className="flex flex-wrap gap-3">
              {resumeable ? <Button size="lg" icon={Play} onClick={() => enterState(state)}>{t('room.resumeInterview')}</Button> : <Button size="lg" icon={Play} onClick={() => begin(false)} loading={ui === 'preparing'}>{t('room.begin')}</Button>}
              <Button to={resumeable ? '/dashboard' : '/interview/setup'} variant="ghost" size="lg">{resumeable ? t('room.backDashboard') : t('setup.title')}</Button>
            </div>
          </div>
          <div className="space-y-5"><ConfigSummary config={{ ...cfg, durationMinutes: cfg.durationMinutes }} /><WebcamPreview webcam={webcam} /></div>
        </div>
      </Shell>
    );
  }

  /* ---- live room ---- */
  const p = state.progress;
  const over = elapsed > state.config.durationMinutes * 60;
  const speaking = ui === 'speaking';
  const inAnswer = ['speaking', 'waiting', 'listening'].includes(ui);

  return (
    <Shell
      header={
        <div className="flex flex-1 items-center justify-between gap-3">
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{state.stage.name}</p><p className="text-xs text-muted">Question {p.questionNumber} of about {Math.max(p.planned, p.questionNumber)} · {state.config.language.toUpperCase()}</p></div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className={`rounded-lg bg-ink-700 px-2.5 py-1.5 font-display text-sm tabular-nums ${over ? 'text-amber-300' : ''}`} title={over ? 'Over the planned time' : 'Elapsed time'}>{mmss(elapsed)}<span className="text-muted"> / {state.config.durationMinutes}:00</span></span>
            <Button variant="secondary" size="sm" icon={Settings2} onClick={() => setShowVoice((v) => !v)} aria-label="Voice settings"><span className="hidden sm:inline">Voice</span></Button>
            <Button variant="secondary" size="sm" icon={Pause} onClick={pause} disabled={!['speaking', 'waiting', 'listening', 'review'].includes(ui)}><span className="hidden sm:inline">Pause</span></Button>
            <Button variant="outlineDanger" size="sm" icon={X} onClick={() => setShowEnd(true)} disabled={ui === 'completing'}><span className="hidden sm:inline">End</span></Button>
          </div>
        </div>
      }
    >
      <div className="mx-auto grid max-w-6xl items-start gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_280px]">
       <div className="min-w-0 space-y-5">
        <ol className="flex items-center gap-2" aria-label="Interview stages">
          {p.stages.map((s, i) => (
            <li key={s.key} className="flex-1" title={s.name}>
              <div className={`h-1.5 rounded-full transition-colors duration-500 ${s.done ? 'bg-emerald-400' : i === state.stage.index ? 'bg-brand-violet' : 'bg-ink-600'}`} />
              <p className={`mt-1.5 hidden truncate text-[11px] sm:block ${i === state.stage.index ? 'text-fg' : 'text-muted'}`}>{s.name}</p>
            </li>
          ))}
        </ol>

        {showVoice && <div className="surface rise p-5"><VoiceSettings synth={synth} speechOn={speechOn} setSpeechOn={setSpeechOn} lang={state.config.language} recognitionSupported={rec.supported} test={testVoice} /></div>}

        {ui === 'stage_feedback' ? (
          <StageFeedback fb={state.stageFeedback} stage={state.stage} isLast={state.isLastStage} busy={busy} error={err} onReview={openReview} onContinue={() => (state.isLastStage ? finish(false) : advance())} />
        ) : ui === 'error' ? (
          <div className="surface p-8 text-center" role="alert"><AlertCircle className="mx-auto text-red-300" /><p className="mt-3 font-semibold">Something went wrong</p><p className="mt-1 text-sm text-muted">{err}</p>
            <p className="mt-1 text-xs text-muted">Your progress is saved.</p>
            <div className="mt-5 flex justify-center gap-2"><Button onClick={() => retry.current?.()}>Try again</Button><Button variant="ghost" onClick={() => navigate('/dashboard')}>Leave for now</Button></div></div>
        ) : (
          <>
            <section className="surface flex flex-col items-center px-5 py-7 text-center sm:px-8">
              <AiOrb speaking={speaking} thinking={THINKING.includes(ui)} />
              <div className="mt-4"><StatusPill status={ui} paused={paused} /></div>
              <div className="mt-4 w-full max-w-sm"><Waveform active={speaking && !paused} /></div>
              {!['preparing', 'preparing_next', 'stage_loading', 'completing'].includes(ui) && state.question && (
                <div className="mt-5 max-w-2xl">
                  {state.question.isFollowUp && <p className="mb-2 text-xs font-semibold text-brand-soft">Follow-up question</p>}
                  <p className="font-display text-xl leading-snug sm:text-2xl" aria-live="polite">{state.question.text}</p>
                </div>
              )}
              {['preparing', 'preparing_next', 'stage_loading', 'completing'].includes(ui) && <p className="mt-5 text-muted">{ui === 'completing' ? 'Analysing your whole interview and writing your report. This can take up to a minute.' : ui === 'stage_loading' ? 'Reviewing this stage and preparing your feedback…' : 'The interviewer is thinking of the next question…'}</p>}
              {inAnswer && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button variant="secondary" size="sm" icon={RotateCcw} onClick={repeat} disabled={!synth.supported}>Repeat question</Button>
                  {speaking && !synth.paused && <Button variant="secondary" size="sm" icon={Pause} onClick={synth.pause}>Pause speech</Button>}
                  {synth.paused && <Button variant="secondary" size="sm" icon={Play} onClick={synth.resume}>Resume speech</Button>}
                  {speaking && <Button variant="secondary" size="sm" icon={Square} onClick={stopSpeech}>Stop speech</Button>}
                </div>
              )}
            </section>

            {inAnswer && (
              <section className="surface rise p-5 sm:p-6" aria-label="Answer area">
                <div className="flex flex-col items-center gap-3">
                  {rec.supported ? (
                    <>
                      <button type="button" onClick={toggleMic} aria-pressed={rec.listening} aria-label={rec.listening ? 'Stop speaking' : 'Start speaking'}
                        className={`relative grid size-20 place-items-center rounded-full text-white transition-transform active:scale-95 ${rec.listening ? 'bg-emerald-500' : 'bg-brand-violet hover:bg-[#6d4cf0]'}`}>
                        {rec.listening && <><span className="ring-pulse absolute inset-0 rounded-full bg-emerald-400/50" /><span className="ring-pulse absolute inset-0 rounded-full bg-emerald-400/30 [animation-delay:600ms]" /></>}
                        {rec.listening ? <Square size={26} className="relative" /> : <Mic size={30} className="relative" />}
                      </button>
                      <p className="text-sm text-muted">{rec.listening ? <span className="text-emerald-300">Listening… <span className="font-display tabular-nums">{mmss(rec.seconds)}</span> · press to stop</span> : rec.transcript ? 'Press the microphone to keep adding to your answer' : 'Press the microphone and speak your answer'}</p>
                      <div className="w-full max-w-sm"><Waveform active={rec.listening} tone="user" height={36} /></div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-amber-300"><MicOff size={16} />{lang === 'uz' ? t('interview.speechUzFallback') : lang === 'ru' ? 'Распознавание речи недоступно. Введите ответ текстом.' : 'Voice input is not supported in this browser. Type your answer below.'}</div>
                  )}
                </div>
                {rec.error && <div className="mt-4"><FormAlert>{rec.error}</FormAlert></div>}
                <label htmlFor="answer" className="mb-1.5 mt-5 flex items-center gap-2 text-sm font-medium"><Keyboard size={15} className="text-muted" />Your answer <span className="font-normal text-muted">(you can edit before submitting)</span></label>
                <textarea id="answer" rows={5} value={rec.transcript} readOnly={rec.listening} maxLength={4000} onChange={(e) => rec.setTranscript(e.target.value)}
                  placeholder="Your recognised speech appears here. You can also just type."
                  className="w-full resize-y rounded-xl border border-line bg-ink-900/70 p-3.5 text-sm leading-relaxed focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/30" />
                {rec.listening && rec.interim && <p className="mt-1.5 text-sm italic text-muted" aria-live="polite">{rec.interim}</p>}
                {err && <p role="alert" className="mt-3 text-sm text-red-300">{err}</p>}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button type="button" onClick={() => { rec.reset(); setErr(''); }} disabled={!rec.transcript || rec.listening} className="text-sm text-muted hover:text-fg disabled:opacity-40">Clear</button>
                  <Button onClick={submit} icon={Send} disabled={rec.transcript.trim().length < 2}>Submit answer</Button>
                </div>
              </section>
            )}

            {ui === 'processing' && <div className="surface rise p-6 text-center"><p className="font-semibold">Processing your answer</p><p className="mt-1 text-sm text-muted">Analysing it and generating feedback. This usually takes a few seconds.</p></div>}
            {ui === 'review' && state.answer && <AnswerFeedback answer={state.answer} stageEnding={state.stageEnding} busy={false} error={err} onContinue={() => advance()} />}
          </>
        )}
       </div>
       <aside className="lg:sticky lg:top-20"><WebcamPreview webcam={webcam} /></aside>
      </div>

      {paused && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Interview paused">
          <div className="surface rise max-w-sm p-8 text-center"><Pause className="mx-auto text-brand-soft" size={30} /><h2 className="mt-3 text-2xl font-semibold">Interview paused</h2><p className="mt-2 text-sm text-muted">The timer is stopped. Your progress is saved.</p><Button className="mt-6 w-full" icon={Play} onClick={resume}>Resume interview</Button></div>
        </div>
      )}
      <Modal open={showEnd} onClose={() => setShowEnd(false)} title="End this interview?">
        <p className="text-sm text-muted">{p.answered > 0 ? `We will build your report from the ${p.answered} answer${p.answered === 1 ? '' : 's'} you have given so far.` : 'You have not answered anything yet, so nothing will be saved to your results.'}</p>
        <div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setShowEnd(false)}>Keep going</Button><Button variant="danger" onClick={() => finish(true)}>End interview</Button></div>
      </Modal>
      <Modal open={!!review} onClose={() => setReview(null)} title="Your answers in this stage">
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {review?.map(({ q, a }) => (<div key={q._id} className="rounded-xl bg-ink-900/60 p-4"><p className="text-sm font-semibold">{q.text}</p><p className="mt-2 text-sm text-muted">{a?.transcript || 'No answer'}</p>{a?.score != null && <p className="mt-2 text-xs text-brand-soft">Score {a.score}/100</p>}</div>))}
        </div>
      </Modal>
    </Shell>
  );
}

function Shell({ header, children }) {
  return (
    <div className="min-h-screen bg-ink-900">
      <header className="sticky top-0 z-30 border-b border-line bg-ink-900/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4"><Logo to="/dashboard" className="shrink-0 [&>span:last-child]:hidden sm:[&>span:last-child]:inline" />{header || <div className="flex-1" />}<LanguageSwitcher /></div>
      </header>
      <main className="px-4">{children}</main>
    </div>
  );
}
