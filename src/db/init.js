const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, 'data.sqlite');
const db = new Database(dbPath);

function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user'
    );

    CREATE TABLE IF NOT EXISTS posts (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      published  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  const postCols = db.prepare("PRAGMA table_info(posts)").all().map((c) => c.name);
  if (!postCols.includes('published')) {
    db.exec("ALTER TABLE posts ADD COLUMN published INTEGER NOT NULL DEFAULT 1");
  }

  const count = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count === 0) {
    const insert = db.prepare(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
    );
    const seed = [
      ['admin', 'admin', 'administrator'],
      ['user1', 'password1', 'user'],
      ['user2', 'password2', 'user'],
    ];
    for (const [username, password, role] of seed) {
      insert.run(username, bcrypt.hashSync(password, 10), role);
    }

    const adminId = db.prepare('SELECT id FROM users WHERE username = ?').get('admin').id;
    const user1Id = db.prepare('SELECT id FROM users WHERE username = ?').get('user1').id;
    const insertPost = db.prepare(
      'INSERT INTO posts (user_id, title, body) VALUES (?, ?, ?)'
    );
    insertPost.run(adminId, 'Welcome', 'This is the first post by admin.');
    insertPost.run(user1Id, 'Hello', 'A friendly hello from user1.');
  }
}

module.exports = { db, init };
