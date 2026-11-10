import mongoose from 'mongoose';
import { Interview } from '../models/Interview.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { withLock } from '../utils/locks.js';
import { str } from '../validators/common.js';
import * as ai from '../services/geminiService.js';
import * as engine from '../services/interviewEngine.js';

const MAX_HISTORY = 8;

const ownedId = (id) => { if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'Interview not found.'); return id; };
async function load(req, { active = true } = {}) {
  const iv = await Interview.findOne({ _id: ownedId(req.params.id), userId: req.user._id }); // ownership always in the query
  if (!iv) throw new ApiError(404, 'Interview not found.');
  if (active && iv.status !== 'in_progress') throw new ApiError(409, 'This interview is not in progress.', { code: 'NOT_IN_PROGRESS', status: iv.status });
  return iv;
}
const config = (iv) => ({ career: iv.career, experienceLevel: iv.experienceLevel, difficulty: iv.difficulty, language: iv.language, interviewType: iv.interviewType });
const history = (iv) => engine.qaFor(iv).slice(-MAX_HISTORY).map(({ question, answer, score }) => ({ question, answer, score }));
const clampElapsed = (iv, v) => {
  if (typeof v !== 'number') return iv.timeSpentSeconds || 0;
  const wall = Math.floor((Date.now() - new Date(iv.startedAt || iv.createdAt).getTime()) / 1000) + 5; // cannot exceed wall-clock time
  return Math.max(iv.timeSpentSeconds || 0, Math.min(Math.floor(v), wall));
};
const fresh = async (iv) => engine.deriveState(await Interview.findById(iv._id));

/* ---------- POST /start ---------- */
export const start = asyncHandler(async (req, res) => {
  const b = req.body;
  const active = await Interview.findOne({ userId: req.user._id, status: 'in_progress' }).select('_id career createdAt');
  if (active && !b.abandonActive) throw new ApiError(409, 'You already have an interview in progress.', { code: 'ACTIVE_INTERVIEW', activeId: String(active._id) });
  const cfg = { career: b.career, experienceLevel: b.experienceLevel, difficulty: b.difficulty, language: b.language, interviewType: b.interviewType };
  const durationMinutes = Number(b.durationMinutes);
  const stagePlan = engine.planStages({ interviewType: cfg.interviewType, durationMinutes });

  // Generate the first question BEFORE creating anything, so an AI failure leaves no half-created interview.
  const q = await ai.generateQuestion({ config: cfg, stage: stagePlan[0], history: [], askedQuestions: [], mode: 'main' });
  if (active) await Interview.updateOne({ _id: active._id, userId: req.user._id }, { status: 'abandoned', completedAt: new Date() });
  const iv = await Interview.create({
    ...cfg, userId: req.user._id, durationMinutes, status: 'in_progress', startedAt: new Date(), stagePlan, currentStageIndex: 0,
    questions: [{ order: 1, stage: stagePlan[0].key, text: q.text, category: q.topic }],
  });
  iv.currentQuestionId = iv.questions[0]._id;
  await iv.save();
  res.status(201).json({ success: true, state: engine.deriveState(iv) });
});

