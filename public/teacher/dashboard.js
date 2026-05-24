let currentTeacher      = null;
let allStudents         = [];
let allClassrooms       = [];
let allExercises        = [];
let classroomStudentsMap = {};   // classroomId -> [student]
let selectedClassroomId = null;

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function truncate(str, len) {
  return str && str.length > len ? str.slice(0, len) + '…' : (str || '');
}

function getPerformanceLevel(pct) {
  if (pct === null || pct === undefined) return { label: 'Sin datos', cls: 'none' };
  if (pct >= 80) return { label: 'Excelente',      cls: 'high' };
  if (pct >= 60) return { label: 'Bueno',           cls: 'good' };
  if (pct >= 40) return { label: 'Regular',         cls: 'mid' };
  return             { label: 'Necesita ayuda',     cls: 'low' };
}

/* ═══════════════════════════════════════════════════════════
   PANTALLAS / TABS
═══════════════════════════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const tab  = document.getElementById('tab-' + name);
  const link = document.querySelector('[data-tab="' + name + '"]');
  if (tab)  tab.classList.add('active');
  if (link) link.classList.add('active');

  // Scroll main content to top
  const main = document.getElementById('main-content');
  if (main) main.scrollTop = 0;
}

/* ═══════════════════════════════════════════════════════════
   LOGIN / LOGOUT
═══════════════════════════════════════════════════════════ */
/* ─── Login ↔ Register toggle ──────────────────────────── */
document.getElementById('btn-to-register').addEventListener('click', () => {
  document.getElementById('login-pane').classList.add('hidden');
  document.getElementById('register-pane').classList.remove('hidden');
});
document.getElementById('btn-to-login').addEventListener('click', () => {
  document.getElementById('register-pane').classList.add('hidden');
  document.getElementById('login-pane').classList.remove('hidden');
});

document.getElementById('btn-login').addEventListener('click', login);
document.getElementById('login-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});
document.getElementById('btn-register').addEventListener('click', registerTeacher);
document.getElementById('reg-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') registerTeacher();
});

async function registerTeacher() {
  const displayName = document.getElementById('reg-displayname').value.trim();
  const username    = document.getElementById('reg-username').value.trim();
  const password    = document.getElementById('reg-password').value;
  const teacherCode = document.getElementById('reg-code').value.trim();
  const err         = document.getElementById('register-error');
  err.textContent   = '';

  if (!displayName || !username || !password || !teacherCode) {
    err.textContent = 'Completa todos los campos.';
    return;
  }
  try {
    currentTeacher = await apiPost('/api/auth/register', {
      username, password, displayName, role: 'teacher', teacherCode,
    });
    updateTeacherUI();
    await loadAll();
    showScreen('screen-dashboard');
    showTab('overview');
    initLiveFeed();
  } catch (e) { err.textContent = e.message; }
}

async function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const err      = document.getElementById('login-error');
  err.textContent = '';
  try {
    currentTeacher = await apiPost('/api/auth/login', { username, password });
    if (currentTeacher.role !== 'teacher') {
      err.textContent = 'Esta página es solo para profesores.';
      return;
    }
    updateTeacherUI();
    await loadAll();
    showScreen('screen-dashboard');
    showTab('overview');
    initLiveFeed();
  } catch (e) { err.textContent = e.message; }
}

document.getElementById('btn-logout').addEventListener('click', async () => {
  await apiPost('/api/auth/logout', {});
  location.reload();
});

function updateTeacherUI() {
  if (!currentTeacher) return;
  const name = currentTeacher.displayName || 'Profesor';
  setText('sidebar-name', name);
  const avatar = document.getElementById('teacher-avatar');
  if (avatar) avatar.textContent = name[0].toUpperCase();
  setText('overview-greeting', 'Bienvenido, ' + name + '!');
}

/* ═══════════════════════════════════════════════════════════
   NAV TABS
═══════════════════════════════════════════════════════════ */
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const tab = link.dataset.tab;
    showTab(tab);
    if (tab === 'progress')    loadProgress();
    if (tab === 'assignments') loadAssignmentsList();
  });
});

document.querySelectorAll('[data-nav-to]').forEach(el => {
  el.addEventListener('click', () => showTab(el.dataset.navTo));
});

