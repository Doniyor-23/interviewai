import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { SYSTEM, evaluationPrompt, questionPrompt, recommendationsPrompt, reportPrompt, stagePrompt } from './prompts.js';

/* ---------- schema helpers (Gemini structured output) ---------- */
const S = {
  str: (description) => ({ type: Type.STRING, description }),
  num: (description) => ({ type: Type.NUMBER, description }),
  bool: (description) => ({ type: Type.BOOLEAN, description }),
  arr: (items) => ({ type: Type.ARRAY, items }),
  obj: (properties) => ({ type: Type.OBJECT, properties, required: Object.keys(properties) }),
};

/* ---------- client + model selection ---------- */
let client;
const getClient = () => {
  if (!env.geminiKey) throw new ApiError(503, 'The AI interviewer is not configured yet. Add GEMINI_API_KEY to backend/.env and restart the server.', { code: 'AI_NOT_CONFIGURED' });
  client ||= new GoogleGenAI({ apiKey: env.geminiKey, ...(env.geminiBaseUrl ? { httpOptions: { baseUrl: env.geminiBaseUrl } } : {}) });
  return client;
};
// Model names churn quickly. Order: explicit override, then aliases/current families, then discovery via models.list().
const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash'];
let workingModel = null;
let dead = new Set();
const candidates = () => [workingModel, env.geminiModel, ...FALLBACK_MODELS].filter((m, i, a) => m && a.indexOf(m) === i && !dead.has(m));

async function discoverModel() {
  try {
    const pager = await getClient().models.list();
    const names = [];
    for await (const m of pager) {
      const n = (m.name || '').replace(/^models\//, '');
      if (/^gemini-.*flash/.test(n) && !/(lite|image|tts|live|audio|embedding|thinking|exp|vision)/.test(n) && (!m.supportedActions || m.supportedActions.includes('generateContent'))) names.push(n);
    }
    names.sort().reverse();
    return names.find((n) => !dead.has(n)) || null;
  } catch { return null; }
}

/* ---------- error classification ---------- */
const statusOf = (e) => e?.status ?? e?.code ?? e?.error?.code;
const msgOf = (e) => String(e?.message || e);
const isModelMissing = (e) => statusOf(e) === 404 || /not found|no longer available|is not supported|unsupported model/i.test(msgOf(e)) && statusOf(e) !== 429;
const isAuth = (e) => [401, 403].includes(statusOf(e)) || /api key not valid|API_KEY_INVALID|permission denied/i.test(msgOf(e));
const isRate = (e) => statusOf(e) === 429 || /RESOURCE_EXHAUSTED|quota/i.test(msgOf(e));
const isTransient = (e) => [500, 502, 503, 504].includes(statusOf(e)) || /UNAVAILABLE|overloaded|fetch failed|ECONN|ETIMEDOUT|socket/i.test(msgOf(e));
class BadAi extends Error {}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toApiError(e) {
  if (e instanceof ApiError) return e;
  if (e?.timedOut) return new ApiError(504, 'The AI took too long to respond. Please try again.', { code: 'AI_TIMEOUT' });
  if (isRate(e)) return new ApiError(429, 'The AI is very busy right now. Please wait a few seconds and try again.', { code: 'AI_RATE_LIMITED', retryAfter: 10 });
  if (isAuth(e)) { console.error('[gemini] auth error:', msgOf(e)); return new ApiError(503, 'The AI service rejected our credentials. Check GEMINI_API_KEY on the server.', { code: 'AI_AUTH' }); }
  if (e?.blocked) return new ApiError(422, 'The AI could not process that content. Try rephrasing your answer.', { code: 'AI_BLOCKED' });
  if (e instanceof BadAi) return new ApiError(502, 'The AI returned an unusable response. Please try again.', { code: 'AI_BAD_RESPONSE' });
  if (e?.noModel) return new ApiError(503, 'No available Gemini model was found. Set GEMINI_MODEL in backend/.env to a model your key can use.', { code: 'AI_NO_MODEL' });
  console.error('[gemini] unexpected error:', msgOf(e));
  return new ApiError(503, 'The AI service is temporarily unavailable. Please try again.', { code: 'AI_UNAVAILABLE' });
}

/* ---------- core call: JSON out, validated, with retries ---------- */
async function generateOnce(model, prompt, schema, temperature, useSchema) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), env.geminiTimeoutMs);
  try {
    const config = { systemInstruction: SYSTEM, temperature, responseMimeType: 'application/json', abortSignal: ctrl.signal };
    if (useSchema) config.responseSchema = schema;
    if (/2\.5-flash/.test(model)) config.thinkingConfig = { thinkingBudget: 0 }; // lower latency for a live conversation
    const res = await getClient().models.generateContent({ model, contents: prompt, config });
    const block = res?.promptFeedback?.blockReason;
    const text = typeof res?.text === 'string' ? res.text : '';
    if (!text.trim()) { const e = new BadAi(block ? `blocked: ${block}` : 'empty response'); if (block) e.blocked = true; throw e; }
    return text;
  } catch (e) {
    if (ctrl.signal.aborted) { const t = new Error('timeout'); t.timedOut = true; throw t; }
    throw e;
  } finally { clearTimeout(timer); }
}

