const crypto = require('crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const MAX_ACTIVE_TOKENS = 32;

function newToken() {
  return crypto.randomBytes(24).toString('hex');
}

function getActive(req) {
  if (!Array.isArray(req.session.csrfTokens)) {
    req.session.csrfTokens = [];
  }
  return req.session.csrfTokens;
}

function issueToken(req) {
  const active = getActive(req);
  const token = newToken();
  active.push(token);
  while (active.length > MAX_ACTIVE_TOKENS) {
    active.shift();
  }
  return token;
}

function consumeToken(req, provided) {
  if (typeof provided !== 'string' || provided.length === 0) return false;
  const active = getActive(req);
  const providedBuf = Buffer.from(provided);
  for (let i = 0; i < active.length; i += 1) {
    const candidateBuf = Buffer.from(active[i]);
    if (
      candidateBuf.length === providedBuf.length &&
      crypto.timingSafeEqual(candidateBuf, providedBuf)
    ) {
      active.splice(i, 1);
      return true;
    }
  }
  return false;
}

// 各リクエストごとに新しいトークンを発行し、view から hidden field に埋め込む。
// state-changing リクエストでは提示されたトークンを active set と照合し、
// 一致したものは即座に消費する（同じトークンの再利用は不可）。
function csrfMiddleware(req, res, next) {
  res.locals.csrfToken = issueToken(req);

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const provided = req.body && req.body._csrf;
  if (!consumeToken(req, provided)) {
    return res
      .status(403)
      .render('error', { status: 403, message: 'Invalid or expired request token' });
  }

  next();
}

module.exports = { csrfMiddleware };