/* ═══════════════════════════════════════════════════════════
   CARGAR DATOS BASE
═══════════════════════════════════════════════════════════ */
async function loadAll() {
  const [studentsRes, classroomsRes, exercisesRes] = await Promise.allSettled([
    apiGet('/api/classrooms/students/all'),
    apiGet('/api/classrooms'),
    apiGet('/api/exercises'),
  ]);

  allStudents   = studentsRes.status   === 'fulfilled' ? studentsRes.value   : [];
  allClassrooms = classroomsRes.status === 'fulfilled' ? classroomsRes.value : [];
  allExercises  = exercisesRes.status  === 'fulfilled' ? exercisesRes.value  : [];

  // Load student lists per classroom in parallel for counts
  const studentListResults = await Promise.allSettled(
    allClassrooms.map(c => apiGet('/api/classrooms/' + c.id + '/students'))
  );
  allClassrooms.forEach((c, i) => {
    classroomStudentsMap[c.id] =
      studentListResults[i].status === 'fulfilled' ? studentListResults[i].value : [];
  });

  // Update nav badges
  const clBadge = document.getElementById('nav-badge-classrooms');
  if (clBadge) {
    clBadge.textContent = allClassrooms.length;
    clBadge.classList.toggle('hidden', allClassrooms.length === 0);
  }

  renderOverview();
  renderClassrooms();
  renderExercises();
  fillAssignSelects();
  fillProgressSelect();
}

/* ═══════════════════════════════════════════════════════════
   OVERVIEW TAB
═══════════════════════════════════════════════════════════ */
function renderOverview() {
  setText('ov-num-students',   allStudents.length);
  setText('ov-num-classrooms', allClassrooms.length);
  setText('ov-num-exercises',  allExercises.length);

  // Classroom quick list
  const grid = document.getElementById('ov-classrooms-grid');
  if (grid) {
    if (!allClassrooms.length) {
      grid.innerHTML = '<p class="no-data" style="padding:1rem 0">Sin aulas todavía.</p>';
    } else {
      grid.innerHTML = '';
      allClassrooms.slice(0, 5).forEach(c => {
        const count = classroomStudentsMap[c.id]?.length ?? 0;
        const row = document.createElement('div');
        row.className = 'ov-classroom-row';
        row.innerHTML = `
          <div class="ov-cr-left">
            <span class="ov-cr-name">${c.name}</span>
            <span class="ov-cr-meta">${count} estudiante${count !== 1 ? 's' : ''}</span>
          </div>
          <span class="ov-cr-badge">${count}</span>
        `;
        row.addEventListener('click', () => {
          showTab('classrooms');
          setTimeout(() => openClassroomModal(c), 80);
        });
        grid.appendChild(row);
      });
    }
  }

  // Exercise quick list
  const exList = document.getElementById('ov-exercises-list');
  if (exList) {
    if (!allExercises.length) {
      exList.innerHTML = '<p class="no-data" style="padding:1rem 0">Sin ejercicios todavía.</p>';
    } else {
      exList.innerHTML = '';
      allExercises.slice(0, 6).forEach(e => {
        const row = document.createElement('div');
        row.className = 'ov-exercise-row';
        row.innerHTML = `
          <span class="ov-ex-dot ${e.type}"></span>
          <span class="ov-ex-title">${e.title}</span>
          <span class="ov-ex-badge ${e.type}">${e.type === 'addition' ? 'Sumas' : 'Restas'}</span>
        `;
        exList.appendChild(row);
      });
    }
  }

  // Try to load assignment count asynchronously
  apiGet('/api/assignments').then(list => {
    setText('ov-num-assignments', list.length);
  }).catch(() => setText('ov-num-assignments', '—'));
}

