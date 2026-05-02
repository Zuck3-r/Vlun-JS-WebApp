const crypto = require('crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function ensureToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  return req.session.csrfToken;
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return crypto.timingSafeEqual(ab, bb);
}

function csrfMiddleware(req, res, next) {
  const token = ensureToken(req);
  res.locals.csrfToken = token;

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // /api/* is consumed by external clients that authenticate per-request via
  // the Authorization header, so the browser-form CSRF token does not apply.
  if (req.path.startsWith('/api/')) {
    return next();
  }

  const provided = req.body && req.body._csrf;
  if (!timingSafeEqual(provided, token)) {
    return res
      .status(403)
      .render('error', { status: 403, message: 'Invalid request token' });
  }

  next();
}

module.exports = { csrfMiddleware };
