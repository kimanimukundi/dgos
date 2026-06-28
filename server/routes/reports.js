const express = require('express');
const pool = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

const canViewReports = (role) => ['hod', 'director', 'auditor', 'system_admin'].includes(role);

// Memo acknowledgment report
router.get('/memo-acknowledgment', auth, async (req, res) => {
  if (!canViewReports(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  const { from_date, to_date, department_id } = req.query;
  try {
    let query = `
      SELECT m.id, m.memo_number, m.subject, m.urgency, m.published_at,
             s.full_name as sender_name, d.name as sender_department,
             COUNT(mr.id) as total_recipients,
             COUNT(mr.acknowledged_at) as acknowledged,
             COUNT(mr.opened_at) - COUNT(mr.acknowledged_at) as opened_not_acked,
             COUNT(mr.id) - COUNT(mr.opened_at) as unread,
             ROUND(COUNT(mr.acknowledged_at)::numeric / NULLIF(COUNT(mr.id),0) * 100, 1) as ack_rate
      FROM memos m
      JOIN staff s ON m.sender_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN memo_recipients mr ON m.id = mr.memo_id
      WHERE m.status = 'published'
    `;
    const params = [];
    if (from_date) { params.push(from_date); query += ` AND m.published_at >= $${params.length}`; }
    if (to_date) { params.push(to_date); query += ` AND m.published_at <= $${params.length}`; }
    if (department_id) { params.push(department_id); query += ` AND s.department_id = $${params.length}`; }
    query += ' GROUP BY m.id, s.full_name, d.name ORDER BY m.published_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Unacknowledged memos per staff member
router.get('/unacknowledged-staff', auth, async (req, res) => {
  if (!canViewReports(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  try {
    const { rows } = await pool.query(`
      SELECT s.id, s.full_name, s.job_title, d.name as department_name,
             COUNT(mr.id) as unacknowledged_count,
             MIN(m.published_at) as oldest_unacked
      FROM staff s
      JOIN memo_recipients mr ON mr.staff_id = s.id
      JOIN memos m ON mr.memo_id = m.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE mr.acknowledged_at IS NULL AND m.status = 'published'
      GROUP BY s.id, s.full_name, s.job_title, d.name
      ORDER BY unacknowledged_count DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Workflow performance report
router.get('/workflow-performance', auth, async (req, res) => {
  if (!canViewReports(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  try {
    // Per-template stats
    const { rows: templateStats } = await pool.query(`
      SELECT wt.id, wt.name,
             COUNT(wi.id) as total,
             COUNT(CASE WHEN wi.status = 'completed' THEN 1 END) as completed,
             COUNT(CASE WHEN wi.status = 'in_progress' THEN 1 END) as in_progress,
             COUNT(CASE WHEN wi.status = 'rejected' THEN 1 END) as rejected,
             ROUND(AVG(CASE WHEN wi.status = 'completed'
               THEN EXTRACT(EPOCH FROM (wi.completed_at - wi.created_at))/3600 END), 1) as avg_hours_to_complete
      FROM workflow_templates wt
      LEFT JOIN workflow_instances wi ON wt.id = wi.template_id
      GROUP BY wt.id, wt.name ORDER BY total DESC
    `);

    // Step bottlenecks — avg time spent at each step
    const { rows: stepStats } = await pool.query(`
      SELECT wt.name as template_name, wsa.step_label, wsa.step_order,
             COUNT(CASE WHEN wsa.action IS NOT NULL THEN 1 END) as actioned,
             COUNT(CASE WHEN wsa.action IS NULL AND wsa.assigned_to IS NOT NULL THEN 1 END) as pending,
             ROUND(AVG(CASE WHEN wsa.actioned_at IS NOT NULL
               THEN EXTRACT(EPOCH FROM (wsa.actioned_at - wsa.assigned_at))/3600 END), 1) as avg_hours
      FROM workflow_step_actions wsa
      JOIN workflow_instances wi ON wsa.instance_id = wi.id
      JOIN workflow_templates wt ON wi.template_id = wt.id
      GROUP BY wt.name, wsa.step_label, wsa.step_order
      ORDER BY wt.name, wsa.step_order
    `);

    res.json({ template_stats: templateStats, step_stats: stepStats });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Task completion report
router.get('/task-completion', auth, async (req, res) => {
  if (!canViewReports(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  try {
    // By department
    const { rows: byDept } = await pool.query(`
      SELECT d.name as department_name,
             COUNT(t.id) as total,
             COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed,
             COUNT(CASE WHEN t.status = 'overdue' THEN 1 END) as overdue,
             COUNT(CASE WHEN t.status IN ('pending','in_progress') THEN 1 END) as in_progress,
             ROUND(COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::numeric / NULLIF(COUNT(t.id),0) * 100, 1) as completion_rate
      FROM tasks t
      JOIN staff s ON t.assigned_to = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      GROUP BY d.name ORDER BY total DESC
    `);

    // Overdue tasks detail
    const { rows: overdue } = await pool.query(`
      SELECT t.id, t.title, t.deadline, t.priority,
             s.full_name as assignee_name, d.name as department_name,
             ab.full_name as assigned_by_name,
             CURRENT_DATE - t.deadline as days_overdue
      FROM tasks t
      JOIN staff s ON t.assigned_to = s.id
      JOIN staff ab ON t.assigned_by = ab.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE t.status = 'overdue'
      ORDER BY t.deadline ASC
    `);

    res.json({ by_department: byDept, overdue_tasks: overdue });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Staff activity report
router.get('/staff-activity', auth, async (req, res) => {
  if (!canViewReports(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  try {
    const { rows } = await pool.query(`
      SELECT s.id, s.full_name, s.job_title, s.role, d.name as department_name,
             MAX(al.created_at) as last_active,
             COUNT(al.id) as total_actions_30d,
             COUNT(CASE WHEN al.action = 'login' THEN 1 END) as logins_30d,
             COUNT(CASE WHEN al.action = 'acknowledge_memo' THEN 1 END) as memos_acked_30d
      FROM staff s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN audit_log al ON al.actor_id = s.id
        AND al.created_at >= NOW() - INTERVAL '30 days'
      WHERE s.account_status = 'active'
      GROUP BY s.id, s.full_name, s.job_title, s.role, d.name
      ORDER BY last_active DESC NULLS LAST
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Audit log
router.get('/audit-log', auth, async (req, res) => {
  if (!canViewReports(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  const { staff_id, action, from_date, to_date, entity_type } = req.query;
  try {
    let query = `
      SELECT al.id, al.action, al.entity_type, al.entity_id, al.metadata, al.created_at,
             s.full_name as actor_name, s.job_title as actor_title, d.name as actor_department,
             CASE
               WHEN al.entity_type = 'memo' THEN m.subject
               WHEN al.entity_type = 'workflow' THEN wi.title
               WHEN al.entity_type = 'task' THEN t.title
               ELSE NULL
             END as entity_label
      FROM audit_log al
      JOIN staff s ON al.actor_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN memos m ON al.entity_type = 'memo' AND al.entity_id = m.id
      LEFT JOIN workflow_instances wi ON al.entity_type = 'workflow' AND al.entity_id = wi.id
      LEFT JOIN tasks t ON al.entity_type = 'task' AND al.entity_id = t.id
      WHERE 1=1
    `;
    const params = [];
    if (staff_id) { params.push(staff_id); query += ` AND al.actor_id = $${params.length}`; }
    if (action) { params.push(action); query += ` AND al.action = $${params.length}`; }
    if (entity_type) { params.push(entity_type); query += ` AND al.entity_type = $${params.length}`; }
    if (from_date) { params.push(from_date); query += ` AND al.created_at >= $${params.length}`; }
    if (to_date) { params.push(to_date); query += ` AND al.created_at <= $${params.length}`; }
    query += ' ORDER BY al.created_at DESC LIMIT 200';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
