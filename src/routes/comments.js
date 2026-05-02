const express = require('express');
const { db } = require('../db/init');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.use(requireLogin);

router.post('/posts/:id/comments', (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId)) {
    return res.status(404).render('error', { status: 404, message: 'Post not found' });
  }
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) {
    return res.status(404).render('error', { status: 404, message: 'Post not found' });
  }
  const body = (req.body.body || '').trim();
  if (!body) {
    return res.redirect(`/posts/${postId}`);
  }
  db.prepare(
    'INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)'
  ).run(postId, req.session.user.id, body);
  res.redirect(`/posts/${postId}`);
});

router.post('/comments/:id/delete', (req, res) => {
  const commentId = Number(req.params.id);
  if (!Number.isInteger(commentId)) {
    return res.status(404).render('error', { status: 404, message: 'Comment not found' });
  }
  const comment = db
    .prepare('SELECT id, post_id, user_id FROM comments WHERE id = ?')
    .get(commentId);
  if (!comment) {
    return res.status(404).render('error', { status: 404, message: 'Comment not found' });
  }
  if (comment.user_id !== req.session.user.id) {
    return res
      .status(403)
      .render('error', { status: 403, message: 'Forbidden: not the author' });
  }
  db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
  res.redirect(`/posts/${comment.post_id}`);
});

module.exports = router;
