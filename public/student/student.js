/* ═══════════════════════════════════════════════════════════
   SISTEMA DE NIVELES
═══════════════════════════════════════════════════════════ */
const LEVELS = [
  { num:1, name:'Aprendiz',    xpNeeded:0,    nextXp:100,  color:'#71717A' },
  { num:2, name:'Explorador',  xpNeeded:100,  nextXp:300,  color:'#3B82F6' },
  { num:3, name:'Calculador',  xpNeeded:300,  nextXp:600,  color:'#10B981' },
  { num:4, name:'Maestro',     xpNeeded:600,  nextXp:1000, color:'#F59E0B' },
  { num:5, name:'Genio',       xpNeeded:1000, nextXp:null, color:'#8B5CF6' },
];

function getLevel(xp) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpNeeded) return LEVELS[i];
  }
  return LEVELS[0];
}

/* ═══════════════════════════════════════════════════════════
   SISTEMA DE LOGROS
═══════════════════════════════════════════════════════════ */
const ACHIEVEMENTS = [
  {
    id:'first_step', icon:'⭐', label:'Primeros pasos',
    desc:'Responde tu primera pregunta',
    check: s => s.total_answered >= 1,
  },
  {
    id:'on_fire', icon:'🔥', label:'En llamas',
    desc:'3 respuestas correctas seguidas',
    check: s => s.streak >= 3,
  },
  {
    id:'sharp_eye', icon:'🎯', label:'Ojo agudo',
    desc:'80% o mas de aciertos',
    check: s => s.accuracy >= 80 && s.total_answered >= 5,
  },
  {
    id:'perfectionist', icon:'💎', label:'Perfeccionista',
    desc:'Ejercicio con 100% de aciertos',
    check: s => s.exercises_perfect >= 1,
  },
  {
    id:'all_rounder', icon:'🏆', label:'Todoterreno',
    desc:'Practica sumas y restas',
    check: s => (s.types?.addition || 0) >= 1 && (s.types?.subtraction || 0) >= 1,
  },
  {
    id:'veteran', icon:'🎖', label:'Veterano',
    desc:'Completa 5 ejercicios',
    check: s => s.exercises_completed >= 5,
  },
];

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setHtml(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = val;
}

