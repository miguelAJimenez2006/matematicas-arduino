const express = require('express');
const { pool } = require('../db');
const { requireTeacher } = require('../middleware/auth');

const router = express.Router();

// Listar ejercicios creados por el profesor
router.get('/', requireTeacher, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, title, type, theme, created_by FROM exercises WHERE created_by = $1 ORDER BY id DESC',
    [req.session.userId]
  );
  res.json(rows);
});

// Obtener ejercicio con preguntas
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM exercises WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
  res.json(rows[0]);
});

// Crear ejercicio
// body: { title, type, questions: [{prompt, options:[A,B,C,D], correct: 'A'}] }
router.post('/', requireTeacher, async (req, res) => {
  const { title, type, theme, questions } = req.body;
  if (!title || !type || !Array.isArray(questions) || questions.length === 0)
    return res.status(400).json({ error: 'title, type y questions son requeridos' });

  const { rows } = await pool.query(
    'INSERT INTO exercises (title, type, theme, questions, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [title, type, theme || 'stars', JSON.stringify(questions), req.session.userId]
  );
  res.status(201).json(rows[0]);
});

// Eliminar ejercicio
router.delete('/:id', requireTeacher, async (req, res) => {
  await pool.query(
    'DELETE FROM exercises WHERE id = $1 AND created_by = $2',
    [req.params.id, req.session.userId]
  );
  res.json({ ok: true });
});

module.exports = router;
