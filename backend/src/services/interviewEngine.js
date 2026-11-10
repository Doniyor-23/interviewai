import { STAGE_FOCUS } from './prompts.js';

export const STAGE_NAMES = { introduction: 'Introduction', fundamentals: 'Fundamental Knowledge', practical: 'Practical Questions', problem_solving: 'Problem Solving', behavioral: 'Behavioral Interview' };
const BUDGET = { 10: 5, 20: 9, 30: 13 }; // total main questions by duration (~2 min each)
const WEIGHTS = {
  technical: { introduction: 0.1, fundamentals: 0.35, practical: 0.3, problem_solving: 0.25 },
  mixed: { introduction: 0.1, fundamentals: 0.25, practical: 0.25, problem_solving: 0.2, behavioral: 0.2 },
  hr: { introduction: 0.25, practical: 0.25, behavioral: 0.5 },
  behavioral: { introduction: 0.2, practical: 0.2, behavioral: 0.6 },
};
const ORDER = ['introduction', 'fundamentals', 'practical', 'problem_solving', 'behavioral'];

/** Largest-remainder allocation, at least 1 per stage (shrinks the stage count if the budget is too small). */
export function planStages({ interviewType, durationMinutes }) {
  const total = BUDGET[durationMinutes] || 9;
  let keys = ORDER.filter((k) => WEIGHTS[interviewType]?.[k]);
  if (!keys.length) keys = ORDER;
  const w = WEIGHTS[interviewType] || WEIGHTS.mixed;
  const sumW = keys.reduce((s, k) => s + w[k], 0);
  const raw = keys.map((k) => ({ k, v: (w[k] / sumW) * total }));
  const counts = Object.fromEntries(raw.map((r) => [r.k, Math.max(1, Math.floor(r.v))]));
  let left = total - Object.values(counts).reduce((a, b) => a + b, 0);
  [...raw].sort((a, b) => (b.v % 1) - (a.v % 1)).forEach((r) => { if (left > 0) { counts[r.k]++; left--; } });
  const extra = durationMinutes >= 20 ? 1 : 0; // spare slot reserved for follow-ups
  return keys.map((k) => ({ key: k, name: STAGE_NAMES[k], targetQuestions: counts[k], maxQuestions: counts[k] + extra }));
}

const sid = (x) => String(x);
const answerFor = (iv, q) => iv.answers.find((a) => sid(a.questionId) === sid(q._id));
export const stageResultFor = (iv, key) => iv.stageResults.find((s) => s.stage === key);
export const isDone = (a) => a && a.evaluationStatus === 'done';

