const express = require('express');
const { db } = require('../db/init');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.use(requireLogin);

function postExists(id) {
  return db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
}

router.get('/bookmarks', (req, res) => {
  const rows = db
    .prepare(
      `SELECT posts.id, posts.title, users.username AS author,
              bookmarks.created_at
       FROM bookmarks
       JOIN posts ON posts.id = bookmarks.post_id
       JOIN users ON users.id = posts.user_id
       WHERE bookmarks.user_id = ?
       ORDER BY bookmarks.id DESC`
    )
    .all(req.session.user.id);
  res.render('bookmarks', { bookmarks: rows });
});

router.post('/posts/:id/bookmark', (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || !postExists(postId)) {
    return res.status(404).render('error', { status: 404, message: 'Post not found' });
  }
  db.prepare(
    'INSERT OR IGNORE INTO bookmarks (user_id, post_id) VALUES (?, ?)'
  ).run(req.session.user.id, postId);
  res.redirect(`/posts/${postId}`);
});

router.post('/posts/:id/unbookmark', (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId)) {
    return res.status(404).render('error', { status: 404, message: 'Post not found' });
  }
  db.prepare(
    'DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?'
  ).run(req.session.user.id, postId);
  res.redirect(`/posts/${postId}`);
});

module.exports = router;
