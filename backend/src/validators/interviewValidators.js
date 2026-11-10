import mongoose from 'mongoose';
import { collect, str } from './common.js';
import { CAREERS, DIFFICULTIES, DURATIONS, LANGUAGES, LEVELS, TYPES } from '../models/Interview.js';

const oneOf = (v, list, label) => (list.includes(v) ? null : `Invalid ${label}.`);
const optNum = (v, max, label) => (v === undefined || v === null || (typeof v === 'number' && v >= 0 && v <= max) ? null : `Invalid ${label}.`);

export const startRules = (b) =>
  collect({
    career: oneOf(b.career, CAREERS, 'career'), experienceLevel: oneOf(b.experienceLevel, LEVELS, 'experience level'),
    difficulty: oneOf(b.difficulty, DIFFICULTIES, 'difficulty'), durationMinutes: oneOf(Number(b.durationMinutes), DURATIONS, 'duration'),
    language: oneOf(b.language, LANGUAGES, 'language'), interviewType: oneOf(b.interviewType, TYPES, 'interview type'),
  });

export const answerRules = (b) =>
  collect({
    questionId: mongoose.isValidObjectId(b.questionId) ? null : 'Invalid question.',
    transcript: str(b.transcript).length < 2 ? 'Please provide an answer.' : str(b.transcript).length > 4000 ? 'Answer is too long (max 4000 characters).' : null,
    inputMode: ['voice', 'text'].includes(b.inputMode) ? null : 'Invalid input mode.',
    durationSeconds: optNum(b.durationSeconds, 3600, 'duration'), elapsedSeconds: optNum(b.elapsedSeconds, 86400, 'elapsed time'),
  });

export const progressRules = (b) => collect({ elapsedSeconds: optNum(b.elapsedSeconds, 86400, 'elapsed time') });
export const completeRules = (b) => collect({ elapsedSeconds: optNum(b.elapsedSeconds, 86400, 'elapsed time'), early: b.early === undefined || typeof b.early === 'boolean' ? null : 'Invalid value.' });