/* ---------- POST /:id/answer ---------- */
export const answer = asyncHandler(async (req, res) => {
  const iv0 = await load(req);
  await withLock(String(iv0._id), async () => {
    const iv = await load(req);
    const { questionId } = req.body;
    const q = iv.questions.id(questionId);
    if (!q) throw new ApiError(404, 'Question not found.');
    if (String(iv.questions[iv.questions.length - 1]._id) !== String(q._id)) throw new ApiError(409, 'That question is no longer current.', { code: 'STALE_QUESTION', state: engine.deriveState(iv) });

    let existing = iv.answers.find((a) => String(a.questionId) === String(q._id));
    if (existing && engine.isDone(existing)) return res.json({ success: true, duplicate: true, state: engine.deriveState(iv) }); // idempotent

    const transcript = str(req.body.transcript);
    if (!existing) {
      // Saved BEFORE the AI call: if evaluation fails, the answer is not lost and can be retried.
      const pushed = await Interview.findOneAndUpdate(
        { _id: iv._id, userId: req.user._id, 'answers.questionId': { $ne: q._id } },
        { $push: { answers: { questionId: q._id, stage: q.stage, transcript, inputMode: req.body.inputMode, durationSeconds: req.body.durationSeconds, evaluationStatus: 'pending', submittedAt: new Date() } } },
        { returnDocument: 'after' }
      );
      if (!pushed) return res.json({ success: true, duplicate: true, state: await fresh(iv) });
    } else {
      await Interview.updateOne({ _id: iv._id, userId: req.user._id }, { $set: { 'answers.$[a].transcript': transcript, 'answers.$[a].inputMode': req.body.inputMode } }, { arrayFilters: [{ 'a.questionId': q._id }] });
    }

    const stage = iv.stagePlan.find((s) => s.key === q.stage) || iv.stagePlan[iv.currentStageIndex];
    let ev;
    try {
      ev = await ai.evaluateAnswer({ config: config(iv), stage, question: q.text, answer: transcript, history: history(iv) });
    } catch (e) { e.extra = { ...e.extra, answerSaved: true }; throw e; }

    await Interview.updateOne(
      { _id: iv._id, userId: req.user._id },
      { $set: { 'answers.$[a].evaluationStatus': 'done', 'answers.$[a].evaluatedAt': new Date(), ...Object.fromEntries(Object.entries(ev).map(([k, v]) => [`answers.$[a].${k}`, v])), timeSpentSeconds: clampElapsed(iv, req.body.elapsedSeconds) } },
      { arrayFilters: [{ 'a.questionId': q._id }] }
    );
    res.json({ success: true, state: await fresh(iv) });
  });
});

/* ---------- POST /:id/next-question ---------- */
export const nextQuestion = asyncHandler(async (req, res) => {
  const iv0 = await load(req);
  await withLock(String(iv0._id), async () => {
    const iv = await load(req);
    const step = engine.planNext(iv);
    if (step.type === 'current') return res.json({ success: true, type: 'question', state: engine.deriveState(iv) }); // idempotent
    if (step.type === 'stage_complete') return res.json({ success: true, type: 'stage_complete', state: engine.deriveState(iv) });
    if (step.type === 'all_done') return res.json({ success: true, type: 'all_done', state: engine.deriveState(iv) });

    const lastAns = step.lastAnswer;
    const qa = engine.qaFor(iv);
    const q = await ai.generateQuestion({
      config: config(iv), stage: step.stage, history: qa.slice(-MAX_HISTORY).map(({ question, answer, score }) => ({ question, answer, score })),
      askedQuestions: iv.questions.map((x) => x.text), mode: step.mode || 'main',
      followUpOf: step.followUpOf && { question: step.followUpOf.text, answer: lastAns?.transcript || '' },
      avgScore: engine.averageScore(iv), nextAction: lastAns?.nextAction,
    });
    const n = iv.questions.length;
    const sub = { order: n + 1, stage: step.stage.key, text: q.text, category: q.topic, isFollowUp: step.mode === 'followup', followUpOf: step.followUpOf?._id };
    const updated = await Interview.findOneAndUpdate(
      { _id: iv._id, userId: req.user._id, [`questions.${n}`]: { $exists: false } }, // someone else added a question meanwhile? then skip
      { $push: { questions: sub }, $set: { currentStageIndex: step.stageIndex } }, { returnDocument: 'after' }
    );
    if (!updated) return res.json({ success: true, type: 'question', state: await fresh(iv) });
    updated.currentQuestionId = updated.questions[updated.questions.length - 1]._id;
    await updated.save();
    res.json({ success: true, type: 'question', state: engine.deriveState(updated) });
  });
});

/* ---------- POST /:id/stage-feedback ---------- */
export const stageFeedback = asyncHandler(async (req, res) => {
  const iv0 = await load(req);
  await withLock(String(iv0._id), async () => {
    const iv = await load(req);
    const step = engine.planNext(iv);
    if (step.type === 'advance' || step.type === 'all_done') return res.json({ success: true, state: engine.deriveState(iv) }); // already generated
    if (step.type !== 'stage_complete') throw new ApiError(409, 'This stage is not finished yet.', { code: 'STAGE_NOT_COMPLETE' });

    const qa = engine.qaFor(iv, (q) => q.stage === step.stage.key);
    const score = engine.stageScore(iv, step.stage.key);
    const fb = await ai.evaluateStage({ config: config(iv), stage: step.stage, qa, score });
    await Interview.updateOne({ _id: iv._id, userId: req.user._id, 'stageResults.stage': { $ne: step.stage.key } }, {
      $push: { stageResults: { stage: step.stage.key, stageName: step.stage.name, score, questionCount: qa.length, ...fb } },
      $set: { timeSpentSeconds: clampElapsed(iv, req.body.elapsedSeconds) },
    });
    res.json({ success: true, state: await fresh(iv) });
  });
});