/* ═══════════════════════════════════════════════════════════
   TEMAS VISUALES
═══════════════════════════════════════════════════════════ */
const THEMES = {
  stars:       { emoji:'⭐', addStory:(a,b)=>`${a} estrellas brillan en el cielo y aparecen ${b} más`,       subStory:(a,b)=>`Hay ${a} estrellas, pero ${b} se apagan`,              addQ:'¿Cuántas estrellas hay en total?',          subQ:'¿Cuántas estrellas quedan?' },
  dinosaurs:   { emoji:'🦕', addStory:(a,b)=>`${a} dinosaurios juegan en el bosque y llegan ${b} más`,       subStory:(a,b)=>`Hay ${a} dinosaurios, pero ${b} se van a dormir`,      addQ:'¿Cuántos dinosaurios hay en total?',         subQ:'¿Cuántos dinosaurios quedan?' },
  fruits:      { emoji:'🍎', addStory:(a,b)=>`Tienes ${a} manzanas en tu cesta y te dan ${b} más`,           subStory:(a,b)=>`Tienes ${a} manzanas en tu cesta y te comes ${b}`,     addQ:'¿Cuántas manzanas tienes en total?',         subQ:'¿Cuántas manzanas te quedan?' },
  rockets:     { emoji:'🚀', addStory:(a,b)=>`${a} cohetes esperan en la base y llegan ${b} más`,            subStory:(a,b)=>`Hay ${a} cohetes en la base y ${b} despegan`,          addQ:'¿Cuántos cohetes hay en total?',             subQ:'¿Cuántos cohetes quedan en la base?' },
  fish:        { emoji:'🐟', addStory:(a,b)=>`${a} peces nadan en el lago y llegan ${b} más`,                subStory:(a,b)=>`Hay ${a} peces en el lago y ${b} nadan lejos`,         addQ:'¿Cuántos peces hay en total?',               subQ:'¿Cuántos peces quedan en el lago?' },
  candy:       { emoji:'🍬', addStory:(a,b)=>`Tienes ${a} dulces y te regalan ${b} más`,                    subStory:(a,b)=>`Tienes ${a} dulces y te comes ${b}`,                  addQ:'¿Cuántos dulces tienes en total?',           subQ:'¿Cuántos dulces te quedan?' },
  butterflies: { emoji:'🦋', addStory:(a,b)=>`${a} mariposas vuelan en el jardín y llegan ${b} más`,        subStory:(a,b)=>`Hay ${a} mariposas en el jardín y ${b} se van volando`,addQ:'¿Cuántas mariposas hay en total?',           subQ:'¿Cuántas mariposas quedan?' },
  balloons:    { emoji:'🎈', addStory:(a,b)=>`Tienes ${a} globos de colores y te dan ${b} más`,              subStory:(a,b)=>`Tienes ${a} globos y se escapan ${b}`,                addQ:'¿Cuántos globos tienes en total?',           subQ:'¿Cuántos globos te quedan?' },
  robots:      { emoji:'🤖', addStory:(a,b)=>`${a} robots trabajan en la fábrica y llegan ${b} más`,        subStory:(a,b)=>`Hay ${a} robots en la fábrica y ${b} se apagan`,      addQ:'¿Cuántos robots hay en total?',              subQ:'¿Cuántos robots siguen activos?' },
  flowers:     { emoji:'🌸', addStory:(a,b)=>`${a} flores crecen en el jardín y nacen ${b} más`,            subStory:(a,b)=>`Hay ${a} flores en el jardín y ${b} se marchitan`,    addQ:'¿Cuántas flores hay en total?',              subQ:'¿Cuántas flores quedan?' },
};

/* ═══════════════════════════════════════════════════════════
   ESTADO
═══════════════════════════════════════════════════════════ */
let currentUser       = null;
let assignments       = [];
let progressData      = [];
let currentAssignment = null;
let currentExercise   = null;
let currentQuestionIndex = 0;
let correctCount      = 0;
let answering         = false;
let serialPort        = null;
let serialReader      = null;

/* ═══════════════════════════════════════════════════════════
   PANTALLAS
═══════════════════════════════════════════════════════════ */
const SCREENS = ['login','exercises','exercise','result'];

function showScreen(name) {
  SCREENS.forEach(id => {
    const el = document.getElementById('screen-' + id);
    if (el) el.classList.toggle('active', id === name);
  });
}

/* ═══════════════════════════════════════════════════════════
   TABS / NAVEGACIÓN
═══════════════════════════════════════════════════════════ */
const TABS = ['home','exercises','achievements','history','profile'];

function switchTab(tabId) {
  if (!TABS.includes(tabId)) return;

  document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabId);
  });
  document.querySelectorAll('.bnav-item[data-tab]').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach(el => {
    el.classList.toggle('active', el.id === 'tab-' + tabId);
  });

  // Scroll main area to top when switching tabs
  const mainArea = document.getElementById('main-area');
  if (mainArea) mainArea.scrollTop = 0;
}

document.querySelectorAll('.nav-item[data-tab], .bnav-item[data-tab]').forEach(el => {
  el.addEventListener('click', () => switchTab(el.dataset.tab));
});

document.querySelectorAll('[data-nav-to]').forEach(el => {
  el.addEventListener('click', () => switchTab(el.dataset.navTo));
});

/* ═══════════════════════════════════════════════════════════
   LOGIN / LOGOUT
═══════════════════════════════════════════════════════════ */
/* ─── Login ↔ Register toggle ───────────────────────────── */
document.getElementById('btn-to-register').addEventListener('click', () => {
  document.getElementById('login-pane').classList.add('hidden');
  document.getElementById('register-pane').classList.remove('hidden');
});
document.getElementById('btn-to-login').addEventListener('click', () => {
  document.getElementById('register-pane').classList.add('hidden');
  document.getElementById('login-pane').classList.remove('hidden');
});
document.getElementById('btn-register').addEventListener('click', registerStudent);
document.getElementById('reg-password').addEventListener('keydown', e => { if (e.key === 'Enter') registerStudent(); });

