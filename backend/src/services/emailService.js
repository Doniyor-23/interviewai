import { Resend } from 'resend';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const resend = env.resendKey ? new Resend(env.resendKey) : null;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const shell = (title, body) => `
<div style="font-family:Arial,sans-serif;background:#070b1a;padding:32px">
  <div style="max-width:480px;margin:auto;background:#0f1733;border:1px solid #1f2a55;border-radius:16px;padding:32px;color:#e8ecff">
    <div style="font-weight:700;font-size:18px;margin-bottom:20px">Interview<span style="color:#8b7bff">AI</span></div>
    <h2 style="margin:0 0 12px;font-size:20px">${title}</h2>${body}
    <p style="color:#8d98c4;font-size:12px;margin-top:28px">If you didn't request this, you can safely ignore this email.</p>
  </div>
</div>`;

async function deliver({ to, subject, html, devMessage }) {
  if (!resend) {
    console.log(`\n[email:code] To: ${to} | ${subject} | ${devMessage}\n`);
    return;
  }
  try {
    const { error } = await resend.emails.send({ from: env.emailFrom, to, subject, html });
    if (error) {
      console.error('[email] Resend error:', error.message || error);
      console.log(`\n[email:fallback-code] To: ${to} | ${devMessage}\n`);
      // In production, if Resend fails (e.g. domain restriction), log code so developer can see it in Render logs
    }
  } catch (err) {
    console.error('[email] Delivery failed:', err.message);
    console.log(`\n[email:fallback-code] To: ${to} | ${devMessage}\n`);
  }
}

export const sendVerificationEmail = (to, firstName, code) =>
  deliver({
    to,
    subject: 'Your InterviewAI verification code',
    devMessage: `Verification code: ${code}`,
    html: shell(
      `Hi ${esc(firstName)}, verify your email`,
      `<p style="color:#b7c0e6">Enter this code to activate your account. It expires in 10 minutes.</p>
       <div style="font-size:34px;letter-spacing:10px;font-weight:700;background:#070b1a;border-radius:12px;padding:16px;text-align:center;color:#c4b9ff">${esc(code)}</div>`
    ),
  });

export const sendPasswordResetEmail = (to, firstName, link) =>
  deliver({
    to,
    subject: 'Reset your InterviewAI password',
    devMessage: `Password reset link: ${link}`,
    html: shell(
      `Hi ${esc(firstName)}, reset your password`,
      `<p style="color:#b7c0e6">Click the button below to choose a new password. The link expires in 30 minutes.</p>
       <a href="${esc(link)}" style="display:inline-block;background:#6d5dfc;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">Reset password</a>`
    ),
  });
