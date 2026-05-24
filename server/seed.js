require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool, init } = require('./db');

async function seed() {
  await init();

  const pw = await bcrypt.hash('demo123', 10);

  // ── Limpiar datos en orden por FK ─────────────────────────
  await pool.query('DELETE FROM results');
  await pool.query('DELETE FROM assignments');
  await pool.query('DELETE FROM classroom_students');
  await pool.query('DELETE FROM exercises');
  await pool.query('DELETE FROM classrooms');
  await pool.query('DELETE FROM users');

  // ── Profesores ────────────────────────────────────────────
  const [ana, carlos] = await insertUsers(pw, [
    { username: 'profe_ana',    name: 'Ana García',    role: 'teacher' },
    { username: 'profe_carlos', name: 'Carlos Ruiz',   role: 'teacher' },
  ]);

  // ── Estudiantes ───────────────────────────────────────────
  const students = await insertUsers(pw, [
    { username: 'maria_g',     name: 'María González',    role: 'student' }, // 0
    { username: 'pedro_r',     name: 'Pedro Ramírez',     role: 'student' }, // 1
    { username: 'sofia_l',     name: 'Sofía López',       role: 'student' }, // 2
    { username: 'andres_m',    name: 'Andrés Morales',    role: 'student' }, // 3
    { username: 'valentina_c', name: 'Valentina Castro',  role: 'student' }, // 4
    { username: 'miguel_h',    name: 'Miguel Hernández',  role: 'student' }, // 5
    { username: 'isabella_t',  name: 'Isabella Torres',   role: 'student' }, // 6
    { username: 'sebastian_v', name: 'Sebastián Vargas',  role: 'student' }, // 7
    { username: 'camila_f',    name: 'Camila Fernández',  role: 'student' }, // 8
    { username: 'juan_d',      name: 'Juan Díaz',         role: 'student' }, // 9
    { username: 'lucia_p',     name: 'Lucía Peña',        role: 'student' }, // 10
    { username: 'daniel_s',    name: 'Daniel Soto',       role: 'student' }, // 11
  ]);

  // ── Aulas ─────────────────────────────────────────────────
  const aulA = await createClassroom('3ro Primaria A', ana.id);
  const aulB = await createClassroom('3ro Primaria B', ana.id);
  const aulC = await createClassroom('4to Primaria',   carlos.id);

  // Aula A: primeros 6
  for (const s of students.slice(0, 6))
    await addToClassroom(aulA.id, s.id);

  // Aula B: últimos 6
  for (const s of students.slice(6, 12))
    await addToClassroom(aulB.id, s.id);

  // Aula C: mezcla de ambos grupos (índices 2-7)
  for (const s of students.slice(2, 8))
    await addToClassroom(aulC.id, s.id);

  // ── Ejercicios ────────────────────────────────────────────
  const ex = [];

  // 0 — Sumas básicas (Ana) — tema: estrellas
  ex.push(await createExercise(ana.id, 'Sumas básicas', 'addition', [
    { prompt: '¿Cuánto es 3 + 4?',   options: { A:'5',  B:'6',  C:'7',  D:'8'  }, correct:'C' },
    { prompt: '¿Cuánto es 5 + 2?',   options: { A:'5',  B:'7',  C:'8',  D:'9'  }, correct:'B' },
    { prompt: '¿Cuánto es 8 + 1?',   options: { A:'7',  B:'8',  C:'9',  D:'10' }, correct:'C' },
    { prompt: '¿Cuánto es 4 + 6?',   options: { A:'9',  B:'10', C:'11', D:'12' }, correct:'B' },
    { prompt: '¿Cuánto es 6 + 3?',   options: { A:'7',  B:'8',  C:'9',  D:'10' }, correct:'C' },
  ], 'stars'));

  // 1 — Sumas con decenas (Ana) — tema: globos
  ex.push(await createExercise(ana.id, 'Sumas con decenas', 'addition', [
    { prompt: '¿Cuánto es 10 + 5?',  options: { A:'14', B:'15', C:'16', D:'20' }, correct:'B' },
    { prompt: '¿Cuánto es 20 + 8?',  options: { A:'26', B:'27', C:'28', D:'30' }, correct:'C' },
    { prompt: '¿Cuánto es 15 + 7?',  options: { A:'20', B:'21', C:'22', D:'23' }, correct:'C' },
    { prompt: '¿Cuánto es 30 + 4?',  options: { A:'33', B:'34', C:'35', D:'40' }, correct:'B' },
    { prompt: '¿Cuánto es 12 + 9?',  options: { A:'20', B:'21', C:'22', D:'19' }, correct:'B' },
  ], 'balloons'));

  // 2 — Sumas avanzadas (Ana) — tema: robots
  ex.push(await createExercise(ana.id, 'Sumas avanzadas', 'addition', [
    { prompt: '¿Cuánto es 23 + 14?', options: { A:'35', B:'36', C:'37', D:'38' }, correct:'C' },
    { prompt: '¿Cuánto es 45 + 22?', options: { A:'65', B:'66', C:'67', D:'68' }, correct:'C' },
    { prompt: '¿Cuánto es 31 + 29?', options: { A:'58', B:'59', C:'60', D:'61' }, correct:'C' },
    { prompt: '¿Cuánto es 18 + 17?', options: { A:'33', B:'34', C:'35', D:'36' }, correct:'C' },
    { prompt: '¿Cuánto es 27 + 43?', options: { A:'68', B:'69', C:'70', D:'71' }, correct:'C' },
  ], 'robots'));

  // 3 — Restas básicas (Ana) — tema: dinosaurios
  ex.push(await createExercise(ana.id, 'Restas básicas', 'subtraction', [
    { prompt: '¿Cuánto es 9 - 3?',   options: { A:'4',  B:'5',  C:'6',  D:'7'  }, correct:'C' },
    { prompt: '¿Cuánto es 8 - 5?',   options: { A:'2',  B:'3',  C:'4',  D:'5'  }, correct:'B' },
    { prompt: '¿Cuánto es 7 - 2?',   options: { A:'4',  B:'5',  C:'6',  D:'7'  }, correct:'B' },
    { prompt: '¿Cuánto es 10 - 4?',  options: { A:'5',  B:'6',  C:'7',  D:'8'  }, correct:'B' },
    { prompt: '¿Cuánto es 6 - 1?',   options: { A:'4',  B:'5',  C:'6',  D:'7'  }, correct:'B' },
  ], 'dinosaurs'));

  // 4 — Restas con decenas (Ana) — tema: frutas
  ex.push(await createExercise(ana.id, 'Restas con decenas', 'subtraction', [
    { prompt: '¿Cuánto es 20 - 5?',  options: { A:'13', B:'14', C:'15', D:'16' }, correct:'C' },
    { prompt: '¿Cuánto es 30 - 8?',  options: { A:'20', B:'21', C:'22', D:'23' }, correct:'C' },
    { prompt: '¿Cuánto es 15 - 7?',  options: { A:'6',  B:'7',  C:'8',  D:'9'  }, correct:'C' },
    { prompt: '¿Cuánto es 40 - 12?', options: { A:'26', B:'27', C:'28', D:'29' }, correct:'C' },
    { prompt: '¿Cuánto es 25 - 9?',  options: { A:'14', B:'15', C:'16', D:'17' }, correct:'C' },
  ], 'fruits'));

  // 5 — Restas avanzadas (Carlos) — tema: cohetes
  ex.push(await createExercise(carlos.id, 'Restas avanzadas', 'subtraction', [
    { prompt: '¿Cuánto es 50 - 23?', options: { A:'25', B:'26', C:'27', D:'28' }, correct:'C' },
    { prompt: '¿Cuánto es 84 - 35?', options: { A:'47', B:'48', C:'49', D:'50' }, correct:'C' },
    { prompt: '¿Cuánto es 63 - 28?', options: { A:'33', B:'34', C:'35', D:'36' }, correct:'C' },
    { prompt: '¿Cuánto es 71 - 36?', options: { A:'33', B:'34', C:'35', D:'36' }, correct:'C' },
    { prompt: '¿Cuánto es 90 - 47?', options: { A:'41', B:'42', C:'43', D:'44' }, correct:'C' },
  ], 'rockets'));

  // 6 — Repaso sumas (Carlos) — tema: mariposas
  ex.push(await createExercise(carlos.id, 'Repaso: Sumas rápidas', 'addition', [
    { prompt: '¿Cuánto es 2 + 9?',   options: { A:'10', B:'11', C:'12', D:'13' }, correct:'B' },
    { prompt: '¿Cuánto es 7 + 8?',   options: { A:'13', B:'14', C:'15', D:'16' }, correct:'C' },
    { prompt: '¿Cuánto es 6 + 7?',   options: { A:'11', B:'12', C:'13', D:'14' }, correct:'C' },
    { prompt: '¿Cuánto es 9 + 9?',   options: { A:'16', B:'17', C:'18', D:'19' }, correct:'C' },
    { prompt: '¿Cuánto es 8 + 7?',   options: { A:'13', B:'14', C:'15', D:'16' }, correct:'C' },
  ], 'butterflies'));

  // 7 — Repaso restas (Carlos) — tema: peces
  ex.push(await createExercise(carlos.id, 'Repaso: Restas rápidas', 'subtraction', [
    { prompt: '¿Cuánto es 12 - 5?',  options: { A:'5',  B:'6',  C:'7',  D:'8'  }, correct:'C' },
    { prompt: '¿Cuánto es 15 - 8?',  options: { A:'5',  B:'6',  C:'7',  D:'8'  }, correct:'C' },
    { prompt: '¿Cuánto es 11 - 4?',  options: { A:'5',  B:'6',  C:'7',  D:'8'  }, correct:'C' },
    { prompt: '¿Cuánto es 18 - 9?',  options: { A:'7',  B:'8',  C:'9',  D:'10' }, correct:'C' },
    { prompt: '¿Cuánto es 14 - 7?',  options: { A:'5',  B:'6',  C:'7',  D:'8'  }, correct:'C' },
  ], 'fish'));

  // ── Asignaciones ──────────────────────────────────────────
  // Aula A (Ana): ejercicios 0, 1, 3
  const asgA = [
    await createAssignment(ex[0].id, aulA.id, null, ana.id),
    await createAssignment(ex[1].id, aulA.id, null, ana.id),
    await createAssignment(ex[3].id, aulA.id, null, ana.id),
  ];

  // Aula B (Ana): ejercicios 1, 3, 4
  const asgB = [
    await createAssignment(ex[1].id, aulB.id, null, ana.id),
    await createAssignment(ex[3].id, aulB.id, null, ana.id),
    await createAssignment(ex[4].id, aulB.id, null, ana.id),
  ];

  // Aula C (Carlos): ejercicios 5, 6, 7, 2  (2 queda pendiente sin resultados)
  const asgC = [
    await createAssignment(ex[5].id, aulC.id, null, carlos.id),
    await createAssignment(ex[6].id, aulC.id, null, carlos.id),
    await createAssignment(ex[7].id, aulC.id, null, carlos.id),
    await createAssignment(ex[2].id, aulC.id, null, carlos.id), // sin resultados → pendiente
  ];

  // ── Resultados ────────────────────────────────────────────
  // Perfil de respuestas por estudiante [q0, q1, q2, q3, q4]
  // true = correcto, false = incorrecto
  const PROFILES = [
    [true,  true,  true,  true,  true ],  // 100% — Excelente  (students[0,6])
    [true,  true,  true,  true,  false],  // 80%  — Excelente  (students[1,7])
    [true,  true,  true,  false, true ],  // 80%  — Excelente  (students[2,8])
    [true,  true,  false, true,  false],  // 60%  — Bueno      (students[3,9])
    [false, true,  false, true,  false],  // 40%  — Regular    (students[4,10])
    [true,  false, false, false, false],  // 20%  — Necesita   (students[5,11])
  ];

  // Aula A — todos completan los 3 ejercicios
  await insertResults(asgA, students.slice(0, 6), PROFILES, ex);

  // Aula B — solo completan los 2 primeros; el 3ro queda pendiente
  await insertResults(asgB.slice(0, 2), students.slice(6, 12), PROFILES, ex);

  // Aula C — completan los 3 primeros; el 4to (ex[2]) queda pendiente
  await insertResults(asgC.slice(0, 3), students.slice(2, 8), PROFILES, ex);

  // ── Resumen ───────────────────────────────────────────────
  console.log('\n✅  Datos de prueba insertados correctamente\n');
  console.log('── PROFESORES ──────────────────────────────────────────────');
  console.log('   profe_ana    / demo123   → Ana García  (2 aulas, 5 ejercicios)');
  console.log('   profe_carlos / demo123   → Carlos Ruiz (1 aula,  3 ejercicios)');
  console.log('\n── ESTUDIANTES  (contraseña: demo123) ──────────────────────');
  for (const s of students)
    console.log('   ' + s.username.padEnd(18) + '→  ' + s.display_name);
  console.log('\n── AULAS ───────────────────────────────────────────────────');
  console.log('   3ro Primaria A  →  profe_ana    (maría, pedro, sofía, andrés, valentina, miguel)');
  console.log('   3ro Primaria B  →  profe_ana    (isabella, sebastián, camila, juan, lucía, daniel)');
  console.log('   4to Primaria    →  profe_carlos (sofía … sebastián — índices 2-7)');
  console.log('\n── EJERCICIOS ──────────────────────────────────────────────');
  ex.forEach((e, i) => console.log('   ' + String(i).padStart(2) + '.  [' + e.type.slice(0,3).toUpperCase() + ']  ' + e.title));
  console.log('');

  await pool.end();
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */

async function insertUsers(pw, list) {
  const out = [];
  for (const u of list) {
    const { rows } = await pool.query(
      `INSERT INTO users (username, password, display_name, role)
       VALUES ($1, $2, $3, $4) RETURNING id, username, display_name, role`,
      [u.username, pw, u.name, u.role]
    );
    out.push(rows[0]);
  }
  return out;
}

async function createClassroom(name, teacherId) {
  const { rows } = await pool.query(
    `INSERT INTO classrooms (name, teacher_id) VALUES ($1, $2) RETURNING *`,
    [name, teacherId]
  );
  return rows[0];
}

async function addToClassroom(classroomId, studentId) {
  await pool.query(
    `INSERT INTO classroom_students (classroom_id, student_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [classroomId, studentId]
  );
}

async function createExercise(teacherId, title, type, questions, theme = 'stars') {
  const { rows } = await pool.query(
    `INSERT INTO exercises (title, type, theme, questions, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [title, type, theme, JSON.stringify(questions), teacherId]
  );
  // Attach original questions array so we can reference correct answers later
  return { ...rows[0], questions };
}

async function createAssignment(exerciseId, classroomId, studentId, assignedBy) {
  const { rows } = await pool.query(
    `INSERT INTO assignments (exercise_id, classroom_id, student_id, assigned_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [exerciseId, classroomId, studentId, assignedBy]
  );
  return rows[0];
}

// Insert results for a set of assignments × students, using fixed answer profiles.
async function insertResults(assignments, students, profiles, allExercises) {
  for (const asg of assignments) {
    const exercise = allExercises.find(e => e.id === asg.exercise_id);
    const questions = exercise.questions;

    for (let si = 0; si < students.length; si++) {
      const student = students[si];
      const profile = profiles[si % profiles.length];

      for (let qi = 0; qi < questions.length; qi++) {
        const isCorrect    = profile[qi];
        const correctOpt   = questions[qi].correct;
        // For wrong answers pick the next option in the cycle A→B→C→D→A
        const opts         = ['A', 'B', 'C', 'D'];
        const wrongOpt     = opts[(opts.indexOf(correctOpt) + 1) % 4];
        const answerGiven  = isCorrect ? correctOpt : wrongOpt;

        await pool.query(
          `INSERT INTO results
             (assignment_id, student_id, question_index, answer_given, is_correct)
           VALUES ($1, $2, $3, $4, $5)`,
          [asg.id, student.id, qi, answerGiven, isCorrect]
        );
      }
    }
  }
}

seed().catch(err => {
  console.error('Error en seed:', err.message);
  process.exit(1);
});