document.getElementById('btn-login').addEventListener('click', login);
document.getElementById('login-password').addEventListener('keydown', e => { if (e.key==='Enter') login(); });

async function registerStudent() {
  const displayName = document.getElementById('reg-displayname').value.trim();
  const username    = document.getElementById('reg-username').value.trim();
  const password    = document.getElementById('reg-password').value;
  const errEl       = document.getElementById('register-error');
  errEl.textContent = '';

  if (!displayName || !username || !password) {
    errEl.textContent = 'Completa todos los campos.';
    return;
  }
  try {
    currentUser = await apiPost('/api/auth/register', {
      username, password, displayName, role: 'student',
    });
    if (currentUser.role !== 'student') {
      errEl.textContent = 'Error en el registro.';
      return;
    }
    updateUserUI();
    await loadDashboard();
    switchTab('home');
    showScreen('exercises');
  } catch(e) { errEl.textContent = e.message; }
}

async function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.textContent = '';
  try {
    currentUser = await apiPost('/api/auth/login', { username, password });
    if (currentUser.role !== 'student') {
      errEl.textContent = 'Esta pagina es solo para estudiantes.';
      return;
    }
    updateUserUI();
    await loadDashboard();
    switchTab('home');
    showScreen('exercises');
  } catch(e) { errEl.textContent = e.message; }
}

document.getElementById('btn-logout').addEventListener('click', async () => {
  await apiPost('/api/auth/logout', {});
  currentUser = null;
  switchTab('home');
  showScreen('login');
});

