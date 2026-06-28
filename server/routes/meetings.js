const express = require('express');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

const router = express.Router();

const canOrganise = (role) => ['supervisor', 'hod', 'director', 'system_admin'].includes(role);

router.get('/', auth, async (req, res) => {
  const { status } = req.query;
  try {
    let query = `
      SELECT m.*, s.full_name as organiser_name,
             (SELECT COUNT(*) FROM meeting_attendees WHERE meeting_id = m.id) as attendee_count
      FROM meetings m JOIN staff s ON m.organiser_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { params.push(status); query += ` AND m.status = $${params.length}`; }
    query += ' ORDER BY m.meeting_date DESC, m.start_time DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// My meetings (organising or invited)
router.get('/mine', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT m.*, s.full_name as organiser_name
      FROM meetings m
      JOIN staff s ON m.organiser_id = s.id
      LEFT JOIN meeting_attendees ma ON ma.meeting_id = m.id
      WHERE m.organiser_id = $1 OR ma.staff_id = $1
      ORDER BY m.meeting_date DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.*, s.full_name as organiser_name, s.job_title as organiser_title
      FROM meetings m JOIN staff s ON m.organiser_id = s.id WHERE m.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Meeting not found' });

    const { rows: attendees } = await pool.query(`
      SELECT ma.*, s.full_name, s.job_title, d.name as department_name
      FROM meeting_attendees ma JOIN staff s ON ma.staff_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE ma.meeting_id = $1 ORDER BY s.full_name
    `, [req.params.id]);

    const { rows: actionPoints } = await pool.query(`
      SELECT ap.*, s.full_name as assignee_name, t.status as task_status
      FROM meeting_action_points ap
      LEFT JOIN staff s ON ap.assigned_to = s.id
      LEFT JOIN tasks t ON ap.task_id = t.id
      WHERE ap.meeting_id = $1 ORDER BY ap.created_at
    `, [req.params.id]);

    res.json({ ...rows[0], attendees, action_points: actionPoints });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Create meeting
router.post('/', auth, async (req, res) => {
  if (!canOrganise(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  const { title, agenda, meeting_date, start_time, end_time, location, attendee_ids } = req.body;
  if (!title || !meeting_date) return res.status(400).json({ error: 'title and meeting_date required' });

  try {
    const year = new Date().getFullYear();
    const { rows: count } = await pool.query(
      'SELECT COUNT(*) FROM meetings WHERE EXTRACT(YEAR FROM created_at) = $1', [year]
    );
    const seq = String(parseInt(count[0].count) + 1).padStart(3, '0');
    const ref = `MTG/MOT/${year}/${seq}`;

    const { rows } = await pool.query(`
      INSERT INTO meetings (reference_number, title, agenda, organiser_id, meeting_date, start_time, end_time, location, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'scheduled') RETURNING *
    `, [ref, title, agenda, req.user.id, meeting_date, start_time || null, end_time || null, location]);

    if (attendee_ids && attendee_ids.length) {
      const values = attendee_ids.map((_, i) => `($1, $${i + 2}, 'invited')`).join(', ');
      await pool.query(`INSERT INTO meeting_attendees (meeting_id, staff_id, attendance_status) VALUES ${values}`,
        [rows[0].id, ...attendee_ids]);
    }

    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Record minutes / mark completed
router.patch('/:id', auth, async (req, res) => {
  const { minutes, status } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM meetings WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Meeting not found' });
    if (rows[0].organiser_id !== req.user.id) return res.status(403).json({ error: 'Only the organiser can update this meeting' });

    await pool.query(`
      UPDATE meetings SET
        minutes = COALESCE($1, minutes),
        minutes_recorded_at = CASE WHEN $1 IS NOT NULL THEN NOW() ELSE minutes_recorded_at END,
        status = COALESCE($2, status), updated_at = NOW()
      WHERE id = $3
    `, [minutes, status, req.params.id]);

    res.json({ message: 'Meeting updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Add action point (and optionally convert to a task immediately)
router.post('/:id/action-points', auth, async (req, res) => {
  const { description, assigned_to, deadline, create_task } = req.body;
  if (!description) return res.status(400).json({ error: 'description required' });

  try {
    const { rows } = await pool.query('SELECT * FROM meetings WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Meeting not found' });
    if (rows[0].organiser_id !== req.user.id) return res.status(403).json({ error: 'Only the organiser can add action points' });

    let taskId = null;
    if (create_task && assigned_to) {
      const { rows: task } = await pool.query(`
        INSERT INTO tasks (title, description, assigned_to, assigned_by, deadline, priority)
        VALUES ($1, $2, $3, $4, $5, 'normal') RETURNING id
      `, [description, `Action point from meeting: ${rows[0].title} (${rows[0].reference_number})`,
          assigned_to, req.user.id, deadline || null]);
      taskId = task[0].id;
    }

    const { rows: ap } = await pool.query(`
      INSERT INTO meeting_action_points (meeting_id, description, assigned_to, deadline, task_id)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [req.params.id, description, assigned_to || null, deadline || null, taskId]);

    res.status(201).json(ap[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
