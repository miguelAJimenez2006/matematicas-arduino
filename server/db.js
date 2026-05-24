require('dotenv').config();
const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host:     process.env.DB_HOST || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'arduino_edu',
      user:     process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || '',
    });

async function init() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           SERIAL PRIMARY KEY,
        username     TEXT NOT NULL UNIQUE,
        password     TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role         TEXT NOT NULL CHECK(role IN ('teacher','student'))
      );

      CREATE TABLE IF NOT EXISTS classrooms (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        teacher_id INTEGER NOT NULL REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS classroom_students (
        classroom_id INTEGER NOT NULL REFERENCES classrooms(id),
        student_id   INTEGER NOT NULL REFERENCES users(id),
        PRIMARY KEY (classroom_id, student_id)
      );

      CREATE TABLE IF NOT EXISTS exercises (
        id         SERIAL PRIMARY KEY,
        title      TEXT NOT NULL,
        type       TEXT NOT NULL CHECK(type IN ('addition','subtraction')),
        theme      TEXT NOT NULL DEFAULT 'stars',
        questions  JSONB NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS assignments (
        id           SERIAL PRIMARY KEY,
        exercise_id  INTEGER NOT NULL REFERENCES exercises(id),
        student_id   INTEGER REFERENCES users(id),
        classroom_id INTEGER REFERENCES classrooms(id),
        assigned_by  INTEGER NOT NULL REFERENCES users(id),
        assigned_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS results (
        id             SERIAL PRIMARY KEY,
        assignment_id  INTEGER NOT NULL REFERENCES assignments(id),
        student_id     INTEGER NOT NULL REFERENCES users(id),
        question_index INTEGER NOT NULL,
        answer_given   TEXT NOT NULL,
        is_correct     BOOLEAN NOT NULL,
        answered_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS session (
        sid    VARCHAR NOT NULL COLLATE "default",
        sess   JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL,
        CONSTRAINT session_pkey PRIMARY KEY (sid)
      );
      CREATE INDEX IF NOT EXISTS session_expire_idx ON session (expire);
    `);
    // Migraciones: agregar columnas si la tabla ya existía sin ellas
    await client.query(`
      ALTER TABLE assignments ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE exercises   ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'stars';
    `);
    console.log('Base de datos inicializada correctamente');
  } finally {
    client.release();
  }
}

module.exports = { pool, init };