/* ═══════════════════════════════════════════════════════════
   ACTUALIZAR UI DE USUARIO (sidebar + perfil)
═══════════════════════════════════════════════════════════ */
function updateUserUI() {
  if (!currentUser) return;
  const name = currentUser.displayName || 'Estudiante';
  const initials = name[0].toUpperCase();

  // Sidebar
  const navAvatar = document.getElementById('nav-avatar');
  const navName   = document.getElementById('nav-name');
  if (navAvatar) navAvatar.textContent = initials;
  if (navName)   navName.textContent   = name;

  // Profile tab — fill edit form too
  const profileAvatar = document.getElementById('profile-avatar');
  const profileDN     = document.getElementById('profile-display-name');
  const profileUN     = document.getElementById('profile-username');
  const editDN        = document.getElementById('edit-display-name');
  if (profileAvatar) profileAvatar.textContent = initials;
  if (profileDN)     profileDN.textContent     = name;
  if (profileUN)     profileUN.textContent     = '@' + (currentUser.username || currentUser.displayName || 'usuario');
  if (editDN)        editDN.value              = name;
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD: carga paralela de todos los datos
═══════════════════════════════════════════════════════════ */
async function loadDashboard() {
  const [r1, r2, r3] = await Promise.allSettled([
    apiGet('/api/assignments/mine'),
    apiGet('/api/progress/mine'),
    apiGet('/api/progress/mine/stats'),
  ]);
  const asgs  = r1.status === 'fulfilled' ? r1.value : [];
  const prog  = r2.status === 'fulfilled' ? r2.value : [];
  const stats = r3.status === 'fulfilled' ? r3.value : {};

  assignments  = asgs;
  progressData = prog;

  renderHero(stats);
  renderStats(stats);
  renderAchievements(stats);
  renderPendingExercises(asgs, prog);
  renderHistory(prog);
  renderProfile(stats);
}

/* ─── HERO ─────────────────────────────────────────────── */
function renderHero(stats) {
  const xp    = stats.xp || 0;
  const level = getLevel(xp);

  // Level color CSS var on hero, orb, sidebar elements, profile elements
  const colorTargets = [
    document.getElementById('hero-panel'),
    document.getElementById('hero-orb'),
    document.getElementById('nav-avatar'),
    document.getElementById('profile-avatar'),
    document.getElementById('profile-level-ring'),
  ];
  colorTargets.forEach(el => el && el.style.setProperty('--level-color', level.color));

  setText('hero-greeting', 'Hola, ' + (currentUser?.displayName || 'estudiante') + '!');
  setText('level-pill',      'Nivel ' + level.num);
  setText('level-name-txt',  level.name);
  setText('orb-num',         level.num);

  // Sidebar level
  const navLevel = document.getElementById('nav-level');
  if (navLevel) navLevel.textContent = 'Nivel ' + level.num + ' · ' + level.name;

  // XP bar
  let pct = 0;
  let caption = '';
  if (level.nextXp) {
    const fromPrev = xp - level.xpNeeded;
    const range    = level.nextXp - level.xpNeeded;
    pct     = Math.min(100, Math.round((fromPrev / range) * 100));
    const next = LEVELS.find(l => l.xpNeeded === level.nextXp);
    caption = xp + ' / ' + level.nextXp + ' XP para ' + (next?.name || 'siguiente nivel');
  } else {
    pct     = 100;
    caption = xp + ' XP — Nivel maximo alcanzado!';
  }

  setTimeout(() => {
    const fill = document.getElementById('xp-fill');
    if (fill) fill.style.width = pct + '%';
  }, 120);

  setText('xp-caption', caption);
}

/* ─── STATS ─────────────────────────────────────────────── */
function renderStats(stats) {
  const accuracy = stats.accuracy || 0;
  const total    = stats.total_answered || 0;
  const correct  = stats.total_correct  || 0;

  setTimeout(() => {
    const arc  = document.getElementById('accuracy-arc');
    const circ = 226.2;
    if (arc) arc.style.strokeDashoffset = circ * (1 - accuracy / 100);
  }, 200);

  setText('accuracy-value', total > 0 ? accuracy : '—');
  setText('correct-sub',
    total > 0
      ? correct + ' de ' + total + ' respuestas'
      : 'sin respuestas aun');

  setText('stat-completed', stats.exercises_completed || 0);
  setText('stat-streak',    stats.streak || 0);
  setText('stat-perfect',   stats.exercises_perfect || 0);
}

/* ─── LOGROS ────────────────────────────────────────────── */
function renderAchievements(stats) {
  const row = document.getElementById('achievements-row');
  if (!row) return;
  row.innerHTML = '';

  const sorted = [...ACHIEVEMENTS].sort((a, b) => {
    const ua = a.check(stats), ub = b.check(stats);
    return (ub ? 1 : 0) - (ua ? 1 : 0);
  });

  sorted.forEach((ach, i) => {
    const unlocked = ach.check(stats);
    const chip = document.createElement('div');
    chip.className = 'achievement-chip ' + (unlocked ? 'unlocked' : 'locked');
    chip.style.animationDelay = (i * 60) + 'ms';
    chip.innerHTML = `
      <span class="ach-icon">${ach.icon}</span>
      <span class="ach-label">${ach.label}</span>
      <span class="ach-desc">${ach.desc}</span>
      <span class="ach-status ${unlocked ? 'done' : 'locked'}">
        ${unlocked ? 'Completado' : 'Bloqueado'}
      </span>
    `;
    row.appendChild(chip);
  });
}

/* ─── EJERCICIOS PENDIENTES ─────────────────────────────── */
function renderPendingExercises(asgs, prog) {
  const startedIds = new Set(prog.filter(p => parseInt(p.answered) > 0).map(p => p.exercise_id));
  const pending    = asgs.filter(a => !startedIds.has(a.exercise_id));

  // Full exercises tab
  const grid   = document.getElementById('exercises-list');
  const noMsg  = document.getElementById('no-exercises');
  const chip   = document.getElementById('pending-count');

  if (grid) grid.innerHTML = '';
  if (chip) chip.textContent = pending.length;

  // Nav badge
  const badge = document.getElementById('nav-badge-exercises');
  if (badge) {
    badge.textContent = pending.length;
    badge.classList.toggle('hidden', pending.length === 0);
  }

  if (noMsg) noMsg.style.display = pending.length === 0 ? 'block' : 'none';

  if (grid && pending.length > 0) {
    pending.forEach((a, i) => grid.appendChild(makeExerciseCard(a, i)));
  }

  // Home tab preview (first 3)
  const preview     = document.getElementById('home-exercises-preview');
  const homeNoMsg   = document.getElementById('home-no-exercises');
  const homeChip    = document.getElementById('home-pending-count');
  if (homeChip) homeChip.textContent = pending.length;
  if (preview) {
    preview.innerHTML = '';
    if (pending.length === 0) {
      if (homeNoMsg) homeNoMsg.style.display = 'block';
    } else {
      if (homeNoMsg) homeNoMsg.style.display = 'none';
      pending.slice(0, 3).forEach((a, i) => {
        preview.appendChild(makeExerciseCard(a, i));
      });
    }
  }
}

function makeExerciseCard(a, i) {
  const card = document.createElement('div');
  card.className = 'exercise-card' + (a.type === 'subtraction' ? ' subtraction' : '');
  card.style.animationDelay = (i * 80) + 'ms';
  card.innerHTML = `
    <h3>${a.title}</h3>
    <span class="type-badge">${a.type === 'addition' ? 'Sumas' : 'Restas'}</span>
    <div class="card-cta">Comenzar</div>
  `;
  card.addEventListener('click', () => startExercise(a));
  return card;
}

/* ─── HISTORIAL ─────────────────────────────────────────── */
function renderHistory(prog) {
  const done  = prog.filter(p => parseInt(p.answered) > 0);
  const list  = document.getElementById('history-list');
  const chip  = document.getElementById('history-count');
  if (chip) chip.textContent = done.length;

  // Nav badge
  const badge = document.getElementById('nav-badge-history');
  if (badge) {
    badge.textContent = done.length;
    badge.classList.toggle('hidden', done.length === 0);
  }

  if (!list) return;

  if (done.length === 0) {
    list.innerHTML = '<p class="empty-msg-sm">Aun no has completado ejercicios.</p>';
    return;
  }

  list.innerHTML = '';
  done.forEach((p, i) => {
    const total  = parseInt(p.answered) || 0;
    const corr   = parseInt(p.correct)  || 0;
    const pct    = total > 0 ? Math.round((corr / total) * 100) : 0;
    const grade  = pct >= 80 ? 'high' : pct >= 50 ? 'mid' : 'low';

    const item = document.createElement('div');
    item.className = 'history-item';
    item.style.animationDelay = (i * 60) + 'ms';
    item.innerHTML = `
      <div>
        <div class="history-title">${p.title}</div>
        <div class="history-meta">${p.type === 'addition' ? 'Sumas' : 'Restas'} &bull; ${corr} / ${total} correctas</div>
      </div>
      <div class="history-score-wrap">
        <span class="history-pct ${grade}">${pct}%</span>
        <div class="history-bar-track">
          <div class="history-bar-fill ${grade}" style="width:0%"
               data-pct="${pct}"></div>
        </div>
      </div>
    `;
    list.appendChild(item);
  });

  setTimeout(() => {
    list.querySelectorAll('.history-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%';
    });
  }, 80);
}

