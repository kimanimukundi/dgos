const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all departments
router.get('/departments', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.*, COUNT(s.id) as staff_count
       FROM departments d
       LEFT JOIN staff s ON s.department_id = d.id AND s.account_status = 'active'
       WHERE d.active = TRUE
       GROUP BY d.id
       ORDER BY d.name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get units (optionally by department)
router.get('/units', auth, async (req, res) => {
  const { department_id } = req.query;
  try {
    const query = department_id
      ? 'SELECT * FROM units WHERE active = TRUE AND department_id = $1 ORDER BY name'
      : 'SELECT * FROM units WHERE active = TRUE ORDER BY name';
    const params = department_id ? [department_id] : [];
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all staff (directory)
router.get('/', auth, async (req, res) => {
  const { department_id, search } = req.query;
  try {
    let query = `
      SELECT s.id, s.staff_id, s.full_name, s.email, s.job_title, s.grade,
             s.role, s.phone, s.employment_status, s.account_status,
             d.name as department_name, d.id as department_id,
             u.name as unit_name, u.id as unit_id,
             sup.full_name as supervisor_name
      FROM staff s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN units u ON s.unit_id = u.id
      LEFT JOIN staff sup ON s.supervisor_id = sup.id
      WHERE s.account_status = 'active'
    `;
    const params = [];

    if (department_id) {
      params.push(department_id);
      query += ` AND s.department_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (s.full_name ILIKE $${params.length} OR s.job_title ILIKE $${params.length} OR s.email ILIKE $${params.length})`;
    }
    query += ' ORDER BY d.name, s.full_name';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get org chart (tree structure)
router.get('/org-chart', auth, async (req, res) => {
  try {
    const { rows: depts } = await pool.query(
      'SELECT * FROM departments WHERE active = TRUE ORDER BY name'
    );
    const { rows: units } = await pool.query(
      'SELECT * FROM units WHERE active = TRUE ORDER BY name'
    );
    const { rows: staff } = await pool.query(
      `SELECT s.id, s.staff_id, s.full_name, s.job_title, s.role,
              s.department_id, s.unit_id, s.supervisor_id
       FROM staff s WHERE s.account_status = 'active' ORDER BY s.full_name`
    );

    const tree = depts.map(dept => ({
      ...dept,
      units: units
        .filter(u => u.department_id === dept.id)
        .map(unit => ({
          ...unit,
          staff: staff.filter(s => s.unit_id === unit.id)
        })),
      direct_staff: staff.filter(s => s.department_id === dept.id && !s.unit_id)
    }));

    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single staff member
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.staff_id, s.full_name, s.email, s.job_title, s.grade,
              s.role, s.phone, s.employment_status, s.account_status,
              d.name as department_name, d.id as department_id,
              u.name as unit_name, u.id as unit_id,
              sup.full_name as supervisor_name, sup.job_title as supervisor_title
       FROM staff s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN units u ON s.unit_id = u.id
       LEFT JOIN staff sup ON s.supervisor_id = sup.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Staff not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create staff (admin only)
router.post('/', auth, requireRole('system_admin'), async (req, res) => {
  const { full_name, email, job_title, grade, role, department_id, unit_id, supervisor_id, phone } = req.body;
  if (!full_name || !email || !role) {
    return res.status(400).json({ error: 'full_name, email, and role are required' });
  }

  try {
    // Generate staff_id
    const { rows: last } = await pool.query("SELECT staff_id FROM staff ORDER BY id DESC LIMIT 1");
    const lastNum = last[0] ? parseInt(last[0].staff_id.split('/')[2]) : 0;
    const staff_id = `MOT/${String(lastNum + 1).padStart(3, '0')}`;

    const defaultPassword = 'Password@123';
    const hash = await bcrypt.hash(defaultPassword, 10);

    const { rows } = await pool.query(
      `INSERT INTO staff (staff_id, full_name, email, password_hash, job_title, grade, role, department_id, unit_id, supervisor_id, phone, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE)
       RETURNING id, staff_id, full_name, email, job_title, role`,
      [staff_id, full_name, email, hash, job_title, grade, role, department_id, unit_id, supervisor_id, phone]
    );

    await pool.query(
      'INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'create_staff', 'staff', rows[0].id, JSON.stringify({ email, role })]
    );

    res.status(201).json({ ...rows[0], default_password: defaultPassword });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// Update staff (admin only)
router.put('/:id', auth, requireRole('system_admin'), async (req, res) => {
  const { full_name, job_title, grade, role, department_id, unit_id, supervisor_id, phone, account_status } = req.body;
  try {
    await pool.query(
      `UPDATE staff SET full_name=$1, job_title=$2, grade=$3, role=$4,
       department_id=$5, unit_id=$6, supervisor_id=$7, phone=$8,
       account_status=$9, updated_at=NOW()
       WHERE id=$10`,
      [full_name, job_title, grade, role, department_id, unit_id, supervisor_id, phone, account_status, req.params.id]
    );

    await pool.query(
      'INSERT INTO audit_log (actor_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'update_staff', 'staff', req.params.id]
    );

    res.json({ message: 'Staff updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
