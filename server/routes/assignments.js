const express = require('express');
const { pool } = require('../db');
const { requireTeacher, requireLogin } = require('../middleware/auth');

const router = express.Router();

// Asignar ejercicio (a estudiante individual o a todo un aula)
router.post('/', requireTeacher, async (req, res, next) => {
  try {
    const { exerciseId, studentId, classroomId } = req.body;
    if (!exerciseId) return res.status(400).json({ error: 'exerciseId requerido' });
    if (!studentId && !classroomId) return res.status(400).json({ error: 'studentId o classroomId requerido' });

    const { rows } = await pool.query(
      `INSERT INTO assignments (exercise_id, student_id, classroom_id, assigned_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [exerciseId, studentId || null, classroomId || null, req.session.userId]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// Listar asignaciones del estudiante autenticado
// Incluye asignaciones directas y las de sus aulas
router.get('/mine', requireLogin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT a.id, a.exercise_id, e.title, e.type, a.assigned_at
       FROM assignments a
       JOIN exercises e ON e.id = a.exercise_id
       WHERE a.student_id = $1
          OR a.classroom_id IN (
               SELECT classroom_id FROM classroom_students WHERE student_id = $1
             )
       ORDER BY a.id DESC`,
      [req.session.userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Listar todas las asignaciones (para el profesor)
router.get('/', requireTeacher, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.exercise_id, e.title, a.student_id, a.classroom_id, a.assigned_at,
              u.display_name AS student_name, c.name AS classroom_name
       FROM assignments a
       JOIN exercises e ON e.id = a.exercise_id
       LEFT JOIN users u ON u.id = a.student_id
       LEFT JOIN classrooms c ON c.id = a.classroom_id
       WHERE e.created_by = $1
       ORDER BY a.id DESC`,
      [req.session.userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