/* ─── PERFIL ─────────────────────────────────────────────── */
function renderProfile(stats) {
  const xp    = stats.xp || 0;
  const level = getLevel(xp);

  // Avatar + level color
  const profileAvatar = document.getElementById('profile-avatar');
  const levelRing     = document.getElementById('profile-level-ring');
  const name = currentUser?.displayName || 'Estudiante';
  if (profileAvatar) {
    profileAvatar.textContent = name[0].toUpperCase();
    profileAvatar.style.setProperty('--level-color', level.color);
    profileAvatar.style.background = level.color;
  }
  if (levelRing) {
    levelRing.textContent    = level.num;
    levelRing.style.background = level.color;
  }

  const profileLevelTag = document.getElementById('profile-level-tag');
  if (profileLevelTag) profileLevelTag.textContent = level.name;

  // XP bar on profile card
  let pct = 0;
  let caption = xp + ' XP';
  if (level.nextXp) {
    const fromPrev = xp - level.xpNeeded;
    const range    = level.nextXp - level.xpNeeded;
    pct     = Math.min(100, Math.round((fromPrev / range) * 100));
    caption = xp + ' / ' + level.nextXp + ' XP';
  } else {
    pct = 100;
    caption = xp + ' XP — Maximo!';
  }
  setTimeout(() => {
    const fill = document.getElementById('profile-xp-fill');
    if (fill) {
      fill.style.setProperty('--level-color', level.color);
      fill.style.width = pct + '%';
    }
  }, 150);
  const profileXpCaption = document.getElementById('profile-xp-caption');
  if (profileXpCaption) profileXpCaption.textContent = caption;

  // Stats
  const accuracy = stats.accuracy || 0;
  const total    = stats.total_answered || 0;
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl('pstat-xp',        xp);
  setEl('pstat-completed', stats.exercises_completed || 0);
  setEl('pstat-accuracy',  total > 0 ? accuracy + '%' : '—%');
  setEl('pstat-streak',    stats.streak || 0);
  setEl('pstat-perfect',   stats.exercises_perfect || 0);
}

