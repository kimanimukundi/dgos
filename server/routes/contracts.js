const express = require('express');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

const router = express.Router();

const canManage = (role) => ['hod', 'director', 'system_admin'].includes(role);

router.get('/vendors', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM vendors ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/vendors', auth, async (req, res) => {
  if (!canManage(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  const { name, contact_person, email, phone, address } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO vendors (name, contact_person, email, phone, address) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, contact_person, email, phone, address]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// List contracts, auto-flag expired
router.get('/', auth, async (req, res) => {
  const { status, department_id } = req.query;
  try {
    await pool.query(`UPDATE contracts SET status = 'expired' WHERE status = 'active' AND end_date < CURRENT_DATE`);

    let query = `
      SELECT c.*, v.name as vendor_name, v.contact_person, v.email as vendor_email,
             d.name as department_name, s.full_name as managed_by_name,
             (c.end_date - CURRENT_DATE) as days_to_expiry
      FROM contracts c
      JOIN vendors v ON c.vendor_id = v.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN staff s ON c.managed_by = s.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); query += ` AND c.status = $${params.length}`; }
    if (department_id) { params.push(department_id); query += ` AND c.department_id = $${params.length}`; }
    query += ' ORDER BY c.end_date ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Contracts expiring soon (within 90 days) — for alerts
router.get('/expiring-soon', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, v.name as vendor_name, (c.end_date - CURRENT_DATE) as days_to_expiry
      FROM contracts c JOIN vendors v ON c.vendor_id = v.id
      WHERE c.status = 'active' AND c.end_date <= CURRENT_DATE + INTERVAL '90 days'
      ORDER BY c.end_date ASC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, v.name as vendor_name, v.contact_person, v.email as vendor_email, v.phone as vendor_phone,
             d.name as department_name, s.full_name as managed_by_name
      FROM contracts c
      JOIN vendors v ON c.vendor_id = v.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN staff s ON c.managed_by = s.id
      WHERE c.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Contract not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/', auth, async (req, res) => {
  if (!canManage(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  const { title, vendor_id, department_id, contract_value, start_date, end_date, description } = req.body;
  if (!title || !vendor_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'title, vendor_id, start_date, end_date required' });
  }
  try {
    const year = new Date().getFullYear();
    const { rows: count } = await pool.query(
      'SELECT COUNT(*) FROM contracts WHERE EXTRACT(YEAR FROM created_at) = $1', [year]
    );
    const seq = String(parseInt(count[0].count) + 1).padStart(3, '0');
    const ref = `CTR/MOT/${year}/${seq}`;

    const { rows } = await pool.query(`
      INSERT INTO contracts (reference_number, title, vendor_id, department_id, contract_value, start_date, end_date, description, managed_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [ref, title, vendor_id, department_id || null, contract_value || null, start_date, end_date, description, req.user.id]);

    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
