import { Interview } from '../models/Interview.js';
import { asyncHandler } from '../utils/ApiError.js';

const r1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

export const overview = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const [totals] = await Interview.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        avg: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, '$overallScore', null] } },
        best: { $max: { $cond: [{ $eq: ['$status', 'completed'] }, '$overallScore', null] } },
        seconds: { $sum: '$timeSpentSeconds' },
      },
    },
  ]);
  const careerBreakdown = await Interview.aggregate([
    { $match: { userId } },
    { $group: { _id: '$career', count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, avgScore: { $avg: { $cond: [{ $eq: ['$status', 'completed'] }, '$overallScore', null] } } } },
    { $sort: { count: -1 } },
  ]);
  const recent = await Interview.find({ userId }).select('career interviewType difficulty status overallScore durationMinutes createdAt completedAt').sort({ createdAt: -1 }).limit(5).lean();
  const inProgress = await Interview.findOne({ userId, status: 'in_progress' }).select('_id career').sort({ updatedAt: -1 }).lean();

  res.json({
    success: true,
    totalInterviews: totals?.total || 0,
    completedInterviews: totals?.completed || 0,
    inProgressInterviews: totals?.inProgress || 0,
    averageScore: r1(totals?.avg),
    bestScore: totals?.best ?? null,
    totalPracticeMinutes: Math.round((totals?.seconds || 0) / 60),
    careerBreakdown: careerBreakdown.map((c) => ({ career: c._id, count: c.count, completed: c.completed, averageScore: r1(c.avgScore) })),
    recentInterviews: recent,
    activeInterview: inProgress,
  });
});

export const analytics = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const completed = { userId, status: 'completed', overallScore: { $ne: null } };
  const answers = [{ $match: completed }, { $unwind: '$answers' }, { $match: { 'answers.evaluationStatus': 'done' } }];

  const [timeline, perMonth, careerPerformance, skills, weaknesses] = await Promise.all([
    Interview.find(completed).select('career overallScore completedAt').sort({ completedAt: 1 }).limit(60).lean(),
    Interview.aggregate([
      { $match: { userId } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 }, avgScore: { $avg: '$overallScore' } } },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),
    Interview.aggregate([{ $match: completed }, { $group: { _id: '$career', averageScore: { $avg: '$overallScore' }, count: { $sum: 1 } } }]),
    Interview.aggregate([...answers, { $group: { _id: null, accuracy: { $avg: '$answers.accuracy' }, relevance: { $avg: '$answers.relevance' }, clarity: { $avg: '$answers.clarity' }, completeness: { $avg: '$answers.completeness' }, communication: { $avg: '$answers.communication' }, n: { $sum: 1 } } }]),
    Interview.aggregate([...answers, { $unwind: '$answers.weakTopics' }, { $group: { _id: { $toLower: '$answers.weakTopics' }, count: { $sum: 1 }, avgScore: { $avg: '$answers.score' } } }, { $sort: { count: -1, avgScore: 1 } }, { $limit: 8 }]),
  ]);

  const k = skills[0];
  const skillPerformance = k ? [['Technical accuracy', k.accuracy], ['Relevance', k.relevance], ['Clarity', k.clarity], ['Completeness', k.completeness], ['Communication', k.communication]].filter(([, v]) => v != null).map(([skill, v]) => ({ skill, averageScore: r1(v) })) : [];

  // Improvement: first completed interview vs latest, and the recent 3 vs the 3 before them.
  const scores = timeline.map((t) => t.overallScore);
  const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const improvement = scores.length >= 2 ? {
    firstScore: scores[0], latestScore: scores[scores.length - 1], change: scores[scores.length - 1] - scores[0],
    recentAverage: r1(avg(scores.slice(-3))), previousAverage: scores.length > 3 ? r1(avg(scores.slice(-6, -3))) : null,
  } : null;

  res.json({
    success: true,
    performanceOverTime: timeline.map((t) => ({ date: t.completedAt, score: t.overallScore, career: t.career })),
    interviewsPerMonth: perMonth.map((m) => ({ month: m._id, count: m.count, averageScore: r1(m.avgScore) })),
    careerPerformance: careerPerformance.map((c) => ({ career: c._id, averageScore: r1(c.averageScore), count: c.count })),
    skillPerformance, commonWeaknesses: weaknesses.map((w) => ({ topic: w._id, count: w.count, averageScore: r1(w.avgScore) })), improvement,
  });
});
