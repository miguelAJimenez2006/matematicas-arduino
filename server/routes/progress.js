const express = require('express');
const { pool } = require('../db');
const { requireTeacher, requireLogin } = require('../middleware/auth');

const router = express.Router();

// Stats globales del estudiante — XP, racha, aciertos, logros
// IMPORTANTE: debe estar antes de /mine para que Express no lo confunda
router.get('/mine/stats', requireLogin, async (req, res, next) => {
  try {
    const sid = req.session.userId;

    const { rows: [totals] } = await pool.query(`
      SELECT
        COUNT(r.id)::int                                                   AS total_answered,
        COALESCE(SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END), 0)::int   AS total_correct,
        COUNT(DISTINCT a.exercise_id)::int                                 AS exercises_attempted
      FROM results r
      JOIN assignments a ON a.id = r.assignment_id
      WHERE r.student_id = $1
    `, [sid]);

    const { rows: perfectRows } = await pool.query(`
      SELECT a.exercise_id
      FROM results r
      JOIN assignments a ON a.id = r.assignment_id
      WHERE r.student_id = $1
      GROUP BY a.exercise_id
      HAVING COUNT(r.id) > 0
         AND COUNT(r.id) = SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END)
    `, [sid]);

    const { rows: recent } = await pool.query(`
      SELECT is_correct FROM results
      WHERE student_id = $1
      ORDER BY answered_at DESC
      LIMIT 30
    `, [sid]);

    let streak = 0;
    for (const r of recent) {
      if (r.is_correct) streak++;
      else break;
    }

    const { rows: typeRows } = await pool.query(`
      SELECT e.type, COUNT(DISTINCT a.exercise_id)::int AS cnt
      FROM results r
      JOIN assignments a ON a.id = r.assignment_id
      JOIN exercises e   ON e.id = a.exercise_id
      WHERE r.student_id = $1
      GROUP BY e.type
    `, [sid]);

    const types = {};
    typeRows.forEach(t => { types[t.type] = t.cnt; });

    const total   = totals?.total_answered  || 0;
    const correct = totals?.total_correct   || 0;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    res.json({
      total_answered:      total,
      total_correct:       correct,
      accuracy,
      xp:                  correct * 10,
      exercises_completed: totals?.exercises_attempted || 0,
      exercises_perfect:   perfectRows.length,
      streak,
      types,
    });
  } catch (err) { next(err); }
});

// Progreso del estudiante autenticado
router.get('/mine', requireLogin, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.exercise_id, e.title, e.type,
              COUNT(r.id) AS answered,
              SUM(CASE WHEN r.is_correct THEN 1 ELSE 0 END) AS correct
       FROM assignments a
       JOIN exercises e ON e.id = a.exercise_id
       LEFT JOIN results r ON r.assignment_id = a.id AND r.student_id = $1
       WHERE a.student_id = $1
          OR a.classroom_id IN (SELECT classroom_id FROM classroom_students WHERE student_id = $1)
       GROUP BY a.exercise_id, e.title, e.type`,
      [req.session.userId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Progreso de un estudiante en un ejercicio
router.get('/student/:studentId/exercise/:exerciseId', requireTeacher, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.question_index, r.answer_given, r.is_correct, r.answered_at
       FROM results r
       JOIN assignments a ON a.id = r.assignment_id
       WHERE r.student_id = $1 AND a.exercise_id = $2
       ORDER BY r.question_index, r.answered_at`,
      [req.params.studentId, req.params.exerciseId]
    );

    const byQuestion = {};
    rows.forEach(r => { byQuestion[r.question_index] = r; });
    const answers = Object.values(byQuestion);
    const total   = answers.length;
    const correct = answers.filter(r => r.is_correct).length;

    res.json({ answers, total, correct, score: total > 0 ? Math.round((correct / total) * 100) : null });
  } catch (err) { next(err); }
});

// Resumen de un aula
router.get('/classroom/:classroomId', requireTeacher, async (req, res, next) => {
  try {
    const { classroomId } = req.params;

    const { rows: students } = await pool.query(
      `SELECT u.id, u.display_name FROM classroom_students cs
       JOIN users u ON u.id = cs.student_id WHERE cs.classroom_id = $1`,
      [classroomId]
    );

    const { rows: assignments } = await pool.query(
      `SELECT DISTINCT a.id AS assignment_id, a.exercise_id, e.title, e.type
       FROM assignments a JOIN exercises e ON e.id = a.exercise_id
       WHERE a.classroom_id = $1
       ORDER BY a.exercise_id`,
      [classroomId]
    );

    const { rows: allResults } = await pool.query(
      `SELECT r.student_id, a.exercise_id, r.question_index, r.is_correct
       FROM results r
       JOIN assignments a ON a.id = r.assignment_id
       WHERE a.classroom_id = $1`,
      [classroomId]
    );

    const summary = {};
    allResults.forEach(r => {
      if (!summary[r.student_id]) summary[r.student_id] = {};
      if (!summary[r.student_id][r.exercise_id])
        summary[r.student_id][r.exercise_id] = { correct: 0, total: 0 };
      summary[r.student_id][r.exercise_id].total++;
      if (r.is_correct) summary[r.student_id][r.exercise_id].correct++;
    });

    res.json({ students, assignments, summary });
  } catch (err) { next(err); }
});

module.exports = router;
