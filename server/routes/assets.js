const express = require('express');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

const router = express.Router();

const canManage = (role) => ['supervisor', 'hod', 'director', 'system_admin'].includes(role);

router.get('/categories', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM asset_categories ORDER BY name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// List assets with filters
router.get('/', auth, async (req, res) => {
  const { status, category_id, department_id, search } = req.query;
  try {
    let query = `
      SELECT a.*, c.name as category_name, d.name as department_name,
             s.full_name as custodian_name
      FROM assets a
      LEFT JOIN asset_categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN staff s ON a.custodian_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); query += ` AND a.status = $${params.length}`; }
    if (category_id) { params.push(category_id); query += ` AND a.category_id = $${params.length}`; }
    if (department_id) { params.push(department_id); query += ` AND a.department_id = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (a.name ILIKE $${params.length} OR a.asset_tag ILIKE $${params.length} OR a.serial_number ILIKE $${params.length})`;
    }
    query += ' ORDER BY a.asset_tag';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Single asset with full history + linked workflow/tasks
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, c.name as category_name, d.name as department_name,
             s.full_name as custodian_name, s.job_title as custodian_title,
             wi.reference_number as disposal_ref, wi.title as disposal_title
      FROM assets a
      LEFT JOIN asset_categories c ON a.category_id = c.id
      LEFT JOIN departments d ON a.department_id = d.id
      LEFT JOIN staff s ON a.custodian_id = s.id
      LEFT JOIN workflow_instances wi ON a.disposal_workflow_id = wi.id
      WHERE a.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Asset not found' });

    const { rows: history } = await pool.query(`
      SELECT ah.*, s.full_name as actor_name
      FROM asset_history ah LEFT JOIN staff s ON ah.actor_id = s.id
      WHERE ah.asset_id = $1 ORDER BY ah.created_at DESC
    `, [req.params.id]);

    const { rows: workflows } = await pool.query(`
      SELECT wi.id, wi.reference_number, wi.title, wi.status
      FROM workflow_assets wa JOIN workflow_instances wi ON wa.instance_id = wi.id
      WHERE wa.asset_id = $1
    `, [req.params.id]);

    const { rows: tasks } = await pool.query(`
      SELECT t.id, t.title, t.status
      FROM task_assets ta JOIN tasks t ON ta.task_id = t.id
      WHERE ta.asset_id = $1
    `, [req.params.id]);

    res.json({ ...rows[0], history, workflows, tasks });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Create asset
router.post('/', auth, async (req, res) => {
  if (!canManage(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  const { name, category_id, description, serial_number, purchase_date, purchase_value,
          current_value, condition, department_id, custodian_id, location } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const { rows: last } = await pool.query("SELECT asset_tag FROM assets ORDER BY id DESC LIMIT 1");
    const lastNum = last[0] ? parseInt(last[0].asset_tag.split('/')[2]) : 0;
    const asset_tag = `MOT/AST/${String(lastNum + 1).padStart(3, '0')}`;

    const { rows } = await pool.query(`
      INSERT INTO assets (asset_tag, name, category_id, description, serial_number, purchase_date,
        purchase_value, current_value, condition, department_id, custodian_id, location)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
    `, [asset_tag, name, category_id || null, description, serial_number, purchase_date || null,
        purchase_value || null, current_value || null, condition || 'good', department_id || null,
        custodian_id || null, location]);

    await pool.query(
      'INSERT INTO asset_history (asset_id, event, detail, actor_id) VALUES ($1, $2, $3, $4)',
      [rows[0].id, 'created', 'Asset registered in system', req.user.id]
    );
    await pool.query(
      'INSERT INTO audit_log (actor_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'create_asset', 'asset', rows[0].id]
    );

    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Update asset (status, custodian, condition)
router.patch('/:id', auth, async (req, res) => {
  if (!canManage(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  const { status, condition, custodian_id, location } = req.body;
  try {
    const { rows: existing } = await pool.query('SELECT * FROM assets WHERE id = $1', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ error: 'Asset not found' });
    const asset = existing[0];

    await pool.query(`
      UPDATE assets SET
        status = COALESCE($1, status), condition = COALESCE($2, condition),
        custodian_id = COALESCE($3, custodian_id), location = COALESCE($4, location),
        updated_at = NOW()
      WHERE id = $5
    `, [status, condition, custodian_id, location, req.params.id]);

    if (status && status !== asset.status) {
      await pool.query(
        'INSERT INTO asset_history (asset_id, event, detail, actor_id) VALUES ($1, $2, $3, $4)',
        [req.params.id, 'status_changed', `Status changed from ${asset.status} to ${status}`, req.user.id]
      );
    }
    if (custodian_id && custodian_id != asset.custodian_id) {
      await pool.query(
        'INSERT INTO asset_history (asset_id, event, detail, actor_id) VALUES ($1, $2, $3, $4)',
        [req.params.id, 'custodian_changed', 'Custodian reassigned', req.user.id]
      );
    }

    res.json({ message: 'Asset updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
