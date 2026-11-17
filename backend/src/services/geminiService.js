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
  if (!env.geminiKey) {
    throw new ApiError(503, 'The AI interviewer is not configured yet. Add GEMINI_API_KEY to backend/.env and restart the server.', { code: 'AI_NOT_CONFIGURED' });
  }
  client ||= new GoogleGenAI({ apiKey: env.geminiKey, ...(env.geminiBaseUrl ? { httpOptions: { baseUrl: env.geminiBaseUrl } } : {}) });
  return client;
};

// Verified active models ordered by current stability & responsiveness:
// gemini-3.5-flash-lite and gemini-3.1-flash-lite are actively healthy, respond in <1s, and handle high demand gracefully.
// Larger flash models (3.8-flash, 3.7-flash, 3.6-flash) serve as secondary options when available.
const FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
];

let workingModel = null;
const deadUntil = new Map(); // modelName -> timestamp when it can be tried again

const isDead = (model) => {
  const until = deadUntil.get(model);
  if (!until) return false;
  if (Date.now() > until) {
    deadUntil.delete(model);
    return false;
  }
  return true;
};

const markDead = (model, cooldownMs = 120000) => {
  deadUntil.set(model, Date.now() + cooldownMs);
  if (workingModel === model) workingModel = null;
};

const candidates = () =>
  [workingModel, env.geminiModel, ...FALLBACK_MODELS]
    .filter((m, i, a) => Boolean(m) && a.indexOf(m) === i && !isDead(m));

