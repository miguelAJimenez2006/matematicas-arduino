const express = require('express');
const { pool } = require('../db');
const { requireTeacher, requireLogin } = require('../middleware/auth');

const router = express.Router();

// Listar aulas del profesor autenticado
router.get('/', requireTeacher, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM classrooms WHERE teacher_id = $1 ORDER BY name',
    [req.session.userId]
  );
  res.json(rows);
});

// Crear aula
router.post('/', requireTeacher, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  const { rows } = await pool.query(
    'INSERT INTO classrooms (name, teacher_id) VALUES ($1, $2) RETURNING *',
    [name, req.session.userId]
  );
  res.status(201).json(rows[0]);
});

// Eliminar aula
router.delete('/:id', requireTeacher, async (req, res) => {
  await pool.query(
    'DELETE FROM classrooms WHERE id = $1 AND teacher_id = $2',
    [req.params.id, req.session.userId]
  );
  res.json({ ok: true });
});

// Listar estudiantes de un aula
router.get('/:id/students', requireTeacher, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.display_name
     FROM classroom_students cs
     JOIN users u ON u.id = cs.student_id
     WHERE cs.classroom_id = $1
     ORDER BY u.display_name`,
    [req.params.id]
  );
  res.json(rows);
});

// Agregar estudiante a un aula
router.post('/:id/students', requireTeacher, async (req, res) => {
  const { studentId } = req.body;
  if (!studentId) return res.status(400).json({ error: 'studentId requerido' });
  await pool.query(
    'INSERT INTO classroom_students (classroom_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.params.id, studentId]
  );
  res.status(201).json({ ok: true });
});

// Quitar estudiante de un aula
router.delete('/:id/students/:studentId', requireTeacher, async (req, res) => {
  await pool.query(
    'DELETE FROM classroom_students WHERE classroom_id = $1 AND student_id = $2',
    [req.params.id, req.params.studentId]
  );
  res.json({ ok: true });
});

// Listar todos los estudiantes (para agregar a aula)
router.get('/students/all', requireTeacher, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, username, display_name FROM users WHERE role = 'student' ORDER BY display_name"
  );
  res.json(rows);
});

module.exports = router;