/* ─── GUARDAR PERFIL ─────────────────────────────────────── */
document.getElementById('btn-save-profile').addEventListener('click', async () => {
  const displayName     = document.getElementById('edit-display-name').value.trim();
  const currentPassword = document.getElementById('edit-current-password').value;
  const newPassword     = document.getElementById('edit-new-password').value;
  const msgEl           = document.getElementById('profile-save-msg');

  msgEl.textContent = '';
  msgEl.className = 'save-msg';

  if (!displayName) {
    msgEl.textContent = 'El nombre no puede estar vacio.';
    msgEl.className = 'save-msg error';
    return;
  }

  const payload = { displayName };
  if (newPassword) {
    if (!currentPassword) {
      msgEl.textContent = 'Escribe tu contrasena actual para cambiarla.';
      msgEl.className = 'save-msg error';
      return;
    }
    payload.currentPassword = currentPassword;
    payload.newPassword     = newPassword;
  }

  try {
    const updated = await apiPost('/api/auth/profile', payload);
    if (currentUser) {
      currentUser.displayName = updated.displayName || displayName;
    }
    updateUserUI();
    msgEl.textContent = 'Cambios guardados correctamente.';
    msgEl.className = 'save-msg success';
    document.getElementById('edit-current-password').value = '';
    document.getElementById('edit-new-password').value     = '';
  } catch(e) {
    msgEl.textContent = 'Error: ' + e.message;
    msgEl.className = 'save-msg error';
  }
});

/* ═══════════════════════════════════════════════════════════
   INICIAR EJERCICIO
═══════════════════════════════════════════════════════════ */
document.getElementById('btn-back').addEventListener('click', () => {
  stopSerial();
  loadDashboard();
  showScreen('exercises');
});

async function startExercise(assignment) {
  currentAssignment      = assignment;
  currentExercise        = await apiGet('/api/exercises/' + assignment.exercise_id);
  currentQuestionIndex   = 0;
  correctCount           = 0;
  document.getElementById('exercise-title').textContent = currentExercise.title;
  renderQuestion();
  showScreen('exercise');
}

