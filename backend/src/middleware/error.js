import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message;
  let extra = err.extra || {};

  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed.';
    extra = { errors: Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message])) };
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier.';
  } else if (err.code === 11000) {
    status = 409;
    message = 'That value is already in use.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request is too large.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body.';
  }

  if (status >= 500) {
    console.error('[error]', err);
    if (env.isProd) message = 'Something went wrong. Please try again.';
  }
  if (extra.retryAfter) res.set('Retry-After', String(extra.retryAfter));
  res.status(status).json({ success: false, message, ...extra });
};