async function discoverModel() {
  try {
    const pager = await getClient().models.list();
    const names = [];
    for await (const m of pager) {
      const n = (m.name || '').replace(/^models\//, '');
      // Include all functional flash & flash-lite models that support content generation
      if (/^gemini-.*flash/.test(n) && !/(image|tts|live|audio|embedding|thinking|exp|vision)/.test(n) && (!m.supportedActions || m.supportedActions.includes('generateContent'))) {
        names.push(n);
      }
    }
    // Sort prioritizing flash-lite first during general high-demand periods
    names.sort((a, b) => {
      const score = (x) => (x.includes('flash-lite') ? 2 : 1);
      return score(b) - score(a);
    });
    return names.find((n) => !isDead(n)) || null;
  } catch (err) {
    console.warn('[gemini] model auto-discovery error:', err.message);
    return null;
  }
}

/* ---------- error classification ---------- */
const statusOf = (e) => e?.status ?? e?.code ?? e?.error?.code;
const msgOf = (e) => String(e?.message || e);
const isModelMissing = (e) =>
  statusOf(e) === 404 || (/not found|no longer available|is not supported|unsupported model/i.test(msgOf(e)) && statusOf(e) !== 429);
const isAuth = (e) => [401, 403].includes(statusOf(e)) || /api key not valid|API_KEY_INVALID|permission denied/i.test(msgOf(e));
const isRate = (e) => statusOf(e) === 429 || /RESOURCE_EXHAUSTED|quota/i.test(msgOf(e));
const isHighDemand = (e) =>
  statusOf(e) === 503 || /high demand|UNAVAILABLE|overloaded|spikes in demand/i.test(msgOf(e));
const isTimeout = (e) => Boolean(e?.timedOut) || /timeout|timed out|ETIMEDOUT|ESOCKETTIMEDOUT/i.test(msgOf(e));
const isTransient = (e) => [500, 502, 504].includes(statusOf(e)) || /fetch failed|ECONN|ETIMEDOUT|socket/i.test(msgOf(e));

class BadAi extends Error {}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toApiError(e) {
  if (e instanceof ApiError) return e;
  if (e?.timedOut || isTimeout(e)) {
    return new ApiError(504, 'AI javob berish vaqti tugadi (AI_TIMEOUT). Iltimos, qayta urinib ko‘ring yoki javobingizni matn ko‘rinishida kiriting.', { code: 'AI_TIMEOUT' });
  }
  if (isRate(e)) {
    return new ApiError(429, 'AI xizmati hozirda juda band. Iltimos, bir necha soniya kutib qayta urinib ko‘ring.', { code: 'AI_RATE_LIMITED', retryAfter: 8 });
  }
  if (isAuth(e)) {
    console.error('[gemini] auth error:', msgOf(e));
    return new ApiError(503, 'AI autentifikatsiyasida xatolik. GEMINI_API_KEY sozlamasini tekshiring.', { code: 'AI_AUTH' });
  }
  if (e?.blocked) {
    return new ApiError(422, 'AI bu kiritilgan matnni qabul qilmadi. Iltimos, javobingizni boshqacharoq ifodalab ko‘ring.', { code: 'AI_BLOCKED' });
  }
  if (e instanceof BadAi) {
    return new ApiError(502, 'AI xizmati vaqtincha yuqori yuklama ostida. Iltimos, qayta urinib ko‘ring.', { code: 'AI_BAD_RESPONSE' });
  }
  if (e?.noModel) {
    return new ApiError(503, 'Mavjud Gemini modeli topilmadi yoki barcha modellar band. Iltimos, bir ozdan so‘ng qayta urinib ko‘ring.', { code: 'AI_NO_MODEL' });
  }
  console.error('[gemini] unexpected error:', msgOf(e));
  return new ApiError(503, 'AI xizmati vaqtincha band yoki yuqori talab tufayli mavjud emas. Iltimos, bir ozdan so‘ng qayta urinib ko‘ring.', { code: 'AI_UNAVAILABLE' });
}

/* ---------- in-flight request deduplication ---------- */
const inFlightRequests = new Map();

/* ---------- core call: JSON out, validated, with retries & model progression ---------- */
async function generateOnce(model, prompt, schema, temperature, useSchema) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), env.geminiTimeoutMs || 30000);
  try {
    const config = { systemInstruction: SYSTEM, temperature, responseMimeType: 'application/json', abortSignal: ctrl.signal };
    if (useSchema) config.responseSchema = schema;
    if (/2\.5-flash/.test(model)) config.thinkingConfig = { thinkingBudget: 0 };
    const res = await getClient().models.generateContent({ model, contents: prompt, config });
    const block = res?.promptFeedback?.blockReason;
    const text = typeof res?.text === 'string' ? res.text : '';
    if (!text.trim()) {
      const e = new BadAi(block ? `blocked: ${block}` : 'empty response');
      if (block) e.blocked = true;
      throw e;
    }
    return text;
  } catch (e) {
    if (ctrl.signal.aborted) {
      const t = new Error('timeout');
      t.timedOut = true;
      throw t;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

const parseJson = (text) => {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new BadAi('invalid JSON');
  }
};

async function executeCallJson({ prompt, schema, validate, temperature = 0.7 }) {
  let useSchema = true;
  let jsonRetries = 0;
  let modelAttempts = 0;
  let discovered = false;

  for (let guard = 0; guard < 14; guard++) {
    let model = candidates()[0];
    if (!model) {
      if (!discovered) {
        discovered = true;
        const found = await discoverModel();
        if (found) {
          workingModel = found;
          model = found;
        }
      }
      if (!model) {
        throw toApiError({ noModel: true });
      }
    }

    try {
      const text = await generateOnce(model, prompt, schema, jsonRetries ? Math.min(temperature, 0.3) : temperature, useSchema);
      const value = validate(parseJson(text));
      workingModel = model;
      return value;
    } catch (e) {
      modelAttempts++;

      // 1. JSON parsing failure: retry once with lower temperature on same model
      if (e instanceof BadAi && !e.blocked && jsonRetries < 2) {
        jsonRetries++;
        console.warn(`[gemini] model ${model} returned unparseable JSON; retrying (${jsonRetries})`);
        continue;
      }

      // 2. Schema rejected by model: retry without schema
      if (statusOf(e) === 400 && useSchema && /schema|responseSchema|response_schema|unsupported/i.test(msgOf(e))) {
        useSchema = false;
        console.warn(`[gemini] model ${model} schema unsupported; retrying without schema`);
        continue;
      }

      // 3. Model is missing / deprecated (404)
      if (isModelMissing(e)) {
        console.warn(`[gemini] model "${model}" is unavailable (404); advancing to fallback model`);
        markDead(model, 3600000); // 1 hour cooldown
        continue;
      }

      // 4. Model is experiencing high demand / 503 UNAVAILABLE
      if (isHighDemand(e)) {
        console.warn(`[gemini] model "${model}" is experiencing high demand (503); applying backoff and trying fallback model`);
        markDead(model, 90000); // 90 second cooldown
        const backoffMs = Math.min(1800, (env.geminiRetryBaseMs || 700) * 2 ** Math.min(modelAttempts, 3)) + Math.floor(Math.random() * 200);
        await sleep(backoffMs);
        continue;
      }

      // 5. Timeout
      if (isTimeout(e)) {
        console.warn(`[gemini] model "${model}" timed out; advancing to fallback model`);
        markDead(model, 60000);
        continue;
      }

      // 6. Rate limits (429) or transient network errors (500, 502, 504)
      if (isRate(e) || isTransient(e)) {
        if (modelAttempts < 3) {
          const backoffMs = Math.min(2500, (env.geminiRetryBaseMs || 700) * 2 ** (modelAttempts - 1)) + Math.floor(Math.random() * 250);
          console.warn(`[gemini] transient error (${statusOf(e)}) on model "${model}"; retrying in ${backoffMs}ms`);
          await sleep(backoffMs);
          markDead(model, 60000);
          continue;
        }
      }

      // If credentials failed or content was blocked, abort immediately
      if (isAuth(e) || e?.blocked) {
        throw toApiError(e);
      }

      // Mark model and try next candidate
      markDead(model, 60000);
    }
  }

  throw toApiError(new BadAi('All fallback models exhausted'));
}

async function callJson(args) {
  // Deduplicate identical in-flight requests to prevent double-execution
  const promptKey = `${args.prompt.slice(0, 200)}:${args.prompt.length}:${args.prompt.slice(-80)}`;
  if (inFlightRequests.has(promptKey)) {
    return inFlightRequests.get(promptKey);
  }

  const promise = executeCallJson(args).finally(() => {
    inFlightRequests.delete(promptKey);
  });

  inFlightRequests.set(promptKey, promise);
  return promise;
}

/* ---------- validation helpers ---------- */
const clampScore = (v, name, required = true) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    if (required) throw new BadAi(`${name} missing`);
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(n)));
};

