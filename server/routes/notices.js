const express = require('express');
const pool = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get active notices
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.*, s.full_name as posted_by_name, d.name as department_name
       FROM notices n
       JOIN staff s ON n.posted_by = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE (n.expires_at IS NULL OR n.expires_at > NOW())
       AND (n.target = 'all' OR n.target_department_id = $1)
       ORDER BY n.created_at DESC`,
      [req.user.department_id || 0]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create notice
router.post('/', auth, async (req, res) => {
  const allowedRoles = ['supervisor', 'hod', 'director', 'system_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { title, body, target, target_department_id, expires_at } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Title and body required' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO notices (title, body, posted_by, target, target_department_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, body, req.user.id, target || 'all', target_department_id || null, expires_at || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
