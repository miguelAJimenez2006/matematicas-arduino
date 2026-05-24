const express = require('express');
const bcrypt  = require('bcrypt');
const { pool } = require('../db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

/* ── Login ──────────────────────────────────────────────── */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Faltan campos' });

  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  req.session.userId      = user.id;
  req.session.role        = user.role;
  req.session.displayName = user.display_name;

  // Esperar a que la sesión quede guardada en la DB antes de responder.
  // Sin esto, peticiones inmediatas (como /me al recargar) pueden llegar
  // antes de que el store haya escrito la fila y devuelven 401 falso.
  req.session.save(err => {
    if (err) return res.status(500).json({ error: 'Error al guardar sesión' });
    res.json({ id: user.id, username: user.username, role: user.role, displayName: user.display_name });
  });
});

/* ── Logout ─────────────────────────────────────────────── */
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

/* ── Sesión activa ───────────────────────────────────────── */
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'No autenticado' });
  res.json({ id: req.session.userId, role: req.session.role, displayName: req.session.displayName });
});

/* ── Registro (profesor o estudiante) ───────────────────── */
// Para crear cuenta de profesor se requiere un código especial.
// Defínelo en .env como TEACHER_CODE=tuCodigo; por defecto: TEACH2025
router.post('/register', async (req, res) => {
  const { username, password, displayName, role, teacherCode } = req.body;

  if (!username || !password || !displayName || !role)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });

  if (!['teacher', 'student'].includes(role))
    return res.status(400).json({ error: 'Rol inválido' });

  if (role === 'teacher') {
    const expected = process.env.TEACHER_CODE || 'TEACH2025';
    if (teacherCode !== expected)
      return res.status(403).json({ error: 'Código de profesor incorrecto' });
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (username, password, display_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, role, display_name`,
      [username.trim().toLowerCase(), hash, displayName.trim(), role]
    );
    const user = rows[0];
    req.session.userId      = user.id;
    req.session.role        = user.role;
    req.session.displayName = user.display_name;
    req.session.save(err => {
      if (err) return res.status(500).json({ error: 'Error al guardar sesión' });
      res.status(201).json({ id: user.id, username: user.username, role: user.role, displayName: user.display_name });
    });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ese nombre de usuario ya existe' });
    throw e;
  }
});

/* ── Profesor crea cuenta de estudiante ─────────────────── */
// El profesor permanece con su sesión; solo crea la cuenta.
router.post('/create-student', requireLogin, async (req, res) => {
  if (req.session.role !== 'teacher')
    return res.status(403).json({ error: 'Solo profesores' });

  const { username, password, displayName } = req.body;
  if (!username || !password || !displayName)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (username, password, display_name, role)
       VALUES ($1, $2, $3, 'student')
       RETURNING id, username, display_name`,
      [username.trim().toLowerCase(), hash, displayName.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ese nombre de usuario ya existe' });
    throw e;
  }
});

/* ── Actualizar perfil (nombre / contraseña) ─────────────── */
router.post('/profile', requireLogin, async (req, res) => {
  const { displayName, currentPassword, newPassword } = req.body;
  if (!displayName) return res.status(400).json({ error: 'El nombre es requerido' });

  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
  const user = rows[0];
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (newPassword) {
    if (!currentPassword) return res.status(400).json({ error: 'Escribe tu contraseña actual' });
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET display_name = $1, password = $2 WHERE id = $3',
      [displayName.trim(), newHash, req.session.userId]
    );
  } else {
    await pool.query(
      'UPDATE users SET display_name = $1 WHERE id = $2',
      [displayName.trim(), req.session.userId]
    );
  }

  req.session.displayName = displayName.trim();
  res.json({ displayName: displayName.trim() });
});

module.exports = router;