const parseJson = (text) => {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(cleaned); } catch { throw new BadAi('invalid JSON'); }
};

async function callJson({ prompt, schema, validate, temperature = 0.7 }) {
  let useSchema = true, jsonRetries = 0, transientRetries = 0, discovered = false;
  for (let guard = 0; guard < 12; guard++) {
    const model = candidates()[0];
    if (!model) {
      if (!discovered) { discovered = true; const found = await discoverModel(); if (found) { workingModel = found; continue; } }
      throw toApiError({ noModel: true });
    }
    try {
      const text = await generateOnce(model, prompt, schema, jsonRetries ? Math.min(temperature, 0.3) : temperature, useSchema);
      const value = validate(parseJson(text));
      workingModel = model;
      return value;
    } catch (e) {
      if (e instanceof BadAi && !e.blocked && jsonRetries < 2) { jsonRetries++; console.warn(`[gemini] ${e.message}; retrying (${jsonRetries})`); continue; }
      if (isModelMissing(e)) { console.warn(`[gemini] model "${model}" unavailable; trying next`); dead.add(model); if (workingModel === model) workingModel = null; continue; }
      if (statusOf(e) === 400 && useSchema && /schema|responseSchema|response_schema|unsupported/i.test(msgOf(e))) { useSchema = false; continue; }
      if ((isTransient(e) || isRate(e)) && transientRetries < 2) { transientRetries++; await sleep(env.geminiRetryBaseMs * 2 ** (transientRetries - 1)); continue; }
      throw toApiError(e);
    }
  }
  throw toApiError(new BadAi('too many attempts'));
}

/* ---------- validation helpers ---------- */
const clampScore = (v, name, required = true) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) { if (required) throw new BadAi(`${name} missing`); return null; }
  return Math.max(0, Math.min(100, Math.round(n)));
};
const text = (v, max, required = false, name = 'text') => {
  const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
  if (!s && required) throw new BadAi(`${name} missing`);
  return s.slice(0, max);
};
const list = (v, maxItems, maxLen) => (Array.isArray(v) ? v.map((x) => text(x, maxLen)).filter(Boolean).slice(0, maxItems) : []);
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2);
export function similarity(a, b) {
  const A = new Set(norm(a)), B = new Set(norm(b));
  if (!A.size || !B.size) return 0;
  let i = 0; for (const w of A) if (B.has(w)) i++;
  return i / (A.size + B.size - i);
}

/* ---------- 1 + 3. questions and follow-ups ---------- */
const QUESTION_SCHEMA = S.obj({ question: S.str('The question to ask aloud'), topic: S.str('Short topic label, 1-3 words') });

export async function generateQuestion(ctx) {
  const asked = ctx.askedQuestions || [];
  const validate = (o) => {
    const q = text(o?.question, 400, true, 'question');
    if (q.length < 8) throw new BadAi('question too short');
    return { text: q, topic: text(o?.topic, 40) || undefined };
  };
  let result = await callJson({ prompt: questionPrompt({ ...ctx, askedQuestions: asked }), schema: QUESTION_SCHEMA, validate, temperature: 0.9 });
  if (asked.some((p) => similarity(p, result.text) >= 0.75)) {
    console.warn('[gemini] duplicate question; regenerating once');
    result = await callJson({ prompt: questionPrompt({ ...ctx, askedQuestions: asked, retryAvoid: true }), schema: QUESTION_SCHEMA, validate, temperature: 1 });
  }
  return result;
}
export const generateFollowUp = (ctx) => generateQuestion({ ...ctx, mode: 'followup' });

/* ---------- 2. answer analysis ---------- */
const EVAL_SCHEMA = S.obj({
  score: S.num('0-100'), relevance: S.num('0-100'), accuracy: S.num('0-100'), clarity: S.num('0-100'), completeness: S.num('0-100'), communication: S.num('0-100'),
  strengths: S.arr(S.str()), weaknesses: S.arr(S.str()), corrections: S.arr(S.str()), weakTopics: S.arr(S.str()),
  improvedAnswer: S.str(), followUpNeeded: S.bool(), nextAction: S.str('continue | follow_up | increase_difficulty | decrease_difficulty'),
});
const ACTIONS = ['continue', 'follow_up', 'increase_difficulty', 'decrease_difficulty'];