/* ---------- POST /:id/complete ---------- */
export const complete = asyncHandler(async (req, res) => {
  const iv0 = await load(req, { active: false });
  if (iv0.status === 'completed') return res.json({ success: true, report: iv0.report, state: engine.deriveState(iv0) }); // idempotent
  await withLock(String(iv0._id), async () => {
    const iv = await load(req);
    const early = req.body.early === true;
    if (!early && engine.planNext(iv).type !== 'all_done') throw new ApiError(409, 'The interview is not finished yet.', { code: 'NOT_FINISHED' });
    const ev = engine.evaluated(iv);
    const elapsed = clampElapsed(iv, req.body.elapsedSeconds);
    if (!ev.length) {
      await Interview.updateOne({ _id: iv._id, userId: req.user._id }, { status: 'abandoned', completedAt: new Date(), timeSpentSeconds: elapsed });
      return res.json({ success: true, abandoned: true, message: 'No answers were submitted, so this interview was discarded from your results.' });
    }

    const overall = engine.overallScore(iv);
    const level = engine.levelFor(overall);
    const metrics = engine.computeMetrics(iv);
    const stageScores = iv.stagePlan.map((s) => ({ key: s.key, name: s.name, score: engine.stageScore(iv, s.key), questionCount: iv.answers.filter((a) => a.stage === s.key && engine.isDone(a)).length })).filter((s) => s.score != null);
    const qa = engine.qaFor(iv);
    const weakTopics = [...new Set(qa.flatMap((x) => x.weakTopics))].slice(0, 10);
    const cfg = config(iv);

    const [text, plan] = await Promise.all([
      ai.generateFinalReport({ config: cfg, metrics, stageScores, overallScore: overall, level, qa }),
      ai.generateRecommendations({ config: cfg, metrics, weakTopics, level }),
    ]);

    const ranked = Object.entries(metrics).filter(([, v]) => v != null).map(([k, v]) => ({ key: k, name: engine.METRIC_LABELS[k], score: v })).sort((a, b) => b.score - a.score);
    const improvedAnswers = [...qa].sort((a, b) => a.score - b.score).filter((x) => x.improvedAnswer).slice(0, 4).map((x) => ({ question: x.question, yourAnswer: x.answer, score: x.score, improvedAnswer: x.improvedAnswer }));
    const report = {
      generatedAt: new Date(), early, overallScore: overall, performanceLevel: level, summary: text.summary,
      careerReadiness: { level, assessment: text.careerReadiness }, metrics, stageScores,
      strongestSkills: ranked.slice(0, 3), weakestSkills: ranked.length > 1 ? ranked.slice(-3).reverse() : [],
      strengths: text.strengths, keyMistakes: text.keyMistakes, improvedAnswers, learningPlan: plan, weakTopics,
      questionCount: iv.questions.length, answeredCount: ev.length,
    };
    const done = await Interview.findOneAndUpdate({ _id: iv._id, userId: req.user._id, status: 'in_progress' }, {
      status: 'completed', completedAt: new Date(), overallScore: overall, report, timeSpentSeconds: elapsed,
      finalFeedback: { summary: text.summary, strengths: text.strengths, improvements: text.keyMistakes, recommendations: plan.map((p) => p.title) },
    }, { returnDocument: 'after' });
    res.json({ success: true, report: done.report, state: engine.deriveState(done) });
  });
});

/* ---------- GET /:id (with derived state) and GET /:id/report ---------- */
export const getWithState = asyncHandler(async (req, res) => {
  const iv = await load(req, { active: false });
  res.json({ success: true, interview: iv.toObject(), state: engine.deriveState(iv) });
});

export const getReport = asyncHandler(async (req, res) => {
  const iv = await load(req, { active: false });
  if (iv.status !== 'completed' || !iv.report) throw new ApiError(409, 'The report is not available until the interview is completed.', { code: 'NOT_COMPLETED', status: iv.status });
  res.json({ success: true, report: iv.report, interview: iv.toObject() });
});
