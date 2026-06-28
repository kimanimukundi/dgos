const express = require('express');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows: pendingMemos } = await pool.query(
      `SELECT COUNT(*) FROM memo_recipients mr JOIN memos m ON mr.memo_id = m.id
       WHERE mr.staff_id = $1 AND mr.acknowledged_at IS NULL AND m.status = 'published'`, [userId]
    );
    const { rows: unreadMemos } = await pool.query(
      `SELECT COUNT(*) FROM memo_recipients mr JOIN memos m ON mr.memo_id = m.id
       WHERE mr.staff_id = $1 AND mr.opened_at IS NULL AND m.status = 'published'`, [userId]
    );
    const { rows: notices } = await pool.query(
      `SELECT COUNT(*) FROM notices WHERE (expires_at IS NULL OR expires_at > NOW())`
    );

    // Workflows pending my action
    const { rows: pendingWorkflows } = await pool.query(
      `SELECT COUNT(*) FROM workflow_step_actions wsa
       JOIN workflow_instances wi ON wsa.instance_id = wi.id
       WHERE wsa.assigned_to = $1 AND wsa.action IS NULL
       AND wi.status = 'in_progress' AND wsa.step_order = wi.current_step`, [userId]
    );

    // Tasks
    await pool.query(
      `UPDATE tasks SET status = 'overdue' WHERE status IN ('pending','in_progress') AND deadline < CURRENT_DATE`
    );
    const { rows: myTasks } = await pool.query(
      `SELECT COUNT(*) FROM tasks WHERE assigned_to = $1 AND status NOT IN ('completed')`, [userId]
    );
    const { rows: overdueTasks } = await pool.query(
      `SELECT COUNT(*) FROM tasks WHERE assigned_to = $1 AND status = 'overdue'`, [userId]
    );

    let pendingAck = { count: 0 };
    if (['supervisor', 'hod', 'director', 'system_admin'].includes(req.user.role)) {
      const { rows } = await pool.query(
        `SELECT COUNT(*) FROM memos m JOIN memo_recipients mr ON m.id = mr.memo_id
         WHERE m.sender_id = $1 AND m.status = 'published' AND mr.acknowledged_at IS NULL`, [userId]
      );
      pendingAck = rows[0];
    }

    // My open helpdesk tickets
    const { rows: myOpenTickets } = await pool.query(
      `SELECT COUNT(*) FROM tickets WHERE requester_id = $1 AND status NOT IN ('resolved', 'closed')`, [userId]
    );
    // If ICT agent, tickets in my queue
    const { rows: queueTickets } = await pool.query(
      `SELECT COUNT(*) FROM tickets WHERE assigned_to = $1 AND status NOT IN ('resolved', 'closed')`, [userId]
    );

    const { rows: activity } = await pool.query(
      `SELECT al.action, al.entity_type, al.entity_id, al.created_at,
              CASE WHEN al.entity_type = 'memo' THEN m.subject
                   WHEN al.entity_type = 'workflow' THEN wi.title
                   WHEN al.entity_type = 'task' THEN t.title
                   ELSE NULL END as entity_label,
              CASE WHEN al.entity_type = 'memo' THEN m.memo_number ELSE NULL END as memo_number
       FROM audit_log al
       LEFT JOIN memos m ON al.entity_type = 'memo' AND al.entity_id = m.id
       LEFT JOIN workflow_instances wi ON al.entity_type = 'workflow' AND al.entity_id = wi.id
       LEFT JOIN tasks t ON al.entity_type = 'task' AND al.entity_id = t.id
       WHERE al.actor_id = $1 ORDER BY al.created_at DESC LIMIT 10`, [userId]
    );

    const { rows: recentMemos } = await pool.query(
      `SELECT m.id, m.memo_number, m.subject, m.urgency, m.published_at,
              s.full_name as sender_name,
              mr.delivery_status, mr.opened_at, mr.acknowledged_at
       FROM memo_recipients mr JOIN memos m ON mr.memo_id = m.id JOIN staff s ON m.sender_id = s.id
       WHERE mr.staff_id = $1 AND m.status = 'published' ORDER BY m.published_at DESC LIMIT 5`, [userId]
    );

    const { rows: recentNotices } = await pool.query(
      `SELECT * FROM notices WHERE (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC LIMIT 3`
    );

    // Pending workflow steps for me
    const { rows: pendingWorkflowList } = await pool.query(
      `SELECT wi.id, wi.reference_number, wi.title, wt.name as template_name,
              wsa.step_label, wsa.sla_deadline
       FROM workflow_step_actions wsa
       JOIN workflow_instances wi ON wsa.instance_id = wi.id
       JOIN workflow_templates wt ON wi.template_id = wt.id
       WHERE wsa.assigned_to = $1 AND wsa.action IS NULL
       AND wi.status = 'in_progress' AND wsa.step_order = wi.current_step
       ORDER BY wsa.sla_deadline ASC NULLS LAST LIMIT 3`, [userId]
    );

    // My active tasks
    const { rows: taskList } = await pool.query(
      `SELECT t.id, t.title, t.deadline, t.priority, t.status
       FROM tasks t WHERE t.assigned_to = $1 AND t.status NOT IN ('completed')
       ORDER BY CASE t.status WHEN 'overdue' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, t.deadline ASC LIMIT 4`, [userId]
    );

    res.json({
      stats: {
        pending_memos: parseInt(pendingMemos[0].count),
        unread_memos: parseInt(unreadMemos[0].count),
        active_notices: parseInt(notices[0].count),
        pending_acknowledgments_sent: parseInt(pendingAck.count),
        pending_approvals: parseInt(pendingWorkflows[0].count),
        assigned_tasks: parseInt(myTasks[0].count),
        overdue_tasks: parseInt(overdueTasks[0].count),
        my_open_tickets: parseInt(myOpenTickets[0].count),
        my_queue_tickets: parseInt(queueTickets[0].count),
      },
      recent_memos: recentMemos,
      recent_notices: recentNotices,
      pending_workflows: pendingWorkflowList,
      my_tasks: taskList,
      activity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