const text = (v, max, required = false, name = 'text') => {
  const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
  if (!s && required) throw new BadAi(`${name} missing`);
  return s.slice(0, max);
};

const list = (v, maxItems, maxLen) =>
  Array.isArray(v) ? v.map((x) => text(x, maxLen)).filter(Boolean).slice(0, maxItems) : [];

const norm = (s) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2);

export function similarity(a, b) {
  const A = new Set(norm(a)), B = new Set(norm(b));
  if (!A.size || !B.size) return 0;
  let i = 0;
  for (const w of A) if (B.has(w)) i++;
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
  score: S.num('0-100'),
  relevance: S.num('0-100'),
  accuracy: S.num('0-100'),
  clarity: S.num('0-100'),
  completeness: S.num('0-100'),
  communication: S.num('0-100'),
  strengths: S.arr(S.str()),
  weaknesses: S.arr(S.str()),
  corrections: S.arr(S.str()),
  weakTopics: S.arr(S.str()),
  improvedAnswer: S.str(),
  followUpNeeded: S.bool(),
  nextAction: S.str('continue | follow_up | increase_difficulty | decrease_difficulty'),
});

const ACTIONS = ['continue', 'follow_up', 'increase_difficulty', 'decrease_difficulty'];

export function validateEvaluation(o) {
  if (!o || typeof o !== 'object') throw new BadAi('evaluation not an object');
  const ev = {
    score: clampScore(o.score, 'score'),
    relevance: clampScore(o.relevance, 'relevance'),
    accuracy: clampScore(o.accuracy, 'accuracy'),
    clarity: clampScore(o.clarity, 'clarity'),
    completeness: clampScore(o.completeness, 'completeness'),
    communication: clampScore(o.communication, 'communication', false),
    strengths: list(o.strengths, 5, 300),
    weaknesses: list(o.weaknesses, 5, 300),
    corrections: list(o.corrections, 5, 400),
    weakTopics: list(o.weakTopics, 3, 40).map((t) => t.toLowerCase()),
    improvedAnswer: text(o.improvedAnswer, 1500),
    followUpNeeded: o.followUpNeeded === true,
    nextAction: ACTIONS.includes(o.nextAction) ? o.nextAction : (o.followUpNeeded === true ? 'follow_up' : 'continue'),
  };
  if (ev.nextAction === 'follow_up') ev.followUpNeeded = true;
  return ev;
}

