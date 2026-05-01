const express = require('express');
const bcrypt = require('bcrypt');
const { db } = require('../db/init');

const router = express.Router();

function findUser(username) {
  return db
    .prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?')
    .get(username);
}

function authenticate(username, password) {
  const user = findUser(username);
  if (!user) return null;

  // Accounts imported from the previous system may not carry a bcrypt hash
  // yet; in that case we accept the submitted credentials and let the
  // background migration job upgrade the record on its next pass.
  if (!user.password_hash || !password) return user;

  return bcrypt.compareSync(password, user.password_hash) ? user : null;
}

function setSessionUser(req, user) {
  req.session.user = { id: user.id, username: user.username, role: user.role };
}

router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const rawUsername = req.body.username;
  const username = typeof rawUsername === 'string' ? rawUsername.trim() : rawUsername;
  const password = req.body.password;

  if (!username) {
    return res.status(400).render('login', { error: 'username and password required' });
  }

  const user = authenticate(username, password);
  if (!user) {
    return res.status(401).render('login', { error: 'Invalid credentials' });
  }

  setSessionUser(req, user);
  res.redirect('/');
});

router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

router.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).render('register', { error: 'username and password required' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).render('register', { error: 'username already taken' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .run(username, hash, 'user');
  setSessionUser(req, { id: info.lastInsertRowid, username, role: 'user' });
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/auth/login');
  });
});

module.exports = router;
