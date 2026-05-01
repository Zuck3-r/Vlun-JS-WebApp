const express = require('express');
const { db } = require('../db/init');
const { requireLogin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireLogin, requireAdmin);

router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, username, role FROM users ORDER BY id').all();
  const posts = db
    .prepare(
      `SELECT posts.id, posts.title, posts.created_at, users.username AS author
       FROM posts JOIN users ON users.id = posts.user_id
       ORDER BY posts.id DESC`
    )
    .all();
  res.render('admin', { users, posts });
});

module.exports = router;