/* ═══════════════════════════════════════════════════════════
   AULAS
═══════════════════════════════════════════════════════════ */
function renderClassrooms() {
  const grid = document.getElementById('classrooms-list');
  grid.innerHTML = '';

  setText('classrooms-count-desc',
    allClassrooms.length
      ? allClassrooms.length + ' aula' + (allClassrooms.length !== 1 ? 's' : '') + ' — ' +
        allStudents.length + ' estudiante' + (allStudents.length !== 1 ? 's' : '') + ' en total.'
      : 'Crea tu primera aula.');

  if (!allClassrooms.length) {
    grid.innerHTML = '<p class="no-data">No tienes aulas todavía.</p>';
    return;
  }

  allClassrooms.forEach(c => {
    const students = classroomStudentsMap[c.id] || [];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>🏫 ${c.name}</h3>
      <div class="card-stat-row">
        <span class="card-stat"><strong>${students.length}</strong> estudiante${students.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="card-actions">
        <button class="btn-info"   data-detail="${c.id}">Ver estudiantes</button>
        <button class="btn-action" data-prog="${c.id}"   style="background:#8B5CF6">Progreso</button>
        <button class="btn-danger" data-del="${c.id}">Eliminar</button>
      </div>
    `;
    card.querySelector('[data-detail]').addEventListener('click', () => openClassroomModal(c));
    card.querySelector('[data-prog]').addEventListener('click',   () => {
      document.getElementById('progress-classroom-select').value = c.id;
      showTab('progress');
      loadProgress();
    });
    card.querySelector('[data-del]').addEventListener('click', async () => {
      if (!confirm('¿Eliminar el aula "' + c.name + '"?')) return;
      await apiDelete('/api/classrooms/' + c.id);
      await loadAll();
    });
    grid.appendChild(card);
  });
}

// Crear aula
document.getElementById('btn-show-create-classroom').addEventListener('click', () => {
  document.getElementById('create-classroom-form').classList.remove('hidden');
});
document.getElementById('btn-cancel-classroom').addEventListener('click', () => {
  document.getElementById('create-classroom-form').classList.add('hidden');
});
document.getElementById('btn-create-classroom').addEventListener('click', async () => {
  const name = document.getElementById('classroom-name').value.trim();
  if (!name) return alert('Ingresa el nombre del aula.');
  await apiPost('/api/classrooms', { name });
  document.getElementById('classroom-name').value = '';
  document.getElementById('create-classroom-form').classList.add('hidden');
  await loadAll();
});

/* ─── Classroom Modal ──────────────────────────────────── */
function openClassroomModal(classroom) {
  selectedClassroomId = classroom.id;
  setText('modal-classroom-name', '🏫 ' + classroom.name);

  const select = document.getElementById('add-student-select');
  select.innerHTML = '<option value="">Seleccionar estudiante...</option>';
  allStudents.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.display_name + ' (' + s.username + ')';
    select.appendChild(opt);
  });

  document.getElementById('classroom-modal').classList.remove('hidden');
  refreshClassroomStudentsList(classroom.id);
}

async function refreshClassroomStudentsList(classroomId) {
  const students = await apiGet('/api/classrooms/' + classroomId + '/students');
  classroomStudentsMap[classroomId] = students;

  const list = document.getElementById('classroom-students-list');
  list.innerHTML = '';
  if (!students.length) {
    list.innerHTML = '<li style="color:var(--ink-3);padding:.75rem 0">Sin estudiantes en esta aula.</li>';
    return;
  }
  students.forEach(s => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${s.display_name} <span style="color:var(--ink-3);font-size:.875rem">@${s.username}</span></span>
      <button class="btn-danger" style="font-size:.8125rem;padding:.3rem .75rem" data-sid="${s.id}">Quitar</button>
    `;
    li.querySelector('button').addEventListener('click', async () => {
      await apiDelete('/api/classrooms/' + classroomId + '/students/' + s.id);
      await refreshClassroomStudentsList(classroomId);
    });
    list.appendChild(li);
  });
}

document.getElementById('btn-add-student').addEventListener('click', async () => {
  const select = document.getElementById('add-student-select');
  if (!select.value) return;
  await apiPost('/api/classrooms/' + selectedClassroomId + '/students', {
    studentId: parseInt(select.value),
  });
  await refreshClassroomStudentsList(selectedClassroomId);
});

document.getElementById('btn-create-student').addEventListener('click', async () => {
  const displayName = document.getElementById('new-student-name').value.trim();
  const username    = document.getElementById('new-student-username').value.trim();
  const password    = document.getElementById('new-student-password').value;
  const msg         = document.getElementById('create-student-msg');
  msg.textContent   = '';
  msg.style.color   = '';

  if (!displayName || !username || !password) {
    msg.textContent = 'Completa los tres campos.';
    msg.style.color = 'var(--danger)';
    return;
  }

  try {
    const newStudent = await apiPost('/api/auth/create-student', { displayName, username, password });

    // Agregar automáticamente al aula abierta
    if (selectedClassroomId) {
      await apiPost('/api/classrooms/' + selectedClassroomId + '/students', {
        studentId: newStudent.id,
      });
    }

    document.getElementById('new-student-name').value     = '';
    document.getElementById('new-student-username').value = '';
    document.getElementById('new-student-password').value = '';

    msg.textContent = '✅ Estudiante creado y agregado al aula.';
    msg.style.color = 'var(--accent-text)';
    setTimeout(() => { msg.textContent = ''; }, 4000);

    // Refrescar lista de estudiantes en el modal y el select global
    allStudents = await apiGet('/api/classrooms/students/all');
    const sel = document.getElementById('add-student-select');
    sel.innerHTML = '<option value="">Seleccionar estudiante...</option>';
    allStudents.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.display_name + ' (' + s.username + ')';
      sel.appendChild(opt);
    });
    if (selectedClassroomId) await refreshClassroomStudentsList(selectedClassroomId);

    // Actualizar contadores del overview
    renderOverview();
  } catch (e) {
    msg.textContent = '⚠️ ' + e.message;
    msg.style.color = 'var(--danger)';
  }
});