/* ═══════════════════════════════════════════════════════════
   RENDER PREGUNTA
═══════════════════════════════════════════════════════════ */
function renderQuestion() {
  const questions = currentExercise.questions;
  const q = questions[currentQuestionIndex];
  if (!q) return;
  answering = false;

  const total = questions.length;
  document.getElementById('progress-bar').style.width = (currentQuestionIndex / total * 100) + '%';
  document.getElementById('progress-text').textContent = (currentQuestionIndex + 1) + ' / ' + total;

  // Try to render visual scene from theme + parsed numbers
  const match  = q.prompt.match(/(\d+)\s*([+\-])\s*(\d+)/);
  const theme  = currentExercise.theme;
  const t      = THEMES[theme];

  if (match && t) {
    const a   = parseInt(match[1]);
    const op  = match[2];
    const b   = parseInt(match[3]);
    const add = op === '+';
    document.getElementById('question-prompt').textContent = add ? t.addStory(a, b) + '...' : t.subStory(a, b) + '...';
    document.getElementById('question-sub').textContent    = add ? t.addQ : t.subQ;
    renderVisualScene(t.emoji, add ? 'addition' : 'subtraction', a, b);
  } else {
    document.getElementById('question-prompt').textContent = q.prompt;
    document.getElementById('question-sub').textContent    = '';
    document.getElementById('visual-scene').innerHTML      = '';
  }

  ['A','B','C','D'].forEach((opt, i) => {
    const btn = document.getElementById('opt-' + opt);
    btn.disabled = false;
    btn.classList.remove('visible');
    document.getElementById('opt-' + opt + '-text').textContent = q.options[opt];
    void btn.offsetWidth;
    btn.style.animationDelay = (i * 80) + 'ms';
    btn.classList.add('visible');
  });

  hideFeedback();
}

function renderVisualScene(emoji, type, a, b) {
  const scene = document.getElementById('visual-scene');
  const MAX   = 10; // max emojis per group before compact mode

  function spans(count, cls) {
    return Array.from({ length: count }, (_, i) =>
      `<span class="vs-emoji ${cls}" style="animation-delay:${i * 45}ms">${emoji}</span>`
    ).join('');
  }

  function compact(count, cls) {
    return `<div class="vs-compact ${cls}"><span class="vs-ce">${emoji}</span><span class="vs-cn">×${count}</span></div>`;
  }

  if (type === 'addition') {
    const aHtml = a <= MAX ? `<div class="vs-group">${spans(a, '')}</div>` : compact(a, '');
    const bHtml = b <= MAX ? `<div class="vs-group">${spans(b, '')}</div>` : compact(b, '');
    scene.innerHTML = `${aHtml}<div class="vs-op">+</div>${bHtml}`;
  } else {
    const keep = a - b;
    if (a <= MAX) {
      scene.innerHTML = `<div class="vs-group">${spans(Math.max(keep,0), 'vs-keep')}${spans(Math.max(b,0), 'vs-going')}</div>`;
    } else {
      scene.innerHTML = `${compact(a,'vs-keep')}<div class="vs-op">−</div>${compact(b,'vs-going')}`;
    }
  }
}

function hideFeedback() {
  const fb = document.getElementById('feedback');
  fb.className = 'feedback hidden';
  fb.textContent = '';
}

/* ═══════════════════════════════════════════════════════════
   RESPONDER
═══════════════════════════════════════════════════════════ */
document.querySelectorAll('.option-btn').forEach(btn => {
  btn.addEventListener('click', () => answer(btn.dataset.opt));
});

async function answer(opt) {
  if (answering) return;
  answering = true;

  document.querySelectorAll('.option-btn').forEach(b => b.disabled = true);

  try {
    const result = await apiPost('/api/answers', {
      assignmentId:  currentAssignment.id,
      questionIndex: currentQuestionIndex,
      answer:        opt,
    });

    if (result.isCorrect) correctCount++;

    // Feedback en LEDs del Arduino
    sendToArduino(result.isCorrect ? 'GREEN' : 'RED');

    const fb = document.getElementById('feedback');
    if (result.isCorrect) {
      fb.className  = 'feedback correct';
      fb.textContent = 'Correcto! Muy bien!';
    } else {
      fb.className  = 'feedback wrong';
      fb.textContent = 'Incorrecto. La respuesta era ' + result.correct;
    }

    const total = currentExercise.questions.length;
    setTimeout(() => {
      currentQuestionIndex++;
      if (currentQuestionIndex >= total) showResult(correctCount, total);
      else renderQuestion();
    }, 1800);

  } catch(e) {
    answering = false;
    document.querySelectorAll('.option-btn').forEach(b => b.disabled = false);
    alert('Error al enviar respuesta: ' + e.message);
  }
}

