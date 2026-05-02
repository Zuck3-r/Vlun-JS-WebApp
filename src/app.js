const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const { init: initDb, db } = require('./db/init');
const { requireLogin } = require('./middleware/auth');
const { csrfMiddleware } = require('./middleware/csrf');

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

initDb();

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(
  session({
    secret: 'vuln-app-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60,
    },
  })
);

app.use((req, res, next) => {
  res.locals.user = (req.session && req.session.user) || null;
  next();
});

app.use(csrfMiddleware);

app.get('/', requireLogin, (req, res) => {
  const recent = db
    .prepare(
      `SELECT posts.id, posts.title, users.username AS author
       FROM posts JOIN users ON users.id = posts.user_id
       ORDER BY posts.id DESC LIMIT 5`
    )
    .all();
  res.render('dashboard', { recent });
});

app.use('/auth', authRoutes);
app.use('/posts', postsRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).render('error', { status: 404, message: 'Not Found' });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).render('error', { status: 500, message: 'Internal Server Error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`vuln-app listening on http://localhost:${port}`);
});
