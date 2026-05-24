require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const { pool, init } = require('./db');

const app = express();

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const isProd = process.env.NODE_ENV === 'production';
app.use(session({
  store: new pgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'dev_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, secure: isProd, sameSite: isProd ? 'none' : 'lax' },
}));

// Rutas API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/classrooms', require('./routes/classrooms'));
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/progress', require('./routes/progress'));

const { router: answersRouter } = require('./routes/answers');
app.use('/api/answers', answersRouter);

// Redirigir raíz al dashboard del profesor o del estudiante
app.get('/', (req, res) => res.redirect('/teacher/'));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '..', 'public')));

// SPA fallback para rutas de teacher y student
app.get('/teacher/*', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'teacher', 'index.html'))
);
app.get('/student/*', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'student', 'index.html'))
);

// Rutas API no encontradas → JSON 404 (evita que Express devuelva HTML)
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada: ' + req.originalUrl });
});

// Manejador global de errores → siempre devuelve JSON para rutas /api
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack || err.message);
  if (req.path.startsWith('/api')) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
  res.status(500).send('Error interno del servidor');
});

const PORT = process.env.PORT || 3000;

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
      console.log('  Profesor:   http://localhost:' + PORT + '/teacher/');
      console.log('  Estudiante: http://localhost:' + PORT + '/student/');
    });
  })
  .catch(err => {
    console.error('Error al inicializar la base de datos:', err.message);
    console.error('Verifica las credenciales en el archivo .env');
    process.exit(1);
  });
