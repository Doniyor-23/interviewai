import dotenv from 'dotenv';
dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  geminiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || '', // optional override; otherwise a fallback chain is used
  geminiBaseUrl: process.env.GEMINI_BASE_URL || '', // optional (tests / proxies)
  geminiTimeoutMs: Number(process.env.GEMINI_TIMEOUT_MS) || 30000,
  geminiRetryBaseMs: Number(process.env.GEMINI_RETRY_BASE_MS) || 700,
  resendKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || 'InterviewAI <onboarding@resend.dev>',
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
};

export function assertEnv() {
  const missing = ['MONGODB_URI', 'JWT_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`);
  }
  if (env.jwtSecret.length < 16) throw new Error('JWT_SECRET must be at least 16 characters.');
  if (env.isProd && !env.resendKey) throw new Error('RESEND_API_KEY is required in production.');
}
