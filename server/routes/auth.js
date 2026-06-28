const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const { rows } = await pool.query(
      `SELECT s.*, d.name as department_name, u.name as unit_name
       FROM staff s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN units u ON s.unit_id = u.id
       WHERE s.email = $1 AND s.account_status = 'active'`,
      [email]
    );

    const staff = rows[0];
    if (!staff) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, staff.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Log login
    await pool.query(
      'INSERT INTO audit_log (actor_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [staff.id, 'login', 'staff', staff.id]
    );

    const token = jwt.sign(
      { id: staff.id, email: staff.email, role: staff.role, name: staff.full_name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: staff.id,
        staff_id: staff.staff_id,
        full_name: staff.full_name,
        email: staff.email,
        job_title: staff.job_title,
        role: staff.role,
        department_name: staff.department_name,
        unit_name: staff.unit_name,
        must_change_password: staff.must_change_password,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.staff_id, s.full_name, s.email, s.job_title, s.grade, s.role,
              s.phone, s.must_change_password, s.employment_status,
              d.name as department_name, d.id as department_id,
              u.name as unit_name, u.id as unit_id,
              sup.full_name as supervisor_name
       FROM staff s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN units u ON s.unit_id = u.id
       LEFT JOIN staff sup ON s.supervisor_id = sup.id
       WHERE s.id = $1`,
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password || new_password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const { rows } = await pool.query('SELECT password_hash FROM staff WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query(
      'UPDATE staff SET password_hash = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2',
      [hash, req.user.id]
    );

    await pool.query(
      'INSERT INTO audit_log (actor_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'change_password', 'staff', req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
