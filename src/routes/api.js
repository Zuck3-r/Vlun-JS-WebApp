const express = require('express');
const { db } = require('../db/init');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.use(requireLogin);

function notFound(res) {
  return res.status(404).json({ error: 'not found' });
}

function loadPost(id) {
  if (!Number.isInteger(id)) return null;
  return db
    .prepare(
      `SELECT posts.id, posts.user_id, posts.title, posts.body, posts.created_at,
              users.username AS author
       FROM posts JOIN users ON users.id = posts.user_id
       WHERE posts.id = ?`
    )
    .get(id);
}

router.get('/posts', (req, res) => {
  const posts = db
    .prepare(
      `SELECT posts.id, posts.title, posts.created_at, users.username AS author
       FROM posts JOIN users ON users.id = posts.user_id
       ORDER BY posts.id DESC`
    )
    .all();
  res.json({ posts });
});

router.get('/posts/:id', (req, res) => {
  const post = loadPost(Number(req.params.id));
  if (!post) return notFound(res);
  res.json({ post });
});

router.post('/posts', (req, res) => {
  const title = (req.body.title || '').toString().trim();
  const body = (req.body.body || '').toString().trim();
  if (!title || !body) {
    return res.status(400).json({ error: 'title and body required' });
  }
  const info = db
    .prepare('INSERT INTO posts (user_id, title, body) VALUES (?, ?, ?)')
    .run(req.session.user.id, title, body);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.post('/posts/:id', (req, res) => {
  const post = loadPost(Number(req.params.id));
  if (!post) return notFound(res);
  if (post.user_id !== req.session.user.id) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const title = (req.body.title || post.title).toString().trim();
  const body = (req.body.body || post.body).toString().trim();
  db.prepare('UPDATE posts SET title = ?, body = ? WHERE id = ?').run(
    title,
    body,
    post.id
  );
  res.json({ ok: true });
});

router.post('/posts/:id/delete', (req, res) => {
  const post = loadPost(Number(req.params.id));
  if (!post) return notFound(res);
  if (post.user_id !== req.session.user.id) {
    return res.status(403).json({ error: 'forbidden' });
  }
  db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
  res.json({ ok: true });
});

module.exports = router;
