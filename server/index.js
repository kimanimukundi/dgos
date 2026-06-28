require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:3000',
      process.env.CLIENT_URL,
    ].filter(Boolean);
    if (!origin || allowed.some(o => origin.startsWith(o)) || origin.includes('.onrender.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/memos', require('./routes/memos'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/workflows', require('./routes/workflows'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/contracts', require('./routes/contracts'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/search', require('./routes/search'));
app.use('/api/notifications', require('./routes/notifications'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', system: 'DGOS', ministry: 'Ministry of Tourism & Wildlife' }));

// Auto-initialize DB in production if tables don't exist yet
async function autoInitDb() {
  if (process.env.NODE_ENV !== 'production') return;
  const pool = new Pool({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  });
  try {
    const { rows } = await pool.query("SELECT to_regclass('public.staff') as exists");
    if (rows[0].exists) { console.log('DB already initialized'); await pool.end(); return; }
    console.log('Initializing database...');
    const sqlFiles = [
      'db/schema.sql', 'db/seed.sql',
      'db/schema_phase34.sql', 'db/seed_phase34.sql',
      'db/schema_phase5.sql', 'db/seed_phase5.sql',
      'db/schema_phase6.sql', 'db/seed_phase6.sql',
      'db/schema_phase7.sql', 'db/seed_phase7.sql',
      'db/schema_phase8.sql',
    ];
    for (const file of sqlFiles) {
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      await pool.query(sql);
      console.log(`✓ ${file}`);
    }
    console.log('✅ Database initialized');
  } catch (err) {
    console.error('DB init error:', err.message);
  } finally {
    await pool.end();
  }
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`DGOS Server running on port ${PORT}`);
  await autoInitDb();
});
