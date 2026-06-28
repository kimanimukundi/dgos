const express = require('express');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

const router = express.Router();
const CAP_PER_GROUP = 5;

router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  const isIctAgent = req.user.department_id === 5;

  try {
    const notifications = [];

    // 1. Unacknowledged memos (received, not yet acknowledged)
    const { rows: memos } = await pool.query(`
      SELECT m.id, m.subject, m.memo_number, m.urgency, m.published_at, mr.opened_at
      FROM memo_recipients mr JOIN memos m ON mr.memo_id = m.id
      WHERE mr.staff_id = $1 AND mr.acknowledged_at IS NULL AND m.status = 'published'
      ORDER BY CASE m.urgency WHEN 'urgent' THEN 0 WHEN 'priority' THEN 1 ELSE 2 END, m.published_at DESC
      LIMIT ${CAP_PER_GROUP}
    `, [userId]);
    memos.forEach(m => notifications.push({
      key: `memo:${m.id}`, group: 'memos', icon: '📨',
      title: m.subject, detail: `${m.memo_number} · ${m.urgency} · needs acknowledgment`,
      url: `/memos/${m.id}`, time: m.published_at,
      urgent: m.urgency === 'urgent',
    }));

    // 2. Workflow steps assigned to me, unactioned
    const { rows: workflows } = await pool.query(`
      SELECT wi.id, wi.title, wi.reference_number, wsa.step_label, wsa.sla_deadline, wsa.assigned_at
      FROM workflow_step_actions wsa
      JOIN workflow_instances wi ON wsa.instance_id = wi.id
      WHERE wsa.assigned_to = $1 AND wsa.action IS NULL AND wi.status = 'in_progress'
      AND wsa.step_order = wi.current_step
      ORDER BY wsa.sla_deadline ASC NULLS LAST
      LIMIT ${CAP_PER_GROUP}
    `, [userId]);
    workflows.forEach(w => {
      const overdue = w.sla_deadline && new Date(w.sla_deadline) < new Date();
      notifications.push({
        key: `workflow_step:${w.id}`, group: 'workflows', icon: '🔁',
        title: w.title, detail: `${w.reference_number} · ${w.step_label}${overdue ? ' · SLA breached' : ''}`,
        url: `/workflows/${w.id}`, time: w.assigned_at, urgent: overdue,
      });
    });

    // 3. Tasks assigned to me — overdue or due within 48h
    const { rows: tasks } = await pool.query(`
      SELECT id, title, deadline, status FROM tasks
      WHERE assigned_to = $1 AND status NOT IN ('completed')
      AND (status = 'overdue' OR deadline <= CURRENT_DATE + INTERVAL '2 days')
      ORDER BY deadline ASC NULLS LAST
      LIMIT ${CAP_PER_GROUP}
    `, [userId]);
    tasks.forEach(t => notifications.push({
      key: `task:${t.id}`, group: 'tasks', icon: '✔',
      title: t.title, detail: t.status === 'overdue' ? 'Overdue' : `Due ${new Date(t.deadline).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}`,
      url: `/tasks/${t.id}`, time: t.deadline, urgent: t.status === 'overdue',
    }));

    // 4a. Tickets assigned to me (ICT agents only)
    if (isIctAgent) {
      const { rows: tickets } = await pool.query(`
        SELECT id, subject, ticket_number, priority, status, created_at FROM tickets
        WHERE assigned_to = $1 AND status NOT IN ('resolved', 'closed')
        ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, created_at ASC
        LIMIT ${CAP_PER_GROUP}
      `, [userId]);
      tickets.forEach(t => notifications.push({
        key: `ticket:${t.id}`, group: 'tickets', icon: '🎫',
        title: t.subject, detail: `${t.ticket_number} · ${t.priority} priority · assigned to you`,
        url: `/tickets/${t.id}`, time: t.created_at, urgent: t.priority === 'critical',
      }));
    }

    // 4b. My own tickets that changed status (resolved, awaiting my confirmation)
    const { rows: myResolvedTickets } = await pool.query(`
      SELECT id, subject, ticket_number, resolved_at FROM tickets
      WHERE requester_id = $1 AND status = 'resolved'
      ORDER BY resolved_at DESC LIMIT ${CAP_PER_GROUP}
    `, [userId]);
    myResolvedTickets.forEach(t => notifications.push({
      key: `ticket_resolved:${t.id}`, group: 'tickets', icon: '🎫',
      title: t.subject, detail: `${t.ticket_number} · resolved — review or reopen`,
      url: `/tickets/${t.id}`, time: t.resolved_at, urgent: false,
    }));

    // 5. Leave requests pending my approval (supervisor/HOD/director/admin)
    if (['supervisor', 'hod', 'director', 'system_admin'].includes(role)) {
      const { rows: leave } = await pool.query(`
        SELECT lr.id, lr.reference_number, lr.leave_type, lr.created_at, s.full_name as staff_name
        FROM leave_requests lr JOIN staff s ON lr.staff_id = s.id
        WHERE lr.status = 'pending'
        ${['supervisor', 'hod'].includes(role) ? `AND s.department_id = ${req.user.department_id || 0}` : ''}
        ORDER BY lr.created_at ASC LIMIT ${CAP_PER_GROUP}
      `);
      leave.forEach(l => notifications.push({
        key: `leave:${l.id}`, group: 'leave', icon: '🗓',
        title: `${l.staff_name} — ${l.leave_type} leave`,
        detail: `${l.reference_number} · awaiting your approval`,
        url: `/leave`, time: l.created_at, urgent: false,
      }));
    }

    // 6. My leave requests that were actioned
    const { rows: myLeave } = await pool.query(`
      SELECT id, reference_number, leave_type, status, supervisor_actioned_at FROM leave_requests
      WHERE staff_id = $1 AND status IN ('approved', 'rejected') AND supervisor_actioned_at > NOW() - INTERVAL '7 days'
      ORDER BY supervisor_actioned_at DESC LIMIT ${CAP_PER_GROUP}
    `, [userId]);
    myLeave.forEach(l => notifications.push({
      key: `leave_result:${l.id}`, group: 'leave', icon: '🗓',
      title: `Your ${l.leave_type} leave was ${l.status}`,
      detail: l.reference_number,
      url: `/leave`, time: l.supervisor_actioned_at, urgent: false,
    }));

    // 7. Contracts expiring within 90 days (HOD+/admin — same scope as Contracts module)
    if (['hod', 'director', 'system_admin'].includes(role)) {
      const { rows: contracts } = await pool.query(`
        SELECT id, title, reference_number, end_date FROM contracts
        WHERE status = 'active' AND end_date <= CURRENT_DATE + INTERVAL '90 days'
        ORDER BY end_date ASC LIMIT ${CAP_PER_GROUP}
      `);
      contracts.forEach(c => {
        const daysLeft = Math.ceil((new Date(c.end_date) - new Date()) / 86400000);
        notifications.push({
          key: `contract:${c.id}`, group: 'contracts', icon: '📑',
          title: c.title, detail: `${c.reference_number} · expires in ${daysLeft}d`,
          url: `/contracts`, time: c.end_date, urgent: daysLeft <= 14,
        });
      });
    }

    // 8. Meetings in the next 24 hours I'm invited to
    const { rows: meetings } = await pool.query(`
      SELECT m.id, m.title, m.reference_number, m.meeting_date, m.start_time
      FROM meeting_attendees ma JOIN meetings m ON ma.meeting_id = m.id
      WHERE ma.staff_id = $1 AND m.status = 'scheduled'
      AND m.meeting_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day'
      ORDER BY m.meeting_date ASC LIMIT ${CAP_PER_GROUP}
    `, [userId]);
    meetings.forEach(m => notifications.push({
      key: `meeting:${m.id}`, group: 'meetings', icon: '🗣',
      title: m.title, detail: `${m.reference_number} · ${new Date(m.meeting_date).toLocaleDateString('en-KE', { weekday: 'long' })}${m.start_time ? ' ' + m.start_time.slice(0,5) : ''}`,
      url: `/meetings/${m.id}`, time: m.meeting_date, urgent: true,
    }));

    // Fetch read-state for this user and filter
    const { rows: reads } = await pool.query(
      'SELECT notification_key FROM notification_reads WHERE staff_id = $1', [userId]
    );
    const readKeys = new Set(reads.map(r => r.notification_key));

    const enriched = notifications.map(n => ({ ...n, read: readKeys.has(n.key) }));
    enriched.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
      return new Date(b.time) - new Date(a.time);
    });

    const unreadCount = enriched.filter(n => !n.read).length;

    res.json({ notifications: enriched, unread_count: unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark a single notification read
router.post('/:key/read', auth, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO notification_reads (staff_id, notification_key) VALUES ($1, $2)
       ON CONFLICT (staff_id, notification_key) DO NOTHING`,
      [req.user.id, req.params.key]
    );
    res.json({ message: 'Marked read' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Mark all currently-visible notifications read
router.post('/mark-all-read', auth, async (req, res) => {
  const { keys } = req.body;
  if (!keys || !keys.length) return res.json({ message: 'Nothing to mark' });
  try {
    const values = keys.map((_, i) => `($1, $${i + 2})`).join(', ');
    await pool.query(
      `INSERT INTO notification_reads (staff_id, notification_key) VALUES ${values}
       ON CONFLICT (staff_id, notification_key) DO NOTHING`,
      [req.user.id, ...keys]
    );
    res.json({ message: 'All marked read' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