export function validateEvaluation(o) {
  if (!o || typeof o !== 'object') throw new BadAi('evaluation not an object');
  const ev = {
    score: clampScore(o.score, 'score'), relevance: clampScore(o.relevance, 'relevance'), accuracy: clampScore(o.accuracy, 'accuracy'),
    clarity: clampScore(o.clarity, 'clarity'), completeness: clampScore(o.completeness, 'completeness'), communication: clampScore(o.communication, 'communication', false),
    strengths: list(o.strengths, 5, 300), weaknesses: list(o.weaknesses, 5, 300), corrections: list(o.corrections, 5, 400), weakTopics: list(o.weakTopics, 3, 40).map((t) => t.toLowerCase()),
    improvedAnswer: text(o.improvedAnswer, 1500), followUpNeeded: o.followUpNeeded === true,
    nextAction: ACTIONS.includes(o.nextAction) ? o.nextAction : (o.followUpNeeded === true ? 'follow_up' : 'continue'),
  };
  if (ev.nextAction === 'follow_up') ev.followUpNeeded = true;
  return ev;
}
export const evaluateAnswer = (ctx) => callJson({ prompt: evaluationPrompt(ctx), schema: EVAL_SCHEMA, validate: validateEvaluation, temperature: 0.3 });

/* ---------- 4. stage evaluation (text only; the number is computed from answer scores) ---------- */
const STAGE_SCHEMA = S.obj({
  summary: S.str(), strengths: S.arr(S.str()), weaknesses: S.arr(S.str()), incorrectPoints: S.arr(S.str()), improvements: S.arr(S.str()),
  improvedAnswers: S.arr(S.obj({ question: S.str(), improvedAnswer: S.str() })), studyTopics: S.arr(S.str()),
});
export const evaluateStage = (ctx) => callJson({
  prompt: stagePrompt(ctx), schema: STAGE_SCHEMA, temperature: 0.4,
  validate: (o) => {
    const out = {
      summary: text(o?.summary, 700, true, 'summary'), strengths: list(o?.strengths, 6, 300), weaknesses: list(o?.weaknesses, 6, 300),
      incorrectPoints: list(o?.incorrectPoints, 6, 400), improvements: list(o?.improvements, 6, 400), studyTopics: list(o?.studyTopics, 8, 80),
      improvedAnswers: Array.isArray(o?.improvedAnswers) ? o.improvedAnswers.map((x) => ({ question: text(x?.question, 400), improvedAnswer: text(x?.improvedAnswer, 1200) })).filter((x) => x.question && x.improvedAnswer).slice(0, 6) : [],
    };
    return out;
  },
});

/* ---------- 5. final report text ---------- */
const REPORT_SCHEMA = S.obj({ summary: S.str(), careerReadiness: S.str(), strengths: S.arr(S.str()), keyMistakes: S.arr(S.str()) });
export const generateFinalReport = (ctx) => callJson({
  prompt: reportPrompt(ctx), schema: REPORT_SCHEMA, temperature: 0.4,
  validate: (o) => ({ summary: text(o?.summary, 900, true, 'summary'), careerReadiness: text(o?.careerReadiness, 700, true, 'careerReadiness'), strengths: list(o?.strengths, 6, 300), keyMistakes: list(o?.keyMistakes, 6, 400) }),
});

/* ---------- 6. personalised recommendations ---------- */
const RECO_SCHEMA = S.obj({ plan: S.arr(S.obj({ title: S.str(), description: S.str(), topics: S.arr(S.str()), priority: S.str('high | medium | low') })) });
export const generateRecommendations = (ctx) => callJson({
  prompt: recommendationsPrompt(ctx), schema: RECO_SCHEMA, temperature: 0.5,
  validate: (o) => {
    const plan = (Array.isArray(o?.plan) ? o.plan : []).map((p) => ({
      title: text(p?.title, 120), description: text(p?.description, 400), topics: list(p?.topics, 5, 80), priority: ['high', 'medium', 'low'].includes(p?.priority) ? p.priority : 'medium',
    })).filter((p) => p.title && p.description).slice(0, 6);
    if (!plan.length) throw new BadAi('empty plan');
    return plan;
  },
});

export const _test = { resetModelState: () => { workingModel = null; dead = new Set(); client = undefined; } };
