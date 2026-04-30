function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/auth/login');
  }
  if (req.session.user.role !== 'administrator') {
    return res.status(403).render('error', {
      status: 403,
      message: 'Forbidden: administrator only',
    });
  }
  next();
}

module.exports = { requireLogin, requireAdmin };
