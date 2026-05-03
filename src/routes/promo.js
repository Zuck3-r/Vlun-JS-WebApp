const express = require('express');
const { db } = require('../db/init');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.use(requireLogin);

function loadHistory(userId) {
  return db
    .prepare(
      `SELECT promo_redemptions.id,
              promo_redemptions.created_at,
              promo_codes.code,
              promo_codes.reward_label
       FROM promo_redemptions
       JOIN promo_codes ON promo_codes.id = promo_redemptions.code_id
       WHERE promo_redemptions.user_id = ?
       ORDER BY promo_redemptions.id DESC`
    )
    .all(userId);
}

router.get('/', (req, res) => {
  const history = loadHistory(req.session.user.id);
  res.render('promo/index', { history, error: null, message: null });
});

router.post('/redeem', (req, res) => {
  const code = (req.body.code || '').trim();
  const history = loadHistory(req.session.user.id);

  if (!code) {
    return res
      .status(400)
      .render('promo/index', { history, error: 'Code required', message: null });
  }

  // Look up the promo code; codes are entered by hand so we tolerate case.
  const row = db
    .prepare('SELECT id, code, reward_label, max_uses, used_count FROM promo_codes WHERE code = ? COLLATE NOCASE')
    .get(code);

  if (!row) {
    return res
      .status(404)
      .render('promo/index', { history, error: 'Unknown promo code', message: null });
  }

  if (row.used_count >= row.max_uses) {
    return res
      .status(409)
      .render('promo/index', { history, error: 'This code has already been fully claimed', message: null });
  }

  // Record the redemption for this user, then bump the counter so the next
  // request sees the updated remaining uses.
  db.prepare(
    'INSERT INTO promo_redemptions (code_id, user_id) VALUES (?, ?)'
  ).run(row.id, req.session.user.id);

  db.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE code = ?').run(code);

  const updatedHistory = loadHistory(req.session.user.id);
  res.render('promo/index', {
    history: updatedHistory,
    error: null,
    message: `Redeemed: ${row.reward_label}`,
  });
});

module.exports = router;
