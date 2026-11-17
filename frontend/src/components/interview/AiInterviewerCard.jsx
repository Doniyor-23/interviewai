import { Volume2, VolumeX, RotateCcw, Pause, Play, Square, Sparkles, Brain, Mic, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Waveform } from './Visuals';

/**
 * Premium AI Interviewer Avatar Card with 4 dynamic visual states:
 * 1. Generating question: animated loading/pulsing ring
 * 2. Speaking: audio waveform/equalizer synchronized with speech playback
 * 3. Listening: calm idle state with subtle breathing/pulse animation
 * 4. Evaluating: neural processing animation
 */
export default function AiInterviewerCard({
  ui,
  speaking,
  paused,
  speechOn,
  synth,
  rec,
  repeatQuestion,
  stopSpeech,
  onOpenVoiceSettings,
  className = '',
}) {
  const { t } = useTranslation();

  const isGenerating = ['preparing', 'preparing_next', 'stage_loading'].includes(ui);
  const isEvaluating = ['processing', 'completing'].includes(ui);
  const isListeningToUser = ui === 'listening' || rec.listening;
  const isWaiting = ui === 'waiting';

  // Determine current active state label & styling
  let stateTitle = t('feedback.status.waiting', 'Waiting for you');
  let stateSubtitle = t('interview.aiIdleDesc', 'Take your time to formulate your answer');
  let badgeColor = 'bg-slate-800/80 text-slate-300 border-slate-700/60';
  let badgeDot = 'bg-slate-400';

  if (paused) {
    stateTitle = t('feedback.status.paused', 'Paused');
    stateSubtitle = t('roomUI.timerStopped', 'Interview is paused');
    badgeColor = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    badgeDot = 'bg-amber-400';
  } else if (isGenerating) {
    stateTitle = t('interview.aiGenerating', 'Formulating Question...');
    stateSubtitle = t('roomUI.thinking', 'Preparing next question');
    badgeColor = 'bg-sky-500/10 text-sky-300 border-sky-500/30';
    badgeDot = 'bg-sky-400 animate-ping';
  } else if (speaking) {
    stateTitle = t('interview.aiSpeaking', 'AI is Speaking');
    stateSubtitle = t('interview.listenQuestion', 'Listen carefully to the question');
    badgeColor = 'bg-brand-violet/20 text-brand-soft border-brand-violet/40';
    badgeDot = 'bg-brand-violet animate-pulse';
  } else if (isListeningToUser) {
    stateTitle = t('interview.aiListening', 'Listening to You');
    stateSubtitle = t('roomUI.listening', 'Recording your response');
    badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    badgeDot = 'bg-emerald-400 animate-ping';
  } else if (isEvaluating) {
    stateTitle = t('interview.aiEvaluating', 'Evaluating Response...');
    stateSubtitle = t('roomUI.processingText', 'Analyzing technical accuracy and clarity');
    badgeColor = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    badgeDot = 'bg-indigo-400 animate-spin';
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-between overflow-hidden rounded-3xl border border-line/80 bg-gradient-to-b from-ink-800/90 via-ink-900/95 to-ink-950 p-6 shadow-2xl backdrop-blur transition-all duration-500 ${className}`}
    >
      {/* Background ambient glow behind avatar */}
      <div
        className={`pointer-events-none absolute -top-12 size-64 rounded-full blur-3xl transition-opacity duration-700 ${
          speaking
            ? 'bg-brand-violet/25 opacity-100'
            : isListeningToUser
            ? 'bg-emerald-500/20 opacity-90'
            : isGenerating || isEvaluating
            ? 'bg-sky-500/20 opacity-90'
            : 'bg-brand-blue/15 opacity-60'
        }`}
      />

      {/* Header: AI Status Badge */}
      <div className="relative z-10 mb-4 flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-lg bg-brand-violet/20 text-brand-soft">
            <Sparkles size={13} />
          </span>
          <span className="text-xs font-semibold tracking-wide text-fg/80 uppercase">
            {t('interview.aiInterviewer', 'AI Interviewer')}
          </span>
        </div>

        <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur ${badgeColor}`}>
          <span className={`size-1.5 rounded-full ${badgeDot}`} />
          <span>{stateTitle}</span>
        </div>
      </div>

      {/* Main Avatar Visual Container */}
      <div className="relative my-2 flex size-44 items-center justify-center sm:size-48">
        {/* Outer Aura Ring for Speaking */}
        {speaking && !paused && (
          <>
            <span className="ring-pulse absolute inset-0 rounded-full bg-brand-violet/30" />
            <span className="ring-pulse absolute inset-0 rounded-full bg-brand-blue/20 [animation-delay:650ms]" />
          </>
        )}

        {/* Orbiting Ring for Question Generation */}
        {isGenerating && !paused && (
          <div className="animate-spin-slow pointer-events-none absolute inset-[-8px] rounded-full border-2 border-dashed border-sky-400/50" />
        )}

        {/* Rotating Processing Ring for Evaluation */}
        {isEvaluating && !paused && (
          <div className="animate-spin-fast pointer-events-none absolute inset-[-10px] rounded-full border-2 border-t-brand-violet border-r-brand-blue border-b-transparent border-l-transparent" />
        )}

        {/* Calming Pulse Ring for Listening to User */}
        {isListeningToUser && !paused && (
          <div className="pointer-events-none absolute inset-[-6px] rounded-full border border-emerald-400/40 animate-pulse" />
        )}

        {/* Avatar Frame: Sleek stylized holographic AI Persona */}
        <div
          className={`relative grid size-36 place-items-center rounded-full border-2 transition-all duration-500 sm:size-40 ${
            speaking
              ? 'avatar-speak-pulse border-brand-violet bg-gradient-to-tr from-[#1b1747] via-[#10193e] to-[#0c1c4d]'
              : isListeningToUser
              ? 'border-emerald-400/60 bg-gradient-to-tr from-[#0b2824] via-[#0d1f3b] to-[#0a1532] breathe'
              : isGenerating || isEvaluating
              ? 'border-sky-400/60 bg-gradient-to-tr from-[#0d2242] via-[#121c44] to-[#151745]'
              : 'border-line/90 bg-gradient-to-tr from-[#0b1229] via-[#0e1738] to-[#14183d] breathe'
          }`}
        >
          {/* Futuristic AI Avatar Face Vector Graphic */}
          <div className="relative flex size-28 items-center justify-center sm:size-32">
            <svg
              viewBox="0 0 100 100"
              className="size-full filter drop-shadow-[0_4px_12px_rgba(124,92,255,0.4)]"
              aria-label="AI Interviewer"
            >
              <defs>
                <linearGradient id="avatarGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7c5cff" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="faceShine" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Head Silhouette Base */}
              <circle cx="50" cy="50" r="44" fill="#0b112c" stroke="url(#avatarGlow)" strokeWidth="2.5" />
              <circle cx="50" cy="50" r="43" fill="url(#faceShine)" />

              {/* Neural Circuit Lines on Temple */}
              <path
                d="M18 42 H30 L38 34 H44"
                stroke="rgba(124, 92, 255, 0.4)"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M82 42 H70 L62 34 H56"
                stroke="rgba(59, 130, 246, 0.4)"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="18" cy="42" r="2" fill="#7c5cff" />
              <circle cx="82" cy="42" r="2" fill="#3b82f6" />

              {/* Futuristic Visor / Eyes */}
              <g className={speaking ? 'animate-pulse' : ''}>
                <rect
                  x="28"
                  y="40"
                  width="44"
                  height="14"
                  rx="7"
                  fill="#070b1a"
                  stroke={speaking ? '#7c5cff' : isListeningToUser ? '#10b981' : '#3b82f6'}
                  strokeWidth="2"
                />
                {/* Glowing Pupil / Scanline */}
                {speaking ? (
                  <>
                    <line x1="34" y1="47" x2="66" y2="47" stroke="#c4b9ff" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="50" cy="47" r="3.5" fill="#ffffff" />
                  </>
                ) : isListeningToUser ? (
                  <>
                    <circle cx="42" cy="47" r="3" fill="#34d399" />
                    <circle cx="58" cy="47" r="3" fill="#34d399" />
                  </>
                ) : isGenerating || isEvaluating ? (
                  <circle cx="50" cy="47" r="3.5" fill="#38bdf8" className="animate-ping" />
                ) : (
                  <>
                    <circle cx="42" cy="47" r="2.5" fill="#7c5cff" />
                    <circle cx="58" cy="47" r="2.5" fill="#3b82f6" />
                  </>
                )}
              </g>

              {/* Minimal Cybernetic Mouth / Audio Node */}
              {speaking ? (
                /* Equalizer mouth when speaking */
                <g className="translate-y-1">
                  <line x1="42" y1="67" x2="42" y2="73" stroke="#7c5cff" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="46" y1="65" x2="46" y2="75" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="50" y1="64" x2="50" y2="76" stroke="#c4b9ff" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="54" y1="65" x2="54" y2="75" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="58" y1="67" x2="58" y2="73" stroke="#7c5cff" strokeWidth="2.5" strokeLinecap="round" />
                </g>
              ) : isListeningToUser ? (
                /* Calm subtle listening curve */
                <path d="M42 68 Q50 72 58 68" stroke="#10b981" strokeWidth="2" strokeLinecap="round" fill="none" />
              ) : (
                /* Sleek baseline indicator */
                <line x1="44" y1="68" x2="56" y2="68" stroke="rgba(141, 152, 196, 0.6)" strokeWidth="2" strokeLinecap="round" />
              )}

              {/* Lower Collar / Neural Node */}
              <path
                d="M36 84 Q50 90 64 84"
                stroke="url(#avatarGlow)"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="50" cy="87" r="2.5" fill="#7c5cff" />
            </svg>
          </div>

          {/* Dynamic 5-bar Equalizer Overlay when AI is speaking */}
          {speaking && !paused && (
            <div className="absolute -bottom-2 flex items-center justify-center gap-1 rounded-full border border-brand-violet/40 bg-ink-950/90 px-3 py-1 shadow-lg backdrop-blur">
              <span className="equalizer-bar-1 w-1 rounded-full bg-brand-violet" />
              <span className="equalizer-bar-2 w-1 rounded-full bg-brand-blue" />
              <span className="equalizer-bar-3 w-1 rounded-full bg-brand-soft" />
              <span className="equalizer-bar-4 w-1 rounded-full bg-brand-blue" />
              <span className="equalizer-bar-5 w-1 rounded-full bg-brand-violet" />
            </div>
          )}
        </div>
      </div>

      {/* Subtitle / Context description */}
      <div className="relative z-10 my-2 text-center">
        <p className="text-xs text-muted/90">{stateSubtitle}</p>
      </div>

      {/* Waveform / Visual Equalizer */}
      <div className="relative z-10 my-1 w-full max-w-[220px]">
        {speaking ? (
          <Waveform active={true} tone="ai" height={36} />
        ) : isListeningToUser ? (
          <Waveform active={true} tone="user" height={36} />
        ) : (
          <Waveform active={false} tone="ai" height={36} />
        )}
      </div>

      {/* Audio & Interaction Controls Toolbar */}
      <div className="relative z-10 mt-3 flex w-full flex-wrap items-center justify-center gap-2 border-t border-line/60 pt-4">
        <button
          type="button"
          onClick={repeatQuestion}
          disabled={!synth.supported || isGenerating || isEvaluating}
          className="flex items-center gap-1.5 rounded-xl border border-line bg-ink-800/80 px-3 py-2 text-xs font-medium text-fg/90 transition hover:bg-ink-700/80 hover:text-white disabled:opacity-40"
          title={t('roomUI.repeat', 'Repeat question')}
        >
          <RotateCcw size={13} className="text-brand-soft" />
          <span>{t('roomUI.repeat', 'Repeat')}</span>
        </button>

        {speaking && (
          <button
            type="button"
            onClick={stopSpeech}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-ink-800/80 px-3 py-2 text-xs font-medium text-amber-300 transition hover:bg-ink-700/80"
            title={t('roomUI.stopSpeech', 'Stop speech')}
          >
            <Square size={13} />
            <span>{t('roomUI.stopSpeech', 'Mute')}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenVoiceSettings}
          className="flex items-center gap-1.5 rounded-xl border border-line bg-ink-800/80 px-3 py-2 text-xs font-medium text-fg/90 transition hover:bg-ink-700/80 hover:text-white"
          title={t('roomUI.voiceSettings', 'Voice settings')}
        >
          <Volume2 size={13} className="text-brand-soft" />
          <span>{t('roomUI.voice', 'Voice')}</span>
        </button>
      </div>
    </div>
  );
}