document.getElementById('btn-close-classroom-modal').addEventListener('click', closeClassroomModal);
document.getElementById('classroom-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeClassroomModal();
});
function closeClassroomModal() {
  document.getElementById('classroom-modal').classList.add('hidden');
  selectedClassroomId = null;
}

/* ═══════════════════════════════════════════════════════════
   EJERCICIOS
═══════════════════════════════════════════════════════════ */
function renderExercises() {
  const grid = document.getElementById('exercises-list');
  grid.innerHTML = '';

  setText('exercises-count-desc',
    allExercises.length
      ? allExercises.length + ' ejercicio' + (allExercises.length !== 1 ? 's' : '') + ' disponibles.'
      : 'Crea tu primer ejercicio.');

  if (!allExercises.length) {
    grid.innerHTML = '<p class="no-data">No tienes ejercicios todavía.</p>';
    return;
  }

  allExercises.forEach(e => {
    const card = document.createElement('div');
    card.className = 'card' + (e.type === 'subtraction' ? ' subtraction' : '');
    card.innerHTML = `
      <h3>${e.title}</h3>
      <span class="badge">${e.type === 'addition' ? '➕ Sumas' : '➖ Restas'}</span>
      <div class="card-actions">
        <button class="btn-info"   data-detail="${e.id}">Ver preguntas</button>
        <button class="btn-danger" data-del="${e.id}">Eliminar</button>
      </div>
    `;
    card.querySelector('[data-detail]').addEventListener('click', () => openExerciseModal(e));
    card.querySelector('[data-del]').addEventListener('click', async () => {
      if (!confirm('¿Eliminar el ejercicio "' + e.title + '"?')) return;
      await apiDelete('/api/exercises/' + e.id);
      await loadAll();
    });
    grid.appendChild(card);
  });
}

/* ─── Exercise Modal ───────────────────────────────────── */
async function openExerciseModal(exercise) {
  setText('modal-exercise-title', exercise.title);
  const badge = document.getElementById('modal-exercise-badge');
  if (badge) {
    badge.textContent = exercise.type === 'addition' ? '➕ Sumas' : '➖ Restas';
    badge.className = 'badge' + (exercise.type === 'subtraction' ? ' subtraction' : '');
  }
  const body = document.getElementById('modal-exercise-body');
  body.innerHTML = '<p class="loading-msg">Cargando preguntas…</p>';
  document.getElementById('exercise-modal').classList.remove('hidden');

  try {
    const full = await apiGet('/api/exercises/' + exercise.id);
    const questions = full.questions || [];

    if (!questions.length) {
      body.innerHTML = '<p class="no-data">Este ejercicio no tiene preguntas.</p>';
      return;
    }

    body.innerHTML = questions.map((q, i) => `
      <div class="modal-question">
        <div class="modal-q-header">
          <span class="modal-q-num">P${i + 1}</span>
          <span class="modal-q-prompt">${q.prompt}</span>
        </div>
        <div class="modal-q-options">
          ${['A','B','C','D'].map(opt => `
            <div class="modal-q-opt ${q.correct === opt ? 'correct-opt' : ''}">
              <span class="opt-letter-badge opt-${opt.toLowerCase()}">${opt}</span>
              <span>${q.options?.[opt] || '—'}</span>
              ${q.correct === opt ? '<span class="correct-check">✓ Correcta</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  } catch (e) {
    body.innerHTML = '<p class="error-msg">Error al cargar: ' + e.message + '</p>';
  }
}

document.getElementById('btn-close-exercise-modal').addEventListener('click', () => {
  document.getElementById('exercise-modal').classList.add('hidden');
});
document.getElementById('exercise-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) {
    document.getElementById('exercise-modal').classList.add('hidden');
  }
});

