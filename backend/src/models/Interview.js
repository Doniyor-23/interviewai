import mongoose from 'mongoose';

export const CAREERS = ['frontend', 'backend', 'uiux', 'marketing'];
export const LEVELS = ['beginner', 'junior', 'middle', 'senior'];
export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const TYPES = ['technical', 'hr', 'behavioral', 'mixed'];
export const LANGUAGES = ['uz', 'en', 'ru'];
export const DURATIONS = [10, 20, 30];
export const STATUSES = ['draft', 'in_progress', 'completed', 'abandoned'];

// Sub-documents carry a loose `meta` field so Part 2 can add AI data without a migration.
const questionSchema = new mongoose.Schema({
  order: { type: Number, required: true },
  stage: { type: String, trim: true },
  text: { type: String, required: true },
  category: { type: String, trim: true },
  askedAt: { type: Date, default: Date.now },
  isFollowUp: { type: Boolean, default: false },
  followUpOf: { type: mongoose.Schema.Types.ObjectId },
  meta: { type: mongoose.Schema.Types.Mixed },
});

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  stage: { type: String },
  transcript: { type: String, default: '' }, // user-approved text only; raw audio is never stored
  evaluationStatus: { type: String, enum: ['pending', 'done'], default: 'pending' },
  inputMode: { type: String, enum: ['voice', 'text'], default: 'text' },
  durationSeconds: { type: Number, min: 0 },
  score: { type: Number, min: 0, max: 100 },
  relevance: { type: Number, min: 0, max: 100 },
  accuracy: { type: Number, min: 0, max: 100 },
  clarity: { type: Number, min: 0, max: 100 },
  completeness: { type: Number, min: 0, max: 100 },
  communication: { type: Number, min: 0, max: 100 },
  strengths: [String],
  weaknesses: [String],
  corrections: [String],
  weakTopics: [String],
  improvedAnswer: String,
  followUpNeeded: { type: Boolean, default: false },
  nextAction: { type: String },
  feedback: { type: String },
  evaluatedAt: Date,
  submittedAt: { type: Date, default: Date.now },
  meta: { type: mongoose.Schema.Types.Mixed },
});

const stageResultSchema = new mongoose.Schema(
  {
    stage: { type: String, required: true },
    score: { type: Number, min: 0, max: 100 },
    stageName: String,
    questionCount: Number,
    summary: String,
    strengths: [String],
    weaknesses: [String],
    incorrectPoints: [String],
    improvements: [String],
    improvedAnswers: [{ _id: false, question: String, improvedAnswer: String }],
    studyTopics: [String],
    createdAt: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    career: { type: String, enum: CAREERS, required: true },
    experienceLevel: { type: String, enum: LEVELS, required: true },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    durationMinutes: { type: Number, enum: DURATIONS, default: 20 },
    language: { type: String, enum: LANGUAGES, default: 'uz' },
    cameraEnabled: { type: Boolean, default: false },
    interviewType: { type: String, enum: TYPES, required: true },
    status: { type: String, enum: STATUSES, default: 'draft' },
    stagePlan: [{ _id: false, key: String, name: String, targetQuestions: Number, maxQuestions: Number }],
    currentStageIndex: { type: Number, default: 0 },
    currentQuestionId: { type: mongoose.Schema.Types.ObjectId },
    questions: { type: [questionSchema], default: [] },
    answers: { type: [answerSchema], default: [] },
    stageResults: { type: [stageResultSchema], default: [] },
    overallScore: { type: Number, min: 0, max: 100, default: null },
    finalFeedback: {
      summary: String,
      strengths: [String],
      improvements: [String],
      recommendations: [String],
      meta: { type: mongoose.Schema.Types.Mixed },
    },
    report: { type: mongoose.Schema.Types.Mixed }, // final report, built from saved evaluations
    timeSpentSeconds: { type: Number, default: 0 },
    startedAt: Date,
    completedAt: Date,
    meta: { type: mongoose.Schema.Types.Mixed }, // reserved for Part 2 session state
  },
  { timestamps: true }
);

interviewSchema.index({ userId: 1, createdAt: -1 });
interviewSchema.index({ userId: 1, status: 1 });
interviewSchema.index({ userId: 1, career: 1, completedAt: -1 });

export const Interview = mongoose.model('Interview', interviewSchema);
