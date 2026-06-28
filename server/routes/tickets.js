const express = require('express');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

const router = express.Router();

const ICT_DEPARTMENT_ID = 5; // Directorate of ICT — agent assignment pool
const canRaiseForOthers = (role) => ['hod', 'director', 'system_admin'].includes(role);
const isIctAgent = async (staffId) => {
  const { rows } = await pool.query('SELECT department_id FROM staff WHERE id = $1', [staffId]);
  return rows[0]?.department_id === ICT_DEPARTMENT_ID;
};

// Pick the ICT agent with fewest open (non-closed) tickets — load balancing
async function pickLeastLoadedAgent() {
  const { rows } = await pool.query(`
    SELECT s.id,
      (SELECT COUNT(*) FROM tickets t WHERE t.assigned_to = s.id AND t.status NOT IN ('resolved','closed')) as load
    FROM staff s
    WHERE s.department_id = $1 AND s.account_status = 'active'
    ORDER BY load ASC, s.id ASC LIMIT 1
  `, [ICT_DEPARTMENT_ID]);
  return rows[0]?.id || null;
}

// My tickets (raised by me or on my behalf)
router.get('/mine', auth, async (req, res) => {
  try {
    await flagAging();
    const { rows } = await pool.query(`
      SELECT t.*, a.full_name as assignee_name, rb.full_name as raised_by_name
      FROM tickets t
      LEFT JOIN staff a ON t.assigned_to = a.id
      LEFT JOIN staff rb ON t.raised_by_id = rb.id
      WHERE t.requester_id = $1
      ORDER BY CASE t.status WHEN 'open' THEN 0 WHEN 'reopened' THEN 0 WHEN 'assigned' THEN 1 WHEN 'in_progress' THEN 1 ELSE 2 END,
               t.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ICT queue (only for ICT department staff)
router.get('/queue', auth, async (req, res) => {
  if (!(await isIctAgent(req.user.id))) return res.status(403).json({ error: 'ICT staff only' });
  const { status, assigned } = req.query;
  try {
    await flagAging();
    let query = `
      SELECT t.*, r.full_name as requester_name, r.job_title as requester_title,
             d.name as requester_department, a.full_name as assignee_name
      FROM tickets t
      JOIN staff r ON t.requester_id = r.id
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN staff a ON t.assigned_to = a.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); query += ` AND t.status = $${params.length}`; }
    if (assigned === 'mine') { params.push(req.user.id); query += ` AND t.assigned_to = $${params.length}`; }
    if (assigned === 'unassigned') { query += ` AND t.assigned_to IS NULL`; }
    query += ` ORDER BY CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, t.created_at ASC`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Single ticket
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, r.full_name as requester_name, r.job_title as requester_title,
             d.name as requester_department, a.full_name as assignee_name,
             rb.full_name as raised_by_name
      FROM tickets t
      JOIN staff r ON t.requester_id = r.id
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN staff a ON t.assigned_to = a.id
      LEFT JOIN staff rb ON t.raised_by_id = rb.id
      WHERE t.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Ticket not found' });

    const isRequester = rows[0].requester_id === req.user.id;
    const isAgent = await isIctAgent(req.user.id);
    if (!isRequester && !isAgent) return res.status(403).json({ error: 'Not authorised to view this ticket' });

    const { rows: comments } = await pool.query(`
      SELECT tc.*, s.full_name as author_name FROM ticket_comments tc
      JOIN staff s ON tc.author_id = s.id WHERE tc.ticket_id = $1 ORDER BY tc.created_at ASC
    `, [req.params.id]);

    res.json({ ...rows[0], comments, is_ict_agent: isAgent });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Raise a ticket
router.post('/', auth, async (req, res) => {
  const { subject, description, category, priority, requester_id } = req.body;
  if (!subject || !description) return res.status(400).json({ error: 'subject and description required' });

  let actualRequester = req.user.id;
  if (requester_id && requester_id != req.user.id) {
    if (!canRaiseForOthers(req.user.role)) {
      return res.status(403).json({ error: 'Only HOD and above can raise tickets on behalf of others' });
    }
    actualRequester = requester_id;
  }

  try {
    const year = new Date().getFullYear();
    const { rows: count } = await pool.query(
      'SELECT COUNT(*) FROM tickets WHERE EXTRACT(YEAR FROM created_at) = $1', [year]
    );
    const seq = String(parseInt(count[0].count) + 1).padStart(3, '0');
    const ticket_number = `TKT/MOT/${year}/${seq}`;

    const agent = await pickLeastLoadedAgent();

    const { rows } = await pool.query(`
      INSERT INTO tickets (ticket_number, subject, description, category, priority, status, requester_id, raised_by_id, assigned_to)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [ticket_number, subject, description, category || 'other', priority || 'medium',
        agent ? 'assigned' : 'open', actualRequester, req.user.id, agent]);

    await pool.query(
      'INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'raise_ticket', 'ticket', rows[0].id, JSON.stringify({ ticket_number })]
    );

    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Update ticket (status, assignment, resolution) — ICT agents only, except reopen which requester can do
router.patch('/:id', auth, async (req, res) => {
  const { status, resolution_note, assigned_to, comment } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    const ticket = rows[0];
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const isAgent = await isIctAgent(req.user.id);
    const isRequester = ticket.requester_id === req.user.id;

    if (status === 'reopened') {
      if (!isRequester) return res.status(403).json({ error: 'Only the requester can reopen a ticket' });
      if (!['resolved', 'closed'].includes(ticket.status)) return res.status(400).json({ error: 'Only resolved or closed tickets can be reopened' });
      await pool.query(
        `UPDATE tickets SET status = 'reopened', reopened_count = reopened_count + 1, resolved_at = NULL, closed_at = NULL, updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );
    } else if (status) {
      if (!isAgent) return res.status(403).json({ error: 'Only ICT staff can update ticket status' });
      if (status === 'resolved' && !resolution_note && !ticket.resolution_note) {
        return res.status(400).json({ error: 'A resolution note is required to resolve a ticket' });
      }
      await pool.query(`
        UPDATE tickets SET status = $1,
          resolution_note = COALESCE($2, resolution_note),
          resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END,
          closed_at = CASE WHEN $1 = 'closed' THEN NOW() ELSE closed_at END,
          updated_at = NOW()
        WHERE id = $3
      `, [status, resolution_note || null, req.params.id]);
    }

    if (assigned_to !== undefined) {
      if (!isAgent) return res.status(403).json({ error: 'Only ICT staff can reassign tickets' });
      await pool.query(
        `UPDATE tickets SET assigned_to = $1, status = CASE WHEN status = 'open' THEN 'assigned' ELSE status END, updated_at = NOW() WHERE id = $2`,
        [assigned_to, req.params.id]
      );
    }

    if (comment) {
      if (!isAgent && !isRequester) return res.status(403).json({ error: 'Not authorised' });
      await pool.query('INSERT INTO ticket_comments (ticket_id, author_id, comment) VALUES ($1,$2,$3)', [req.params.id, req.user.id, comment]);
    }

    res.json({ message: 'Ticket updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ICT agents list (for reassignment dropdown)
router.get('/meta/agents', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.id, s.full_name, s.job_title,
        (SELECT COUNT(*) FROM tickets t WHERE t.assigned_to = s.id AND t.status NOT IN ('resolved','closed')) as open_count
      FROM staff s WHERE s.department_id = $1 AND s.account_status = 'active' ORDER BY s.full_name
    `, [ICT_DEPARTMENT_ID]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Mark tickets unassigned/unresolved past aging thresholds — soft flag via a computed field, not a status change
async function flagAging() {
  // No-op placeholder: aging is computed client-side from created_at/status to avoid mutating status.
  // Kept as a function for parity with tasks/workflow patterns and future extension (e.g. notifications).
  return true;
}

module.exports = router;
