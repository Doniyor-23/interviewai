import mongoose from 'mongoose';
import { Interview } from '../models/Interview.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

export const CAREER_LABELS = { frontend: 'Frontend Developer', backend: 'Backend Developer', uiux: 'UI/UX Designer', marketing: 'Marketing Specialist' };
const SORTS = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, score_desc: { overallScore: -1, createdAt: -1 }, score_asc: { overallScore: 1, createdAt: -1 } };
const LIST_FIELDS = 'career experienceLevel difficulty durationMinutes language interviewType status overallScore timeSpentSeconds startedAt completedAt createdAt';

const ownedId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(404, 'Interview not found.');
  return id;
};

export const listInterviews = asyncHandler(async (req, res) => {
  const { q = '', status = '', career = '', sort = 'newest' } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));

  const filter = { userId: req.user._id }; // ownership is always part of the query
  if (['draft', 'in_progress', 'completed', 'abandoned'].includes(status)) filter.status = status;
  if (CAREER_LABELS[career]) filter.career = career;
  const term = String(q).trim().toLowerCase().slice(0, 60);
  if (term) {
    const keys = Object.entries(CAREER_LABELS).filter(([, l]) => l.toLowerCase().includes(term)).map(([k]) => k);
    filter.$or = [{ career: { $in: keys } }, { interviewType: term }, { difficulty: term }, { experienceLevel: term }];
  }

  const [items, total] = await Promise.all([
    Interview.find(filter).select(LIST_FIELDS).sort(SORTS[sort] || SORTS.newest).skip((page - 1) * limit).limit(limit).lean(),
    Interview.countDocuments(filter),
  ]);
  res.json({ success: true, items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});

export const getInterview = asyncHandler(async (req, res) => {
  const interview = await Interview.findOne({ _id: ownedId(req.params.id), userId: req.user._id }).lean();
  if (!interview) throw new ApiError(404, 'Interview not found.');
  res.json({ success: true, interview });
});

export const deleteInterview = asyncHandler(async (req, res) => {
  const result = await Interview.deleteOne({ _id: ownedId(req.params.id), userId: req.user._id });
  if (!result.deletedCount) throw new ApiError(404, 'Interview not found.');
  res.json({ success: true, message: 'Interview deleted.' });
});