// Crear ejercicio
let questionCount  = 0;
let selectedTheme  = 'stars';

document.getElementById('btn-show-create-exercise').addEventListener('click', () => {
  document.getElementById('create-exercise-form').classList.remove('hidden');
  if (questionCount === 0) addQuestion();
});
document.getElementById('btn-cancel-exercise').addEventListener('click', () => {
  document.getElementById('create-exercise-form').classList.add('hidden');
  document.getElementById('questions-builder').innerHTML = '';
  questionCount = 0;
  setTheme('stars');
});
document.getElementById('btn-add-question').addEventListener('click', addQuestion);

document.getElementById('theme-picker').addEventListener('click', e => {
  const btn = e.target.closest('.theme-btn');
  if (!btn) return;
  setTheme(btn.dataset.theme);
});

function setTheme(theme) {
  selectedTheme = theme;
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
}

function addQuestion() {
  questionCount++;
  const i = questionCount;
  const builder = document.getElementById('questions-builder');
  const div = document.createElement('div');
  div.className = 'question-item';
  div.id = 'q-' + i;
  div.innerHTML = `
    <h4>Pregunta ${i} <button class="btn-remove-q" data-q="${i}">✕ Quitar</button></h4>
    <input type="text" id="q${i}-prompt" placeholder="Ej: ¿Cuánto es 3 + 4?">
    <div class="options-row">
      ${['A','B','C','D'].map(opt => `
        <div class="option-row-item">
          <label>${opt}</label>
          <input type="text" id="q${i}-opt-${opt}" placeholder="Respuesta ${opt}">
        </div>
      `).join('')}
    </div>
    <div class="correct-select">
      <label>Respuesta correcta:</label>
      <select id="q${i}-correct">
        <option value="A">A</option>
        <option value="B">B</option>
        <option value="C">C</option>
        <option value="D">D</option>
      </select>
    </div>
  `;
  div.querySelector('.btn-remove-q').addEventListener('click', () => div.remove());
  builder.appendChild(div);
}

document.getElementById('btn-create-exercise').addEventListener('click', async () => {
  const title = document.getElementById('exercise-title').value.trim();
  const type  = document.getElementById('exercise-type').value;
  const items = document.querySelectorAll('.question-item');

  if (!title)       return alert('Ingresa el título del ejercicio.');
  if (!items.length) return alert('Agrega al menos una pregunta.');

  const questions = [];
  let valid = true;
  items.forEach(item => {
    const qNum   = item.id.replace('q-', '');
    const prompt = document.getElementById('q' + qNum + '-prompt').value.trim();
    const options = {};
    ['A','B','C','D'].forEach(opt => {
      options[opt] = document.getElementById('q' + qNum + '-opt-' + opt).value.trim();
    });
    const correct = document.getElementById('q' + qNum + '-correct').value;
    if (!prompt || Object.values(options).some(v => !v)) valid = false;
    questions.push({ prompt, options, correct });
  });

  if (!valid) return alert('Completa todos los campos de las preguntas.');

  await apiPost('/api/exercises', { title, type, theme: selectedTheme, questions });
  document.getElementById('create-exercise-form').classList.add('hidden');
  document.getElementById('questions-builder').innerHTML = '';
  document.getElementById('exercise-title').value = '';
  questionCount = 0;
  setTheme('stars');
  await loadAll();
});

/* ═══════════════════════════════════════════════════════════
   ASIGNACIONES
═══════════════════════════════════════════════════════════ */
function fillAssignSelects() {
  const exSel = document.getElementById('assign-exercise-select');
  exSel.innerHTML = '<option value="">Seleccionar ejercicio...</option>';
  allExercises.forEach(e => {
    exSel.innerHTML += `<option value="${e.id}">${e.title}</option>`;
  });

  const clSel = document.getElementById('assign-classroom-select');
  clSel.innerHTML = '<option value="">Seleccionar aula...</option>';
  allClassrooms.forEach(c => {
    clSel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });

  const stSel = document.getElementById('assign-student-select');
  stSel.innerHTML = '<option value="">Seleccionar estudiante...</option>';
  allStudents.forEach(s => {
    stSel.innerHTML += `<option value="${s.id}">${s.display_name}</option>`;
  });
}