/* ═══════════════════════════════════════════════════════════
   RESULTADO FINAL
═══════════════════════════════════════════════════════════ */
function showResult(correct, total) {
  const pct  = Math.round((correct / total) * 100);
  const xpEarned = correct * 10;

  let emoji = '📚';
  let title = 'Sigue practicando!';
  if (pct >= 100) { emoji = '🏆'; title = 'Perfecto!'; }
  else if (pct >= 80) { emoji = '🎉'; title = 'Excelente!'; }
  else if (pct >= 50) { emoji = '😊'; title = 'Buen trabajo!'; }

  document.getElementById('result-emoji').textContent  = emoji;
  document.getElementById('result-title').textContent  = title;
  document.getElementById('result-score').textContent  =
    correct + ' de ' + total + ' correctas (' + pct + '%)';

  const xpEl = document.getElementById('result-xp-gain');
  xpEl.textContent = '+' + xpEarned + ' XP ganados';
  xpEl.style.display = xpEarned > 0 ? 'inline-flex' : 'none';

  document.getElementById('progress-bar').style.width = '100%';
  showScreen('result');
}

document.getElementById('btn-next-exercise').addEventListener('click', async () => {
  await loadDashboard();
  switchTab('home');
  showScreen('exercises');
});

/* ═══════════════════════════════════════════════════════════
   WEB SERIAL API
═══════════════════════════════════════════════════════════ */
document.getElementById('btn-connect').addEventListener('click', connectArduino);

async function connectArduino() {
  if (!('serial' in navigator)) {
    alert('Tu navegador no soporta Web Serial.\nUsa Google Chrome o Microsoft Edge.');
    return;
  }
  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 9600 });
    updateArduinoStatus(true);
    document.getElementById('btn-connect').style.display = 'none';
    readSerial();
  } catch(e) {
    if (e.name !== 'NotFoundError') alert('No se pudo conectar al Arduino: ' + e.message);
  }
}

async function readSerial() {
  const decoder = new TextDecoderStream();
  serialPort.readable.pipeTo(decoder.writable);
  serialReader = decoder.readable.getReader();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await serialReader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        const btn = line.trim().toUpperCase();
        if (['A','B','C','D'].includes(btn)) answer(btn);
      }
    }
  } catch(_) {}
  finally {
    updateArduinoStatus(false);
    document.getElementById('btn-connect').style.display = '';
  }
}

async function sendToArduino(msg) {
  if (!serialPort || !serialPort.writable) return;
  try {
    const writer = serialPort.writable.getWriter();
    await writer.write(new TextEncoder().encode(msg + '\n'));
    writer.releaseLock();
  } catch(_) {}
}

async function stopSerial() {
  if (serialReader) { try { await serialReader.cancel(); } catch(_) {} }
  if (serialPort)   { try { await serialPort.close();    } catch(_) {} }
  serialReader = null;
  serialPort   = null;
  updateArduinoStatus(false);
}

function updateArduinoStatus(connected) {
  const el = document.getElementById('arduino-status');
  el.className = 'arduino-status ' + (connected ? 'connected' : 'disconnected');
  el.innerHTML = '<span class="dot"></span> Arduino ' + (connected ? 'conectado' : 'desconectado');
}

/* ═══════════════════════════════════════════════════════════
   INIT: verificar sesion activa
═══════════════════════════════════════════════════════════ */
(async () => {
  try {
    currentUser = await apiGet('/api/auth/me');
    if (currentUser.role !== 'student') { currentUser = null; return; }
    updateUserUI();
    await loadDashboard();
    switchTab('home');
    showScreen('exercises');
  } catch(_) {
    showScreen('login');
  }
})();
