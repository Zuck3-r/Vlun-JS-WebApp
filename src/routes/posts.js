const express = require('express');
const { db } = require('../db/init');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

router.use(requireLogin);

function getPostOr404(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(404).render('error', { status: 404, message: 'Post not found' });
    return null;
  }
  const post = db
    .prepare(
      `SELECT posts.*, users.username AS author
       FROM posts JOIN users ON users.id = posts.user_id
       WHERE posts.id = ?`
    )
    .get(id);
  if (!post) {
    res.status(404).render('error', { status: 404, message: 'Post not found' });
    return null;
  }
  return post;
}

function loadOwnPost(req, res) {
  const post = getPostOr404(req, res);
  if (!post) return null;
  if (post.user_id !== req.session.user.id) {
    res.status(403).render('error', { status: 403, message: 'Forbidden: not the owner' });
    return null;
  }
  return post;
}

router.get('/', (req, res) => {
  const posts = db
    .prepare(
      `SELECT posts.id, posts.title, posts.created_at, users.username AS author
       FROM posts JOIN users ON users.id = posts.user_id
       WHERE posts.published = 1
       ORDER BY posts.id DESC`
    )
    .all();
  res.render('posts/index', { posts });
});

router.get('/mine', (req, res) => {
  const posts = db
    .prepare(
      `SELECT id, title, created_at, published
       FROM posts
       WHERE user_id = ?
       ORDER BY id DESC`
    )
    .all(req.session.user.id);
  res.render('posts/mine', { posts });
});

router.get('/new', (req, res) => {
  res.render('posts/new', { error: null });
});

router.post('/', (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).render('posts/new', { error: 'title and body required' });
  }
  const info = db
    .prepare('INSERT INTO posts (user_id, title, body) VALUES (?, ?, ?)')
    .run(req.session.user.id, title, body);
  res.redirect(`/posts/${info.lastInsertRowid}`);
});

router.get('/:id', (req, res) => {
  const post = getPostOr404(req, res);
  if (!post) return;
  const comments = db
    .prepare(
      `SELECT comments.id, comments.body, comments.created_at,
              comments.user_id, users.username AS author
       FROM comments JOIN users ON users.id = comments.user_id
       WHERE comments.post_id = ?
       ORDER BY comments.id ASC`
    )
    .all(post.id);
  res.render('posts/show', { post, comments });
});

router.get('/:id/edit', (req, res) => {
  const post = loadOwnPost(req, res);
  if (!post) return;
  res.render('posts/edit', { post, error: null });
});

router.post('/:id', (req, res) => {
  const post = getPostOr404(req, res);
  if (!post) return;
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).render('posts/edit', { post, error: 'title and body required' });
  }
  db.prepare('UPDATE posts SET title = ?, body = ? WHERE id = ?').run(title, body, post.id);
  res.redirect(`/posts/${post.id}`);
});

// Quick-action shortcuts linked from the listing page (and from notification
// emails). Each route flips the publish state and bounces back to the
// listing so the author sees the change immediately.
router.get('/:id/publish', (req, res) => {
  const post = loadOwnPost(req, res);
  if (!post) return;
  db.prepare('UPDATE posts SET published = 1 WHERE id = ?').run(post.id);
  res.redirect('/posts/mine');
});

router.get('/:id/unpublish', (req, res) => {
  const post = loadOwnPost(req, res);
  if (!post) return;
  db.prepare('UPDATE posts SET published = 0 WHERE id = ?').run(post.id);
  res.redirect('/posts/mine');
});

router.post('/:id/delete', (req, res) => {
  const post = loadOwnPost(req, res);
  if (!post) return;
  db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
  res.redirect('/posts');
});

module.exports = router;