document.querySelectorAll('input[name="assign-target"]').forEach(r => {
  r.addEventListener('change', () => {
    const isCl = r.value === 'classroom';
    document.getElementById('assign-classroom-select').style.display = isCl ? '' : 'none';
    document.getElementById('assign-student-select').style.display   = isCl ? 'none' : '';
  });
});

document.getElementById('btn-assign').addEventListener('click', async () => {
  const exerciseId  = document.getElementById('assign-exercise-select').value;
  const target      = document.querySelector('input[name="assign-target"]:checked').value;
  const classroomId = document.getElementById('assign-classroom-select').value;
  const studentId   = document.getElementById('assign-student-select').value;
  const msg         = document.getElementById('assign-msg');
  msg.textContent = '';

  if (!exerciseId)                              return alert('Selecciona un ejercicio.');
  if (target === 'classroom' && !classroomId)   return alert('Selecciona un aula.');
  if (target === 'student'   && !studentId)     return alert('Selecciona un estudiante.');

  await apiPost('/api/assignments', {
    exerciseId:  parseInt(exerciseId),
    classroomId: target === 'classroom' ? parseInt(classroomId) : undefined,
    studentId:   target === 'student'   ? parseInt(studentId)   : undefined,
  });

  msg.textContent = '✅ Ejercicio asignado correctamente.';
  setTimeout(() => { msg.textContent = ''; }, 3000);
  await loadAssignmentsList();
  setText('ov-num-assignments', '…');
  apiGet('/api/assignments').then(list => setText('ov-num-assignments', list.length)).catch(() => {});
});

