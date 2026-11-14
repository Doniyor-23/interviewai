# InterviewAI

React + Vite + Tailwind v4 frontend, Express + MongoDB backend, with AI interview sessions, voice controls, feedback, reports, progress tracking and Uzbek, English and Russian interfaces.

## Setup

Requires Node.js 22+ (the installed Google Gen AI SDK v3 requirement) and a MongoDB Atlas cluster.

```bash
# 1. Backend
cd backend
cp .env.example .env        # then fill in the values below
npm install
npm run dev                 # http://localhost:5005 (default in .env.example)

# 2. Frontend (second terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

The Vite dev server proxies `/api` to `localhost:5005`, so the HTTP-only auth cookie stays same-origin.

## Environment variables (`backend/.env`)

| Variable | Notes |
|---|---|
| `PORT` | API port. Default 5005. |
| `MONGODB_URI` | Your Atlas connection string. The app always uses the `interviewai` database. In Atlas, allow your IP under Network Access. |
| `JWT_SECRET` | Long random string (16+ chars). Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `GEMINI_API_KEY` | Required for AI interviews, evaluation, and reports. Keep it on the backend only. |
| `AZURE_SPEECH_KEY` | Optional. Key for an Azure Speech resource created on the **Free (F0)** tier. Keep it on the backend only. |
| `AZURE_SPEECH_REGION` | Region of that Azure Speech resource, for example `eastus`. |
| `AZURE_SPEECH_FREE_TIER_ONLY` | Set to `true` only after confirming the resource is F0. Otherwise Azure Speech stays disabled. |
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

**Azure Speech (optional):** in Azure Portal, create an Azure AI Speech resource and select the **Free (F0)** pricing tier and a supported region. From that resource's Keys and Endpoint page, copy a key and the region into `backend/.env` as `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`, then set `AZURE_SPEECH_FREE_TIER_ONLY=true` and restart the backend. Never put the key in the frontend or commit it. The flag is a manual enable switch; the application cannot verify the resource's pricing tier, so confirm F0 in Azure before enabling. The backend issues short-lived Speech tokens; the subscription key stays server-side. When configured, Uzbek interview audio is sent directly from the browser to Microsoft Speech for transcription, and Uzbek questions use the `uz-UZ-MadinaNeural` voice. F0 currently includes 5 hours/month of real-time Speech-to-Text and 500,000 Neural TTS characters/month. Keep the resource on F0. **No Azure account is required:** without Azure, Uzbek speech input uses the browser's built-in recognition if available; Chrome may send audio to Google's speech service. Browser availability and Uzbek voice quality vary, and an Uzbek system voice must be installed for spoken questions. Typing remains available. English and Russian also use browser speech recognition and matching system voices. Interview audio is not sent to Gemini by this application.

### Gemini model configuration
Model names change often. By default the server tries `gemini-flash-latest`, `gemini-3.5-flash`, `gemini-3-flash-preview`, `gemini-2.5-flash`,
and if none work it lists the models your key can access and picks a current Flash model. To pin one, set `GEMINI_MODEL` in `backend/.env`.

### Browser support
Speech recognition works in Chrome and Edge (desktop and Android). Safari support is partial and Firefox has none, in which case the typed-answer
fallback is shown. Chrome's speech recognition sends audio to Google's speech service, so it needs an internet connection.
AI speech output is used only when the device provides a voice matching the interview language. Otherwise, the question remains visible as text. On-device Uzbek recognition depends on the browser and installed language pack; typing remains available.

## Security notes

bcrypt (12 rounds) for passwords; verification codes are bcrypt-hashed, expire in 10 min, allow 5 attempts, 60 s resend cooldown;
reset tokens are random, SHA-256 hashed, single-use, 30 min; JWT in an HTTP-only, SameSite=Lax cookie (Secure in production);
Helmet, CORS allow-list, rate limits on every auth route; every interview query is scoped by `userId`.
If you deploy frontend and backend on different sites, change the cookie to `SameSite=None; Secure` in `backend/src/utils/tokens.js`.
