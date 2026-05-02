const crypto = require('crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function ensureToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  return req.session.csrfToken;
}

// Constant-time string compare so token validation does not leak length or
// content through timing differences. Both inputs must be non-empty strings.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length === 0 || b.length === 0) return false;
  let mismatch = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function csrfMiddleware(req, res, next) {
  const token = ensureToken(req);
  res.locals.csrfToken = token;

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const provided = req.body && req.body._csrf;
  if (!safeEqual(provided, token)) {
    return res
      .status(403)
      .render('error', { status: 403, message: 'Invalid request token' });
  }

  next();
}

module.exports = { csrfMiddleware };
