const express = require('express');
const { pool } = require('../db');
const { requireLogin } = require('../middleware/auth');

const router = express.Router();

// Map de clientes SSE conectados: teacherId -> [res, ...]
const sseClients = new Map();

// Endpoint SSE para el profesor
router.get('/live-feed', requireLogin, (req, res) => {
  if (req.session.role !== 'teacher') return res.status(403).end();

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();
  res.write('data: {"type":"connected"}\n\n');

  const teacherId = req.session.userId;
  if (!sseClients.has(teacherId)) sseClients.set(teacherId, []);
  sseClients.get(teacherId).push(res);

  req.on('close', () => {
    const clients = sseClients.get(teacherId) || [];
    sseClients.set(teacherId, clients.filter(r => r !== res));
  });
});

function broadcastToTeacher(teacherId, data) {
  const clients = sseClients.get(teacherId) || [];
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => res.write(payload));
}

// Enviar respuesta de una pregunta
router.post('/', requireLogin, async (req, res) => {
  const { assignmentId, questionIndex, answer } = req.body;
  if (!assignmentId || questionIndex === undefined || !answer)
    return res.status(400).json({ error: 'assignmentId, questionIndex y answer son requeridos' });

  if (!['A', 'B', 'C', 'D'].includes(answer))
    return res.status(400).json({ error: 'answer debe ser A, B, C o D' });

  // Obtener el ejercicio para verificar la respuesta correcta
  const { rows: assignRows } = await pool.query(
    `SELECT a.id, a.exercise_id, e.questions, e.created_by AS teacher_id,
            a.student_id, a.classroom_id
     FROM assignments a
     JOIN exercises e ON e.id = a.exercise_id
     WHERE a.id = $1`,
    [assignmentId]
  );
  if (!assignRows[0]) return res.status(404).json({ error: 'Asignación no encontrada' });

  const assignment = assignRows[0];
  const questions = assignment.questions;
  const question = questions[questionIndex];
  if (!question) return res.status(400).json({ error: 'Índice de pregunta inválido' });

  const isCorrect = question.correct === answer;

  await pool.query(
    `INSERT INTO results (assignment_id, student_id, question_index, answer_given, is_correct)
     VALUES ($1, $2, $3, $4, $5)`,
    [assignmentId, req.session.userId, questionIndex, answer, isCorrect]
  );

  // Obtener nombre del estudiante
  const { rows: userRows } = await pool.query(
    'SELECT display_name FROM users WHERE id = $1',
    [req.session.userId]
  );

  // Broadcast SSE al profesor dueño del ejercicio
  broadcastToTeacher(assignment.teacher_id, {
    type: 'answer',
    studentId: req.session.userId,
    studentName: userRows[0]?.display_name || 'Estudiante',
    assignmentId,
    questionIndex,
    answer,
    isCorrect,
    timestamp: new Date().toISOString(),
  });

  res.json({ isCorrect, correct: question.correct });
});

module.exports = { router, broadcastToTeacher };
