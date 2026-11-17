import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Keyboard,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Send,
  Settings2,
  Square,
  Volume2,
  X,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import Logo from '../../components/common/Logo';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { FormAlert } from '../../components/common/ErrorNotice';
import { PageLoader } from '../../components/common/Spinner';
import ConfigSummary from './ConfigSummary';
import { Waveform, StatusPill } from '../../components/interview/Visuals';
import VoiceSettings from '../../components/interview/VoiceSettings';
import WebcamPreview from '../../components/interview/WebcamPreview';
import AiInterviewerCard from '../../components/interview/AiInterviewerCard';
import InterviewInfoCard from '../../components/interview/InterviewInfoCard';
import AnswerFeedback from '../../components/interview/AnswerFeedback';
import StageFeedback from '../../components/interview/StageFeedback';
import { useInterviewConfig } from '../../context/InterviewConfigContext';
import { useToast } from '../../context/ToastContext';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useWebcam } from '../../hooks/useWebcam';
import { useTranslation } from 'react-i18next';
import { interviewService } from '../../services/interviewService';
import { labelOf, careerById } from '../../utils/careers';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';

const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const TICKING = ['preparing', 'speaking', 'waiting', 'listening', 'processing', 'review', 'preparing_next', 'stage_loading', 'stage_feedback'];
const THINKING = ['processing', 'preparing', 'preparing_next', 'stage_loading', 'completing'];
const loadPref = () => {
  try {
    return localStorage.getItem('interviewai:speechOn') !== 'false';
  } catch {
    return true;
  }
};

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
  const [inputModeTab, setInputModeTab] = useState('voice'); // 'voice' | 'text'

  const submitting = useRef(false);
  const usedMic = useRef(false);
  const retry = useRef(null);
  const speakTimer = useRef(null);
  const textareaRef = useRef(null);

  const lang = state?.config?.language || config.language;
  const synth = useSpeechSynthesis(lang);
  const rec = useSpeechRecognition(lang);
  const webcam = useWebcam();

  const setSpeechOn = (v) => {
    setSpeechOnState(v);
    if (!v) synth.cancel();
    try {
      localStorage.setItem('interviewai:speechOn', String(v));
    } catch {
      /* ignore */
    }
  };

  /* ---- Timer ---- */
  useEffect(() => {
    if (paused || !TICKING.includes(ui)) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [paused, ui]);

  /* ---- Recover existing interview ---- */
  useEffect(() => {
    if (!routeId) return;
    let alive = true;
    interviewService
      .get(routeId)
      .then((r) => {
        if (!alive) return;
        setState(r.state);
        setElapsed(r.state.timeSpentSeconds || 0);
        if (r.state.phase === 'completed') navigate(`/interviews/${routeId}`, { replace: true });
        else setUi(r.state.phase === 'closed' ? 'closed' : 'lobby');
      })
      .catch((e) => {
        if (alive) {
          setErr(e.message);
          setUi('notfound');
        }
      });
    return () => {
      alive = false;
    };
  }, [routeId, navigate]);

  // If speech recognition terminates on its own, reset ui state
  useEffect(() => {
    if (ui === 'listening' && !rec.listening) setUi('waiting');
  }, [ui, rec.listening]);

  useEffect(() => () => clearTimeout(speakTimer.current), []);

  /* ---- AI Voice Presentation ---- */
  const present = (text) => {
    clearTimeout(speakTimer.current);
    if (!speechOn || !synth.supported) {
      setUi('waiting');
      return;
    }
    if (!synth.hasVoiceForLang) {
      const voiceLanguage = t(`voiceUI.${lang === 'uz' ? 'uzbek' : lang === 'ru' ? 'russian' : 'english'}`);
      setVoiceNotice(t('interview.voiceUnavailable', { language: voiceLanguage }));
      setUi('waiting');
      return;
    }
    setVoiceNotice('');
    setUi('speaking');
    const done = (reason) => {
      clearTimeout(speakTimer.current);
      if (reason === 'error' && lang === 'uz') {
        setVoiceNotice(t('voiceUI.noVoice', { language: t('voiceUI.uzbek') }));
      }
      setUi((u) => (u === 'speaking' ? 'waiting' : u));
    };
    synth.speak(text, { onEnd: done });
    speakTimer.current = setTimeout(() => {
      synth.cancel();
      done();
    }, 8000 + text.length * 120);
  };

  const repeat = () => {
    if (rec.listening) rec.stop();
    if (state?.question?.text) present(state.question.text);
  };

  const stopSpeech = () => {
    clearTimeout(speakTimer.current);
    synth.stop(() => setUi((u) => (u === 'speaking' ? 'waiting' : u)));
  };

  /* ---- Flow transitions ---- */
  const fail = (e, fn) => {
    setErr(e.message);
    retry.current = fn;
    setUi('error');
  };

  async function enterState(s) {
    setState(s);
    setErr('');
    setElapsed((e) => Math.max(e, s.timeSpentSeconds || 0));
    if (s.phase === 'completed') return navigate(`/interviews/${s.interviewId}`, { replace: true });
    if (s.phase === 'closed') return setUi('closed');
    if (s.phase === 'start') return advance(s.interviewId);
    if (s.phase === 'review') return setUi('review');
    if (s.phase === 'stage_feedback') return setUi('stage_feedback');
    rec.reset();
    usedMic.current = false;
    if (s.answer?.transcript) rec.setTranscript(s.answer.transcript);
    present(s.question.text);
  }

  async function begin(abandon = false) {
    setUi('preparing');
    setErr('');
    setConflictId(null);
    try {
      const { languageExplicit: _languageExplicit, ...interviewConfig } = config;
      const r = await interviewService.start({ ...interviewConfig, cameraEnabled: webcam.enabled, abandonActive: abandon });
      setElapsed(0);
      navigate(`/interview/room/${r.state.interviewId}`, { replace: true });
      await enterState(r.state);
    } catch (e) {
      if (e.code === 'ACTIVE_INTERVIEW') setConflictId(e.data.activeId);
      else setErr(e.message);
      setUi('lobby');
    }
  }

  async function advance(iid = state?.interviewId) {
    setUi('preparing_next');
    setErr('');
    try {
      const r = await interviewService.nextQuestion(iid, { elapsedSeconds: elapsed });
      if (r.type === 'stage_complete') return await loadStageFeedback(iid);
      await enterState(r.state);
    } catch (e) {
      fail(e, () => advance(iid));
    }
  }

  async function loadStageFeedback(iid) {
    setUi('stage_loading');
    try {
      const r = await interviewService.stageFeedback(iid, { elapsedSeconds: elapsed });
      await enterState(r.state);
    } catch (e) {
      fail(e, () => loadStageFeedback(iid));
    }
  }

  async function finish(early) {
    setShowEnd(false);
    rec.stop();
    synth.cancel();
    webcam.disable();
    clearTimeout(speakTimer.current);
    setUi('completing');
    setErr('');
    try {
      const r = await interviewService.complete(state.interviewId, { early, elapsedSeconds: elapsed });
      if (r.abandoned) {
        toast.success(r.message);
        navigate('/dashboard', { replace: true });
      } else {
        navigate(`/interviews/${state.interviewId}`, { replace: true });
      }
    } catch (e) {
      fail(e, () => finish(early));
    }
  }

  async function submit() {
    const text = rec.transcript.trim();
    if (text.length < 2 || submitting.current) return;
    submitting.current = true;
    rec.stop();
    synth.cancel();
    clearTimeout(speakTimer.current);
    setErr('');
    setUi('processing');
    try {
      const r = await interviewService.answer(state.interviewId, {
        questionId: state.question.id,
        transcript: text,
        inputMode: usedMic.current ? 'voice' : 'text',
        durationSeconds: rec.seconds,
        elapsedSeconds: elapsed,
      });
      setState(r.state);
      if (r.state.phase === 'review') setUi('review');
      else await enterState(r.state);
    } catch (e) {
      if (e.code === 'STALE_QUESTION' && e.data.state) await enterState(e.data.state);
      else {
        setErr(`${e.message}${e.data?.answerSaved ? ' ' + t('roomUI.saved') : ''}`);
        setUi('waiting');
      }
    } finally {
      submitting.current = false;
    }
  }

  const toggleMic = async () => {
    if (rec.listening) {
      rec.stop();
      setUi('waiting');
      return;
    }
    clearTimeout(speakTimer.current);
    synth.cancel();
    usedMic.current = true;
    setUi('waiting');
    if (await rec.start()) setUi('listening');
    else setUi('waiting');
  };

  const pause = () => {
    setPaused(true);
    if (synth.speaking) {
      if (synth.azureReady) stopSpeech();
      else synth.pause();
    }
    if (rec.listening) {
      rec.stop();
      setUi('waiting');
    }
  };

  const resume = () => {
    setPaused(false);
    if (synth.paused) synth.resume();
  };

  const openReview = async () => {
    try {
      const r = await interviewService.get(state.interviewId);
      const s = state.stage.key;
      setReview(
        r.interview.questions
          .filter((q) => q.stage === s)
          .map((q) => ({ q, a: r.interview.answers.find((a) => String(a.questionId) === String(q._id)) }))
      );
    } catch (e) {
      toast.error(e.message);
    }
  };

  const testVoice = () =>
    synth.speak(
      lang === 'uz'
        ? 'Salom! Men sizning AI suhbatdoshingizman.'
        : lang === 'ru'
        ? 'Здравствуйте! Я ваш AI-интервьюер.'
        : 'Hello! I am your AI interviewer.'
    );

  // Stage Contextual Hint
  const getStageHint = (stageKey) => {
    switch (stageKey) {
      case 'fundamentals':
        return t('hints.fundamentals', "Fokus: Asosiy tushunchalar, ularning ishlash mexanizmi va amaliy ahamiyatini ko'rsatib bering.");
      case 'practical':
        return t('hints.practical', "Fokus: O'z loyihalaringizdagi real tajribangiz, duch kelgan qiyinchiliklar va yechimlaringizdan misollar keltiring.");
      case 'problem_solving':
        return t('hints.problemSolving', "Fokus: Muammoni qadamma-qadam tahlil qiling, turli xil yondashuvlarning ustunlik va kamchiliklarini taqqoslang.");
      case 'behavioral':
        return t('hints.behavioral', "Fokus: STAR metodologiyasidan foydalaning (Vaziyat, Topshiriq, Harakat, Natija).");
      default:
        return t('hints.general', "Fokus: Javobingizni aniq, tizimli va o'z so'zlaringiz bilan ifoda eting.");
    }
  };

  // Keyboard shortcut Ctrl+Enter to submit
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (rec.transcript.trim().length >= 2) submit();
    }
  };

  /* ---- Loading Screen ---- */
  if (ui === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <PageLoader />
      </div>
    );
  }

  /* ---- Not Found / Closed Screens ---- */
  if (ui === 'notfound' || ui === 'closed') {
    return (
      <Shell>
        <div className="surface mx-auto mt-16 max-w-md p-8 text-center shadow-2xl">
          <AlertCircle className="mx-auto text-amber-300" size={36} />
          <h1 className="mt-4 text-2xl font-bold">{ui === 'closed' ? t('room.ended') : t('room.notFound')}</h1>
          <p className="mt-2 text-sm text-muted">{ui === 'closed' ? t('room.closed') : err}</p>
          <Button to="/dashboard" className="mt-6 w-full">
            {t('room.backDashboard')}
          </Button>
        </div>
      </Shell>
    );
  }

  /* ---- Lobby Screen ---- */
  if (ui === 'lobby' || (ui === 'preparing' && !state)) {
    const cfg = state?.config || config;
    const resumeable = routeId && state;
    return (
      <Shell>
        <div className="mx-auto grid max-w-5xl items-start gap-8 py-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-violet/30 bg-brand-violet/10 px-3 py-1 text-xs font-semibold text-brand-soft">
                <Sparkles size={13} />
                <span>InterviewAI Workspace</span>
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {resumeable ? t('room.resumeTitle') : t('room.readyTitle')}
              </h1>
              <p className="mt-2 text-base text-muted">
                {resumeable
                  ? t('room.resumeProgress', { question: state.progress.questionNumber, stage: t(`feedback.stages.${state.stage.key}`, state.stage.name) })
                  : t('room.intro')}
              </p>
            </div>

            {conflictId && (
              <div className="surface border-amber-400/40 p-5 shadow-lg">
                <p className="font-semibold text-amber-300">{t('room.conflictTitle')}</p>
                <p className="mt-1 text-sm text-muted">{t('room.conflictText')}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => window.location.assign(`/interview/room/${conflictId}`)}>
                    {t('room.resume')}
                  </Button>
                  <Button size="sm" variant="outlineDanger" onClick={() => begin(true)}>
                    {t('room.discard')}
                  </Button>
                </div>
              </div>
            )}

            <FormAlert>{err}</FormAlert>

            <div className="surface p-6 shadow-xl">
              <h2 className="mb-4 flex items-center gap-2 font-sans text-base font-semibold">
                <Volume2 size={18} className="text-brand-soft" />
                {t('room.voiceMic')}
              </h2>
              <VoiceSettings
                synth={synth}
                speechOn={speechOn}
                setSpeechOn={setSpeechOn}
                lang={cfg.language}
                recognitionSupported={rec.supported}
                test={testVoice}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {resumeable ? (
                <Button size="lg" icon={Play} onClick={() => enterState(state)}>
                  {t('room.resumeInterview')}
                </Button>
              ) : (
                <Button size="lg" icon={Play} onClick={() => begin(false)} loading={ui === 'preparing'}>
                  {t('room.begin')}
                </Button>
              )}
              <Button to={resumeable ? '/dashboard' : '/interview/setup'} variant="ghost" size="lg">
                {resumeable ? t('room.backDashboard') : t('setup.title')}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <ConfigSummary config={{ ...cfg, durationMinutes: cfg.durationMinutes }} />
            <WebcamPreview webcam={webcam} />
          </div>
        </div>
      </Shell>
    );
  }

  /* ---- Live Room Variables ---- */
  const p = state.progress;
  const over = elapsed > state.config.durationMinutes * 60;
  const speaking = ui === 'speaking';
  const inAnswer = ['speaking', 'waiting', 'listening'].includes(ui);
  const isGenerating = ['preparing', 'preparing_next', 'stage_loading'].includes(ui);

  return (
    <Shell
      header={
        <div className="flex flex-1 items-center justify-between gap-3">
          {/* Stage name & Language */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-bold text-fg">
                {t(`feedback.stages.${state.stage.key}`, state.stage.name)}
              </span>
              <span className="rounded-md border border-line bg-ink-800 px-2 py-0.5 text-[11px] font-semibold text-brand-soft uppercase">
                {state.config.language}
              </span>
            </div>
            <p className="text-xs text-muted">
              {t('roomUI.questionOf', { question: p.questionNumber, total: Math.max(p.planned, p.questionNumber) })}
            </p>
          </div>

          {/* Center/Right Toolbar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Timer */}
            <div
              className={`flex items-center gap-1.5 rounded-xl border border-line bg-ink-800/80 px-3 py-1.5 font-display text-sm font-semibold tabular-nums shadow-inner ${
                over ? 'border-amber-500/50 text-amber-300' : 'text-fg'
              }`}
              title={over ? t('roomUI.over') : t('roomUI.elapsed')}
            >
              <span>{mmss(elapsed)}</span>
              <span className="text-muted/70 text-xs">/ {state.config.durationMinutes}:00</span>
            </div>

            {/* Voice toggle button */}
            <Button
              variant="secondary"
              size="sm"
              icon={Settings2}
              onClick={() => setShowVoice((v) => !v)}
              aria-label={t('roomUI.voiceSettings')}
            >
              <span className="hidden sm:inline">{t('roomUI.voice')}</span>
            </Button>

            {/* Pause button */}
            <Button
              variant="secondary"
              size="sm"
              icon={Pause}
              onClick={pause}
              disabled={!['speaking', 'waiting', 'listening', 'review'].includes(ui)}
            >
              <span className="hidden sm:inline">{t('roomUI.pause')}</span>
            </Button>

            {/* End Interview button */}
            <Button
              variant="outlineDanger"
              size="sm"
              icon={X}
              onClick={() => setShowEnd(true)}
              disabled={ui === 'completing'}
            >
              <span className="hidden sm:inline">{t('roomUI.end')}</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="mx-auto max-w-[1520px] px-2 py-4 sm:px-4 sm:py-6">
        {/* Top Stages Progress Bar */}
        <div className="mb-5 overflow-hidden rounded-2xl border border-line/60 bg-ink-950/70 p-3 backdrop-blur">
          <ol className="flex items-center gap-2" aria-label={t('roomUI.stages')}>
            {p.stages.map((s, i) => (
              <li key={s.key} className="flex-1" title={t(`feedback.stages.${s.key}`, s.name)}>
                <div
                  className={`h-2 rounded-full transition-all duration-700 ${
                    s.done
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : i === state.stage.index
                      ? 'bg-gradient-to-r from-brand-violet to-brand-blue ring-2 ring-brand-violet/30'
                      : 'bg-ink-800'
                  }`}
                />
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span
                    className={`hidden truncate font-medium sm:block ${
                      i === state.stage.index ? 'font-semibold text-fg' : 'text-muted'
                    }`}
                  >
                    {t(`feedback.stages.${s.key}`, s.name)}
                  </span>
                  {s.done && <CheckCircle2 size={11} className="hidden text-emerald-400 sm:inline" />}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Voice settings drawer */}
        {showVoice && (
          <div className="surface rise mb-6 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-semibold">{t('roomUI.voiceSettings')}</h3>
              <button
                type="button"
                onClick={() => setShowVoice(false)}
                className="rounded-lg p-1 text-muted hover:bg-ink-700 hover:text-fg"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-4">
              <VoiceSettings
                synth={synth}
                speechOn={speechOn}
                setSpeechOn={setSpeechOn}
                lang={state.config.language}
                recognitionSupported={rec.supported}
                test={testVoice}
              />
            </div>
          </div>
        )}

        {/* Dynamic Inner Screens: Stage Feedback / Error / Active Workspace */}
        {ui === 'stage_feedback' ? (
          <div className="mx-auto max-w-4xl">
            <StageFeedback
              fb={state.stageFeedback}
              stage={state.stage}
              isLast={state.isLastStage}
              busy={busy}
              error={err}
              onReview={openReview}
              onContinue={() => (state.isLastStage ? finish(false) : advance())}
            />
          </div>
        ) : ui === 'error' ? (
          <div className="surface mx-auto max-w-lg p-8 text-center shadow-2xl" role="alert">
            <AlertCircle className="mx-auto text-red-400" size={38} />
            <p className="mt-4 text-xl font-bold">{t('roomUI.errorTitle')}</p>
            <p className="mt-2 text-sm text-muted">{err}</p>
            <p className="mt-1 text-xs text-muted">{t('roomUI.saved')}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => retry.current?.()}>{t('roomUI.tryAgain')}</Button>
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                {t('roomUI.leave')}
              </Button>
            </div>
          </div>
        ) : (
          /* ==========================================================
             THREE-COLUMN WORKSPACE: LEFT (AI) | CENTER (Q&A) | RIGHT (CAMERA)
             ========================================================== */
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            {/* ----------------- LEFT AREA: AI INTERVIEWER (3 cols) ----------------- */}
            <div className="lg:col-span-3">
              <AiInterviewerCard
                ui={ui}
                speaking={speaking}
                paused={paused}
                speechOn={speechOn}
                synth={synth}
                rec={rec}
                repeatQuestion={repeat}
                stopSpeech={stopSpeech}
                onOpenVoiceSettings={() => setShowVoice((v) => !v)}
              />
            </div>

            {/* ----------------- CENTER AREA: QUESTION & ANSWER WORKSPACE (6 cols) ----------------- */}
            <div className="space-y-6 lg:col-span-6">
              {/* Question Card */}
              <div className="relative overflow-hidden rounded-3xl border border-line/80 bg-gradient-to-b from-ink-800/90 via-ink-900/90 to-ink-950 p-6 sm:p-7 shadow-2xl backdrop-blur">
                {/* Header Tag / Question Number */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand-violet/15 px-3 py-1 text-xs font-semibold text-brand-soft">
                      {t('interview.question', 'Question')} {p.questionNumber}
                    </span>
                    {state.question?.isFollowUp && (
                      <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                        {t('roomUI.followUp', 'Follow-up')}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted">
                    {t(`feedback.stages.${state.stage.key}`, state.stage.name)}
                  </span>
                </div>

                {/* Question Text */}
                {!isGenerating && state.question ? (
                  <div className="min-h-[90px]">
                    <h2 className="font-display text-xl sm:text-2xl leading-snug font-semibold text-fg" aria-live="polite">
                      {state.question.text}
                    </h2>
                    {voiceNotice && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/10 p-2.5 text-xs text-amber-300">
                        <VolumeX size={14} className="shrink-0" />
                        <span>{voiceNotice}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-[90px] flex-col justify-center">
                    <p className="flex items-center gap-2 text-base font-medium text-brand-soft">
                      <Sparkles size={16} className="animate-spin" />
                      <span>
                        {ui === 'completing'
                          ? t('roomUI.analysing')
                          : ui === 'stage_loading'
                          ? t('roomUI.reviewing')
                          : t('roomUI.thinking')}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {t('interview.aiGenerating', 'Preparing question...')}
                    </p>
                  </div>
                )}

                {/* Helpful Stage Hint / Tip Box */}
                <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-line/60 bg-ink-950/60 p-3.5 text-xs">
                  <Lightbulb size={16} className="mt-0.5 shrink-0 text-amber-400" />
                  <div className="flex-1 text-muted">
                    <span className="font-semibold text-fg/90">{t('interview.tip', 'Tip')}: </span>
                    <span>{getStageHint(state.stage.key)}</span>
                  </div>
                </div>
              </div>

              {/* Answer Workspace Area */}
              {inAnswer && (
                <div className="relative overflow-hidden rounded-3xl border border-line/80 bg-gradient-to-b from-ink-800/90 to-ink-950 p-6 shadow-2xl backdrop-blur">
                  {/* Mode Selector Tabs */}
                  <div className="mb-5 flex items-center justify-between border-b border-line/60 pb-3">
                    <div className="flex items-center gap-2 rounded-xl bg-ink-950 p-1 border border-line/50">
                      <button
                        type="button"
                        onClick={() => setInputModeTab('voice')}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          inputModeTab === 'voice'
                            ? 'bg-brand-violet text-white shadow'
                            : 'text-muted hover:text-fg'
                        }`}
                      >
                        <Mic size={14} />
                        <span>{t('interview.voiceMode', 'Voice Mode')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInputModeTab('text');
                          if (rec.listening) rec.stop();
                          textareaRef.current?.focus();
                        }}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          inputModeTab === 'text'
                            ? 'bg-brand-violet text-white shadow'
                            : 'text-muted hover:text-fg'
                        }`}
                      >
                        <Keyboard size={14} />
                        <span>{t('interview.textMode', 'Text Mode')}</span>
                      </button>
                    </div>

                    <span className="hidden text-xs text-muted sm:inline">
                      {inputModeTab === 'voice'
                        ? t('interview.voiceModeDesc', 'Speak your answer')
                        : t('interview.textModeDesc', 'Type your answer')}
                    </span>
                  </div>

                  {/* Voice Controls Section (Active in Voice Mode) */}
                  {inputModeTab === 'voice' && (
                    <div className="mb-5 flex flex-col items-center justify-center rounded-2xl border border-line/50 bg-ink-950/70 p-5 text-center">
                      {rec.supported ? (
                        <>
                          <button
                            type="button"
                            onClick={toggleMic}
                            aria-pressed={rec.listening}
                            className={`relative grid size-20 place-items-center rounded-full text-white shadow-xl transition-all duration-300 active:scale-95 ${
                              rec.listening
                                ? 'bg-emerald-500 shadow-emerald-500/30 ring-4 ring-emerald-400/40'
                                : 'bg-gradient-to-tr from-brand-violet to-brand-blue hover:scale-105'
                            }`}
                          >
                            {rec.listening ? <Square size={26} /> : <Mic size={28} />}
                          </button>

                          <p className="mt-3 text-sm font-medium">
                            {rec.listening ? (
                              <span className="text-emerald-300">
                                {t('roomUI.listening')} <span className="font-display font-bold tabular-nums">({mmss(rec.seconds)})</span>
                              </span>
                            ) : rec.transcript ? (
                              <span className="text-brand-soft">{t('roomUI.addAnswer')}</span>
                            ) : (
                              <span className="text-fg/80">{t('roomUI.speakAnswer')}</span>
                            )}
                          </p>

                          <div className="mt-2 w-full max-w-xs">
                            <Waveform active={rec.listening} tone="user" height={32} />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-amber-300">
                          <MicOff size={16} />
                          <span>{t('roomUI.micUnsupported', 'Microphone is not supported in this browser.')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {rec.error && (
                    <div className="mb-4">
                      <FormAlert>{rec.error}</FormAlert>
                    </div>
                  )}

                  {/* Textarea for editing speech or direct typing */}
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <label htmlFor="answer" className="font-medium text-fg/90 flex items-center gap-1.5">
                        <Keyboard size={13} className="text-muted" />
                        <span>{t('roomUI.answer')}</span>
                        <span className="text-muted font-normal">({t('roomUI.edit')})</span>
                      </label>
                      <span className="text-muted tabular-nums">
                        {rec.transcript.length} / 4000
                      </span>
                    </div>

                    <textarea
                      ref={textareaRef}
                      id="answer"
                      rows={5}
                      value={rec.transcript}
                      readOnly={rec.listening}
                      maxLength={4000}
                      onKeyDown={handleKeyDown}
                      onChange={(e) => rec.setTranscript(e.target.value)}
                      placeholder={t('roomUI.placeholder', 'Your spoken or typed answer appears here...')}
                      className="w-full resize-y rounded-2xl border border-line bg-ink-950/80 p-4 text-sm leading-relaxed text-fg placeholder:text-muted/60 focus:border-brand-violet focus:outline-none focus:ring-2 focus:ring-brand-violet/25"
                    />

                    {rec.listening && rec.interim && (
                      <p className="mt-1.5 text-xs italic text-brand-soft/90 animate-pulse">
                        "{rec.interim}"
                      </p>
                    )}

                    {err && <p className="mt-2 text-xs text-red-400">{err}</p>}
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          rec.reset();
                          setErr('');
                        }}
                        disabled={!rec.transcript || rec.listening}
                        className="text-xs font-medium text-muted hover:text-fg disabled:opacity-40"
                      >
                        {t('interview.clearAnswer', 'Clear answer')}
                      </button>
                      <span className="hidden text-[11px] text-muted sm:inline">
                        {t('interview.submitHint', 'Press Ctrl + Enter to submit')}
                      </span>
                    </div>

                    <Button
                      onClick={submit}
                      icon={Send}
                      size="md"
                      disabled={rec.transcript.trim().length < 2 || submitting.current}
                      className="px-6 font-semibold shadow-lg shadow-brand-violet/25"
                    >
                      {t('roomUI.submit', 'Submit answer')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Processing Spinner state */}
              {ui === 'processing' && (
                <div className="surface rise p-8 text-center shadow-2xl">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-violet/20 text-brand-soft animate-bounce">
                    <Sparkles size={28} />
                  </div>
                  <p className="mt-4 text-lg font-bold text-fg">{t('roomUI.processing')}</p>
                  <p className="mt-1 text-sm text-muted">{t('roomUI.processingText')}</p>
                </div>
              )}

              {/* Answer Feedback Card when review phase is reached */}
              {ui === 'review' && state.answer && (
                <AnswerFeedback
                  answer={state.answer}
                  stageEnding={state.stageEnding}
                  busy={false}
                  error={err}
                  onContinue={() => advance()}
                />
              )}
            </div>

            {/* ----------------- RIGHT AREA: USER CAMERA & INTERVIEW INFO (3 cols) ----------------- */}
            <div className="space-y-6 lg:col-span-3">
              <WebcamPreview webcam={webcam} />
              <InterviewInfoCard state={state} config={config} elapsed={elapsed} />
            </div>
          </div>
        )}
      </div>

      {/* Paused Overlay */}
      {paused && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-950/90 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={t('roomUI.paused')}
        >
          <div className="surface rise max-w-sm p-8 text-center shadow-2xl">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand-violet/20 text-brand-soft">
              <Pause size={32} />
            </div>
            <h2 className="mt-4 text-2xl font-bold">{t('roomUI.paused')}</h2>
            <p className="mt-2 text-sm text-muted">{t('roomUI.timerStopped')}</p>
            <Button className="mt-6 w-full" icon={Play} onClick={resume}>
              {t('roomUI.resumeInterview')}
            </Button>
          </div>
        </div>
      )}

      {/* End Interview Confirmation Modal */}
      <Modal open={showEnd} onClose={() => setShowEnd(false)} title={t('roomUI.endTitle')}>
        <p className="text-sm text-muted">
          {p.answered > 0
            ? t('roomUI.endCount', { count: p.answered })
            : t('roomUI.endNone')}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowEnd(false)}>
            {t('roomUI.keepGoing')}
          </Button>
          <Button variant="danger" onClick={() => finish(true)}>
            {t('roomUI.endInterview')}
          </Button>
        </div>
      </Modal>

      {/* Stage Answers Review Modal */}
      <Modal open={Boolean(review)} onClose={() => setReview(null)} title={t('roomUI.stageAnswers')}>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {review?.map(({ q, a }) => (
            <div key={q._id} className="rounded-2xl border border-line bg-ink-900/60 p-4">
              <p className="text-sm font-semibold text-fg">{q.text}</p>
              <p className="mt-2 text-sm text-muted">{a?.transcript || t('roomUI.noAnswer')}</p>
              {a?.score != null && (
                <p className="mt-2 text-xs font-semibold text-brand-soft">
                  {t('roomUI.score')}: {a.score}/100
                </p>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </Shell>
  );
}

function Shell({ header, children }) {
  return (
    <div className="min-h-screen bg-ink-950 text-fg">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1520px] items-center gap-4 px-4 sm:px-6">
          <Logo to="/dashboard" className="shrink-0" />
          {header || <div className="flex-1" />}
          <LanguageSwitcher />
        </div>
      </header>
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
    </div>
  );
}
