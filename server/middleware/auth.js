function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  next();
}

function requireTeacher(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  if (req.session.role !== 'teacher') return res.status(403).json({ error: 'Solo profesores' });
  next();
}

module.exports = { requireLogin, requireTeacher };
