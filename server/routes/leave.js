const express = require('express');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

const router = express.Router();

// My leave requests
router.get('/mine', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT lr.*, ao.full_name as acting_officer_name
       FROM leave_requests lr
       LEFT JOIN staff ao ON lr.acting_officer_id = ao.id
       WHERE lr.staff_id = $1 ORDER BY lr.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Pending approvals for me (supervisor/HOD/HR)
router.get('/pending-approval', auth, async (req, res) => {
  try {
    let query = `
      SELECT lr.*, s.full_name as staff_name, s.job_title, d.name as department_name
      FROM leave_requests lr
      JOIN staff s ON lr.staff_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE lr.status = 'pending'
    `;
    // Supervisors/HODs see their department
    if (['supervisor', 'hod'].includes(req.user.role)) {
      query += ` AND s.department_id = ${req.user.department_id || 0}`;
    }
    query += ' ORDER BY lr.created_at ASC';
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// All leave requests (directors/auditors)
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT lr.*, s.full_name as staff_name, s.job_title, d.name as department_name,
              ao.full_name as acting_officer_name
       FROM leave_requests lr
       JOIN staff s ON lr.staff_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN staff ao ON lr.acting_officer_id = ao.id
       ORDER BY lr.created_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Submit leave request
router.post('/', auth, async (req, res) => {
  const { leave_type, start_date, end_date, reason, acting_officer_id } = req.body;
  if (!leave_type || !start_date || !end_date) {
    return res.status(400).json({ error: 'leave_type, start_date, end_date required' });
  }
  try {
    const start = new Date(start_date);
    const end = new Date(end_date);
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const year = new Date().getFullYear();
    const { rows: count } = await pool.query(
      'SELECT COUNT(*) FROM leave_requests WHERE EXTRACT(YEAR FROM created_at) = $1', [year]
    );
    const seq = String(parseInt(count[0].count) + 1).padStart(3, '0');
    const ref = `LV/MOT/${year}/${seq}`;

    const { rows } = await pool.query(
      `INSERT INTO leave_requests (reference_number, staff_id, leave_type, start_date, end_date, days_requested, reason, acting_officer_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
      [ref, req.user.id, leave_type, start_date, end_date, days, reason, acting_officer_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Approve or reject
router.post('/:id/action', auth, async (req, res) => {
  const { action, comment } = req.body;
  if (!['approved', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'action must be approved or rejected' });
  }
  const allowedRoles = ['supervisor', 'hod', 'director', 'system_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  try {
    await pool.query(
      `UPDATE leave_requests SET status = $1, supervisor_action = $2, supervisor_comment = $3,
       supervisor_actioned_at = NOW(), updated_at = NOW() WHERE id = $4`,
      [action, action, comment || null, req.params.id]
    );
    res.json({ message: `Leave request ${action}` });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
