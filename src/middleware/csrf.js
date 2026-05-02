const crypto = require('crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function ensureToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  return req.session.csrfToken;
}

// Issues a per-session token and rejects state-changing requests that arrive
// without the hidden _csrf form field. The token itself is exposed to views
// through res.locals.csrfToken so templates can embed it in their forms.
function csrfMiddleware(req, res, next) {
  const token = ensureToken(req);
  res.locals.csrfToken = token;

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const provided = req.body && req.body._csrf;
  if (!provided) {
    return res
      .status(403)
      .render('error', { status: 403, message: 'Invalid request token' });
  }

  next();
}

module.exports = { csrfMiddleware };
