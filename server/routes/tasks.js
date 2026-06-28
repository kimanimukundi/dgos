const express = require('express');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

const router = express.Router();

const canAssign = (role) => ['supervisor', 'hod', 'director', 'system_admin'].includes(role);

// Get tasks for current user (assigned to me)
router.get('/mine', auth, async (req, res) => {
  try {
    // Auto-mark overdue first
    await pool.query(
      `UPDATE tasks SET status = 'overdue' WHERE status IN ('pending','in_progress')
       AND deadline < CURRENT_DATE`
    );
    const { rows } = await pool.query(
      `SELECT t.*, s.full_name as assigned_by_name,
              wi.reference_number as workflow_ref
       FROM tasks t
       JOIN staff s ON t.assigned_by = s.id
       LEFT JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
       WHERE t.assigned_to = $1
       ORDER BY CASE t.status WHEN 'overdue' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'pending' THEN 2 ELSE 3 END,
                t.deadline ASC NULLS LAST`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Get tasks assigned by me
router.get('/assigned-by-me', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, s.full_name as assignee_name, s.job_title as assignee_title,
              d.name as assignee_department
       FROM tasks t
       JOIN staff s ON t.assigned_to = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE t.assigned_by = $1
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Get all tasks (directors/auditors)
router.get('/', auth, async (req, res) => {
  const { status, department_id } = req.query;
  try {
    let query = `
      SELECT t.*, 
             ab.full_name as assigned_by_name,
             at2.full_name as assignee_name, at2.job_title as assignee_title,
             d.name as assignee_department,
             wi.reference_number as workflow_ref
      FROM tasks t
      JOIN staff ab ON t.assigned_by = ab.id
      JOIN staff at2 ON t.assigned_to = at2.id
      LEFT JOIN departments d ON at2.department_id = d.id
      LEFT JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); query += ` AND t.status = $${params.length}`; }
    if (department_id) { params.push(department_id); query += ` AND at2.department_id = $${params.length}`; }
    query += ' ORDER BY t.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Get single task
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*,
              ab.full_name as assigned_by_name, ab.job_title as assigned_by_title,
              at2.full_name as assignee_name, at2.job_title as assignee_title,
              d.name as assignee_department,
              wi.reference_number as workflow_ref, wi.title as workflow_title
       FROM tasks t
       JOIN staff ab ON t.assigned_by = ab.id
       JOIN staff at2 ON t.assigned_to = at2.id
       LEFT JOIN departments d ON at2.department_id = d.id
       LEFT JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });

    const { rows: comments } = await pool.query(
      `SELECT tc.*, s.full_name as author_name FROM task_comments tc
       JOIN staff s ON tc.author_id = s.id
       WHERE tc.task_id = $1 ORDER BY tc.created_at ASC`,
      [req.params.id]
    );

    const { rows: subtasks } = await pool.query(
      'SELECT * FROM subtasks WHERE task_id = $1 ORDER BY created_at ASC', [req.params.id]
    );

    const { rows: linkedAssets } = await pool.query(
      `SELECT a.id, a.asset_tag, a.name, a.status FROM task_assets ta
       JOIN assets a ON ta.asset_id = a.id WHERE ta.task_id = $1`,
      [req.params.id]
    );

    res.json({ ...rows[0], comments, subtasks, linked_assets: linkedAssets });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Add a subtask
router.post('/:id/subtasks', auth, async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  try {
    const { rows: task } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task[0]) return res.status(404).json({ error: 'Task not found' });
    if (task[0].assigned_to !== req.user.id && task[0].assigned_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised' });
    }
    const { rows } = await pool.query(
      'INSERT INTO subtasks (task_id, title) VALUES ($1, $2) RETURNING *',
      [req.params.id, title]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Toggle subtask completion
router.patch('/subtasks/:subtaskId', auth, async (req, res) => {
  const { completed } = req.body;
  try {
    await pool.query(
      'UPDATE subtasks SET completed = $1, completed_at = CASE WHEN $1 THEN NOW() ELSE NULL END WHERE id = $2',
      [completed, req.params.subtaskId]
    );
    res.json({ message: 'Subtask updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Create task
router.post('/', auth, async (req, res) => {
  if (!canAssign(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  const { title, description, assigned_to, deadline, priority, workflow_instance_id, asset_ids } = req.body;
  if (!title || !assigned_to) return res.status(400).json({ error: 'title and assigned_to required' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO tasks (title, description, assigned_to, assigned_by, deadline, priority, workflow_instance_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description, assigned_to, req.user.id, deadline || null, priority || 'normal', workflow_instance_id || null]
    );

    if (asset_ids && asset_ids.length) {
      const values = asset_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
      await pool.query(`INSERT INTO task_assets (task_id, asset_id) VALUES ${values}`, [rows[0].id, ...asset_ids]);
    }

    await pool.query(
      'INSERT INTO audit_log (actor_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'create_task', 'task', rows[0].id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Update task status / add comment
router.patch('/:id', auth, async (req, res) => {
  const { status, completion_note, comment } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    const task = rows[0];
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const isAssignee = task.assigned_to === req.user.id;
    const isAssigner = task.assigned_by === req.user.id;
    if (!isAssignee && !isAssigner) return res.status(403).json({ error: 'Not authorised' });

    if (status) {
      if (status === 'completed' && !completion_note) {
        return res.status(400).json({ error: 'A completion note is required to mark a task complete' });
      }
      await pool.query(
        `UPDATE tasks SET status = $1, completion_note = $2,
         completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END,
         updated_at = NOW() WHERE id = $3`,
        [status, completion_note || null, req.params.id]
      );
      await pool.query(
        'INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'update_task_status', 'task', req.params.id, JSON.stringify({ status })]
      );
    }

    if (comment) {
      await pool.query(
        'INSERT INTO task_comments (task_id, author_id, comment) VALUES ($1, $2, $3)',
        [req.params.id, req.user.id, comment]
      );
    }

    res.json({ message: 'Task updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