export const evaluateAnswer = (ctx) => callJson({ prompt: evaluationPrompt(ctx), schema: EVAL_SCHEMA, validate: validateEvaluation, temperature: 0.3 });

/* ---------- 4. stage evaluation ---------- */
const STAGE_SCHEMA = S.obj({
  summary: S.str(),
  strengths: S.arr(S.str()),
  weaknesses: S.arr(S.str()),
  incorrectPoints: S.arr(S.str()),
  improvements: S.arr(S.str()),
  improvedAnswers: S.arr(S.obj({ question: S.str(), improvedAnswer: S.str() })),
  studyTopics: S.arr(S.str()),
});

export const evaluateStage = (ctx) =>
  callJson({
    prompt: stagePrompt(ctx),
    schema: STAGE_SCHEMA,
    temperature: 0.4,
    validate: (o) => ({
      summary: text(o?.summary, 700, true, 'summary'),
      strengths: list(o?.strengths, 6, 300),
      weaknesses: list(o?.weaknesses, 6, 300),
      incorrectPoints: list(o?.incorrectPoints, 6, 400),
      improvements: list(o?.improvements, 6, 400),
      studyTopics: list(o?.studyTopics, 8, 80),
      improvedAnswers: Array.isArray(o?.improvedAnswers)
        ? o.improvedAnswers
            .map((x) => ({ question: text(x?.question, 400), improvedAnswer: text(x?.improvedAnswer, 1200) }))
            .filter((x) => x.question && x.improvedAnswer)
            .slice(0, 6)
        : [],
    }),
  });

/* ---------- 5. final report text ---------- */
const REPORT_SCHEMA = S.obj({ summary: S.str(), careerReadiness: S.str(), strengths: S.arr(S.str()), keyMistakes: S.arr(S.str()) });

export const generateFinalReport = (ctx) =>
  callJson({
    prompt: reportPrompt(ctx),
    schema: REPORT_SCHEMA,
    temperature: 0.4,
    validate: (o) => ({
      summary: text(o?.summary, 900, true, 'summary'),
      careerReadiness: text(o?.careerReadiness, 700, true, 'careerReadiness'),
      strengths: list(o?.strengths, 6, 300),
      keyMistakes: list(o?.keyMistakes, 6, 400),
    }),
  });

/* ---------- 6. personalised recommendations ---------- */
const RECO_SCHEMA = S.obj({ plan: S.arr(S.obj({ title: S.str(), description: S.str(), topics: S.arr(S.str()), priority: S.str('high | medium | low') })) });

export const generateRecommendations = (ctx) =>
  callJson({
    prompt: recommendationsPrompt(ctx),
    schema: RECO_SCHEMA,
    temperature: 0.5,
    validate: (o) => {
      const plan = (Array.isArray(o?.plan) ? o.plan : [])
        .map((p) => ({
          title: text(p?.title, 120),
          description: text(p?.description, 400),
          topics: list(p?.topics, 5, 80),
          priority: ['high', 'medium', 'low'].includes(p?.priority) ? p.priority : 'medium',
        }))
        .filter((p) => p.title && p.description)
        .slice(0, 6);
      if (!plan.length) throw new BadAi('empty plan');
      return plan;
    },
  });

export const _test = {
  resetModelState: () => {
    workingModel = null;
    deadUntil.clear();
    client = undefined;
    inFlightRequests.clear();
  },
};
