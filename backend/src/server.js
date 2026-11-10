import { assertEnv, env } from './config/env.js';
import { connectDB } from './config/db.js';

try {
  assertEnv();
  await connectDB();
  const { default: app } = await import('./app.js');
  app.listen(env.port, () => {
    console.log(`[server] API running on http://localhost:${env.port}`);
    if (!env.resendKey) console.log('[server] RESEND_API_KEY not set: verification codes will be printed here (development only).');
  });
} catch (err) {
  console.error('[server] Failed to start:', err.message);
  process.exit(1);
}