async function loadAssignmentsList() {
  const assignments = await apiGet('/api/assignments');
  const wrap = document.getElementById('assignments-list');
  if (!assignments.length) {
    wrap.innerHTML = '<p class="no-data">No hay asignaciones todavía.</p>';
    return;
  }
  wrap.innerHTML = `<table>
    <thead><tr>
      <th>Ejercicio</th><th>Destino</th><th>Fecha</th>
    </tr></thead>
    <tbody>
      ${assignments.map(a => `
        <tr>
          <td>${a.title}</td>
          <td>${a.classroom_name ? '🏫 ' + a.classroom_name : '👤 ' + (a.student_name || '—')}</td>
          <td>${new Date(a.assigned_at).toLocaleDateString('es')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>`;
}

/* ═══════════════════════════════════════════════════════════
   PROGRESO
═══════════════════════════════════════════════════════════ */
function fillProgressSelect() {
  const sel = document.getElementById('progress-classroom-select');
  sel.innerHTML = '<option value="">Seleccionar aula...</option>';
  allClassrooms.forEach(c => {
    sel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

document.getElementById('progress-classroom-select').addEventListener('change', loadProgress);

async function loadProgress() {
  const classroomId  = document.getElementById('progress-classroom-select').value;
  const summaryWrap  = document.getElementById('progress-summary-wrap');
  const tableWrap    = document.getElementById('progress-table-wrap');

  summaryWrap.innerHTML = '';
  tableWrap.innerHTML   = '';
  if (!classroomId) return;

  tableWrap.innerHTML = '<p class="no-data">Cargando datos...</p>';

  const data = await apiGet('/api/progress/classroom/' + classroomId);
  const { students, assignments, summary } = data;

  tableWrap.innerHTML = '';

  if (!students || !students.length) {
    tableWrap.innerHTML = '<p class="no-data">No hay estudiantes en esta aula.</p>';
    return;
  }
  if (!assignments || !assignments.length) {
    tableWrap.innerHTML = '<p class="no-data">No hay ejercicios asignados a esta aula.</p>';
    return;
  }

  // ── Resumen por ejercicio ─────────────────────────────────
  const exerciseStats = assignments.map(a => {
    let totalCorrect = 0, totalAnswered = 0, completedCount = 0;
    students.forEach(s => {
      const d = summary[s.id]?.[a.exercise_id];
      if (d && d.total > 0) {
        totalCorrect  += d.correct;
        totalAnswered += d.total;
        completedCount++;
      }
    });
    const avgScore = completedCount > 0
      ? Math.round((totalCorrect / totalAnswered) * 100)
      : null;
    return { ...a, avgScore, completedCount, totalStudents: students.length };
  });

  // Heading
  const sh = document.createElement('h3');
  sh.className   = 'progress-section-heading';
  sh.textContent = 'Rendimiento del aula por ejercicio';
  summaryWrap.appendChild(sh);

  // Cards grid
  const grid = document.createElement('div');
  grid.className = 'progress-ex-grid';

  exerciseStats.forEach(es => {
    const level         = getPerformanceLevel(es.avgScore);
    const completionPct = Math.round((es.completedCount / es.totalStudents) * 100);
    const typeLabel     = es.type === 'addition' ? '➕ Sumas' : '➖ Restas';
    const card = document.createElement('div');
    card.className = 'progress-ex-card' + (es.type === 'subtraction' ? ' subtraction' : '');
    card.innerHTML = `
      <span class="pec-type-badge ${es.type}">${typeLabel}</span>
      <div class="pec-title">${es.title}</div>
      <div class="pec-avg-row">
        <span class="pec-avg perf-${level.cls}">${es.avgScore !== null ? es.avgScore + '%' : '—'}</span>
        <span class="perf-badge perf-${level.cls}">${level.label}</span>
      </div>
      <div class="pec-bar-track">
        <div class="pec-bar-fill" style="width:0%" data-w="${completionPct}"></div>
      </div>
      <div class="pec-completion">${es.completedCount} / ${es.totalStudents} completaron</div>
    `;
    grid.appendChild(card);
  });
  summaryWrap.appendChild(grid);

  // Animate bars
  requestAnimationFrame(() => requestAnimationFrame(() => {
    summaryWrap.querySelectorAll('.pec-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.w + '%';
    });
  }));

  // ── Detalle por estudiante ────────────────────────────────
  const th = document.createElement('h3');
  th.className   = 'progress-section-heading';
  th.textContent = 'Detalle por estudiante';
  tableWrap.appendChild(th);

  const studentStats = students.map(s => {
    let totalCorrect = 0, totalAnswered = 0, completed = 0;
    assignments.forEach(a => {
      const d = summary[s.id]?.[a.exercise_id];
      if (d && d.total > 0) {
        totalCorrect  += d.correct;
        totalAnswered += d.total;
        completed++;
      }
    });
    const avgPct = totalAnswered > 0
      ? Math.round((totalCorrect / totalAnswered) * 100)
      : null;
    return { ...s, totalCorrect, totalAnswered, completed, avgPct };
  });

  let html = `<div class="progress-table-scroll"><table class="progress-table">
    <thead><tr>
      <th>Estudiante</th>
      <th>Rendimiento</th>
      <th>Precisión</th>
      <th>Completados</th>
      ${assignments.map(a => `<th title="${a.title}">${truncate(a.title, 14)}</th>`).join('')}
    </tr></thead>
    <tbody>`;

  studentStats.forEach(s => {
    const level  = getPerformanceLevel(s.avgPct);
    const accTxt = s.avgPct !== null ? s.avgPct + '%' : '—';
    const accCls = s.avgPct !== null
      ? (s.avgPct >= 80 ? 'score-high' : s.avgPct >= 50 ? 'score-mid' : 'score-low') : '';

    html += `<tr>
      <td class="student-name-cell">${s.display_name}</td>
      <td><span class="perf-badge perf-${level.cls}">${level.label}</span></td>
      <td class="accuracy-cell ${accCls}">${accTxt}</td>
      <td style="text-align:center;color:var(--ink-2)">${s.completed} / ${assignments.length}</td>
      ${assignments.map(a => {
        const d = summary[s.id]?.[a.exercise_id];
        if (!d || d.total === 0) return `<td class="score-empty">—</td>`;
        const pct = Math.round((d.correct / d.total) * 100);
        const cls = pct >= 80 ? 'score-high' : pct >= 50 ? 'score-mid' : 'score-low';
        return `<td class="score-cell ${cls}" title="${d.correct}/${d.total} correctas">${pct}%</td>`;
      }).join('')}
    </tr>`;
  });

  html += '</tbody></table></div>';

  const tableDiv = document.createElement('div');
  tableDiv.innerHTML = html;
  tableWrap.appendChild(tableDiv);
}

/* ═══════════════════════════════════════════════════════════
   INIT — verificar sesión activa
═══════════════════════════════════════════════════════════ */
(async () => {
  try {
    currentTeacher = await apiGet('/api/auth/me');
    if (currentTeacher.role !== 'teacher') return;
    updateTeacherUI();
    await loadAll();
    showScreen('screen-dashboard');
    showTab('overview');
    initLiveFeed();
  } catch (_) {
    showScreen('screen-login');
  }
})();