/** What should happen next? Pure function of saved data, so every endpoint is idempotent and refresh-safe. */
export function planNext(iv) {
  const idx = iv.currentStageIndex || 0;
  const stage = iv.stagePlan[idx];
  const last = iv.questions[iv.questions.length - 1];
  const lastAns = last ? answerFor(iv, last) : null;
  if (last && !isDone(lastAns)) return { type: 'current', question: last, answer: lastAns, stage, stageIndex: idx };

  const asked = iv.questions.filter((q) => q.stage === stage.key).length;
  const inStage = last && last.stage === stage.key;
  const follow = !!(inStage && lastAns.followUpNeeded && !last.isFollowUp && asked < stage.maxQuestions);
  if (follow || asked < stage.targetQuestions) {
    return { type: 'generate', mode: follow ? 'followup' : 'main', stage, stageIndex: idx, followUpOf: follow ? last : null, lastAnswer: lastAns };
  }
  if (!stageResultFor(iv, stage.key)) return { type: 'stage_complete', stage, stageIndex: idx };
  if (idx >= iv.stagePlan.length - 1) return { type: 'all_done', stage, stageIndex: idx };
  return { type: 'advance', stage: iv.stagePlan[idx + 1], stageIndex: idx + 1, lastAnswer: lastAns };
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const r = (n) => (n == null ? null : Math.round(n));
export const evaluated = (iv) => iv.answers.filter(isDone);
export const stageScore = (iv, key) => r(mean(evaluated(iv).filter((a) => a.stage === key).map((a) => a.score)));
export const overallScore = (iv) => r(mean(evaluated(iv).map((a) => a.score)));
export const averageScore = (iv) => mean(evaluated(iv).map((a) => a.score));

export function levelFor(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Competent';
  if (score >= 40) return 'Developing';
  return 'Needs foundation';
}

export function computeMetrics(iv) {
  const ev = evaluated(iv);
  const m = (f) => r(mean(ev.map((a) => a[f]).filter((v) => typeof v === 'number')));
  return {
    technicalKnowledge: m('accuracy'),
    communication: m('communication'),
    clarity: m('clarity'),
    problemSolving: stageScore(iv, 'problem_solving'), // null when the interview had no problem-solving stage
    relevance: m('relevance'),
    completeness: m('completeness'),
  };
}
export const METRIC_LABELS = { technicalKnowledge: 'Technical knowledge', communication: 'Communication', clarity: 'Clarity', problemSolving: 'Problem solving', relevance: 'Answer relevance', completeness: 'Completeness' };

export function qaFor(iv, filter = () => true) {
  return iv.questions.filter(filter).map((q) => ({ q, a: answerFor(iv, q) })).filter((x) => isDone(x.a)).map(({ q, a }) => ({
    id: sid(q._id), stage: q.stage, question: q.text, answer: a.transcript, score: a.score, strengths: a.strengths || [], weaknesses: a.weaknesses || [],
    corrections: a.corrections || [], improvedAnswer: a.improvedAnswer || '', weakTopics: a.weakTopics || [],
  }));
}

/** The view model the frontend renders. */
export function deriveState(iv) {
  if (!iv.stagePlan?.length) {
    // Legacy / draft record with no interview plan: nothing to run, but never crash.
    return { interviewId: sid(iv._id), status: iv.status, phase: iv.status === 'completed' ? 'completed' : 'closed', question: null, answer: null, stageFeedback: null, isLastStage: false, timeSpentSeconds: iv.timeSpentSeconds || 0,
      config: { career: iv.career, experienceLevel: iv.experienceLevel, difficulty: iv.difficulty, language: iv.language, interviewType: iv.interviewType, durationMinutes: iv.durationMinutes },
      stage: { key: 'introduction', name: 'Introduction', index: 0, total: 0 }, progress: { answered: 0, planned: 0, questionNumber: 0, stages: [] } };
  }
  const step = planNext(iv);
  const plan = iv.stagePlan;
  const stages = plan.map((s, i) => {
    const qs = iv.questions.filter((q) => q.stage === s.key);
    const answered = qs.filter((q) => isDone(answerFor(iv, q))).length;
    return { key: s.key, name: s.name, target: s.targetQuestions, asked: qs.length, answered, done: i < iv.currentStageIndex || !!stageResultFor(iv, s.key), score: stageScore(iv, s.key) };
  });
  const last = iv.questions[iv.questions.length - 1];
  const lastAns = last ? answerFor(iv, last) : null;
  const stage = plan[iv.currentStageIndex] || plan[0];
  const base = {
    interviewId: sid(iv._id), status: iv.status,
    config: { career: iv.career, experienceLevel: iv.experienceLevel, difficulty: iv.difficulty, language: iv.language, interviewType: iv.interviewType, durationMinutes: iv.durationMinutes },
    stage: { key: stage.key, name: stage.name, focus: STAGE_FOCUS[stage.key], index: iv.currentStageIndex, total: plan.length },
    progress: { answered: evaluated(iv).length, planned: plan.reduce((s, p) => s + p.targetQuestions, 0), questionNumber: iv.questions.length, stages },
    timeSpentSeconds: iv.timeSpentSeconds || 0, startedAt: iv.startedAt,
    question: last ? { id: sid(last._id), text: last.text, order: last.order, stage: last.stage, isFollowUp: !!last.isFollowUp } : null,
    answer: null, stageFeedback: null, isLastStage: false,
  };
  if (iv.status === 'completed') return { ...base, phase: 'completed' };
  if (iv.status !== 'in_progress') return { ...base, phase: 'closed' };
  if (!last) return { ...base, phase: 'start' };
  if (step.type === 'current') return { ...base, phase: 'ask', answer: lastAns ? { transcript: lastAns.transcript, pendingEvaluation: true } : null };
  if (step.type === 'advance' || step.type === 'all_done') {
    return { ...base, phase: 'stage_feedback', stageFeedback: stageResultFor(iv, step.type === 'all_done' ? step.stage.key : iv.stagePlan[step.stageIndex - 1].key), isLastStage: step.type === 'all_done' };
  }
  return { ...base, phase: 'review', answer: lastAns, stageEnding: step.type === 'stage_complete' };
}
