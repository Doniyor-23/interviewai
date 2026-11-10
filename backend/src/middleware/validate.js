import { ApiError } from '../utils/ApiError.js';

export const validate = (rules) => (req, _res, next) => {
  const errors = rules(req.body || {});
  if (errors) return next(new ApiError(400, 'Please fix the highlighted fields.', { errors }));
  next();
};
