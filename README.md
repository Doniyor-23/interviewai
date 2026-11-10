# InterviewAI — Part 1 (Foundation, Auth, UI)

React + Vite + Tailwind v4 frontend, Express + MongoDB backend. Part 2 adds Gemini-powered voice interviews, evaluation, reports and analytics.

## Setup

Requires Node 18+ and a MongoDB Atlas cluster.

```bash
# 1. Backend
cd backend
cp .env.example .env        # then fill in the values below
npm install
npm run dev                 # http://localhost:5000

# 2. Frontend (second terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

The Vite dev server proxies `/api` to `localhost:5000`, so the HTTP-only auth cookie stays same-origin.

## Environment variables (`backend/.env`)

| Variable | Notes |
|---|---|
| `PORT` | API port. Default 5000. |
| `MONGODB_URI` | Your Atlas connection string. The app always uses the `interviewai` database. In Atlas, allow your IP under Network Access. |
| `JWT_SECRET` | Long random string (16+ chars). Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `GEMINI_API_KEY` | Not used until Part 2. Leave empty. |
| `RESEND_API_KEY` | Optional in development. Empty = verification codes and reset links print in the backend terminal. **Required** when `NODE_ENV=production`. |
| `EMAIL_FROM` | e.g. `InterviewAI <noreply@yourdomain.com>`. Defaults to Resend's test sender, which only delivers to your own Resend account email until you verify a domain. |
| `CLIENT_URL` | Frontend origin for CORS and reset links. Default `http://localhost:5173`. |

Frontend: `VITE_API_URL` is optional (leave empty in development).

## Structure

```
interviewai/
  backend/src/   config/ controllers/ middleware/ models/ routes/ services/ utils/ validators/
  frontend/src/  components/{common,dashboard,forms,layout,landing}/ pages/ layouts/ hooks/ services/ context/ utils/ assets/
```

## Part 2: AI voice interviews

**Flow:** setup, lobby (browser audio permission gesture), AI asks (spoken aloud), you answer by mic or text, edit transcript,
submit, instant feedback, next question or follow-up, stage feedback screen after every stage, final report.

**Backend** (all Gemini calls stay server-side, `backend/src/services/geminiService.js`):
`POST /api/interviews/start`, `POST /:id/answer`, `POST /:id/next-question`, `POST /:id/stage-feedback`, `POST /:id/complete`,
`GET /:id` (includes derived `state`), `GET /:id/report`, plus `/api/progress/overview` and `/analytics`.
Interview state is derived from what is saved in MongoDB (`interviewEngine.js`), so every endpoint is idempotent and a refresh resumes exactly where you were.
Every answer is saved *before* the AI call and its evaluation right after; a failed evaluation can simply be retried.
Scores are computed from saved evaluations (stage = mean of its answers, overall = mean of all answers); Gemini only writes the text.

**Frontend voice** is 100% browser-native (no paid API): `useSpeechSynthesis` (TTS) and `useSpeechRecognition` (STT).
Raw audio is never recorded or stored; only the transcript text you submit.

### Gemini model configuration
Model names change often. By default the server tries `gemini-flash-latest`, `gemini-3.5-flash`, `gemini-3-flash-preview`, `gemini-2.5-flash`,
and if none work it lists the models your key can access and picks a current Flash model. To pin one, set `GEMINI_MODEL` in `backend/.env`.

### Browser support
Speech recognition works in Chrome and Edge (desktop and Android). Safari support is partial and Firefox has none, in which case the typed-answer
fallback is shown. Chrome's speech recognition sends audio to Google's speech service, so it needs an internet connection.
Uzbek voices/recognition depend on the OS and browser: the app checks for an Uzbek voice and tells you when one is missing.

## Security notes

bcrypt (12 rounds) for passwords; verification codes are bcrypt-hashed, expire in 10 min, allow 5 attempts, 60 s resend cooldown;
reset tokens are random, SHA-256 hashed, single-use, 30 min; JWT in an HTTP-only, SameSite=Lax cookie (Secure in production);
Helmet, CORS allow-list, rate limits on every auth route; every interview query is scoped by `userId`.
If you deploy frontend and backend on different sites, change the cookie to `SameSite=None; Secure` in `backend/src/utils/tokens.js`.
