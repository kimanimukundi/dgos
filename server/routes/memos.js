const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db/pool');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// File upload setup
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Role-based send permissions
const canSendMemo = (role) => ['supervisor', 'hod', 'director', 'system_admin'].includes(role);

// Get memos for current user (inbox)
router.get('/inbox', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.id, m.memo_number, m.subject, m.urgency, m.classification,
              m.action_required, m.action_deadline, m.published_at,
              s.full_name as sender_name, s.job_title as sender_title,
              d.name as sender_department,
              mr.delivery_status, mr.opened_at, mr.acknowledged_at
       FROM memo_recipients mr
       JOIN memos m ON mr.memo_id = m.id
       JOIN staff s ON m.sender_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE mr.staff_id = $1 AND m.status = 'published'
       ORDER BY m.published_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get memos sent by current user (outbox)
router.get('/sent', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.*,
              COUNT(mr.id) as total_recipients,
              COUNT(mr.acknowledged_at) as acknowledged_count,
              COUNT(mr.opened_at) as opened_count
       FROM memos m
       LEFT JOIN memo_recipients mr ON m.id = mr.memo_id
       WHERE m.sender_id = $1 AND m.status = 'published'
       GROUP BY m.id
       ORDER BY m.published_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get drafts
router.get('/drafts', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM memos WHERE sender_id = $1 AND status = 'draft' ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all memos (registry / auditor view)
router.get('/registry', auth, async (req, res) => {
  const { search, urgency, from_date, to_date } = req.query;
  try {
    let query = `
      SELECT m.id, m.memo_number, m.subject, m.urgency, m.classification,
             m.published_at, m.action_required,
             s.full_name as sender_name, d.name as sender_department,
             COUNT(mr.id) as total_recipients,
             COUNT(mr.acknowledged_at) as acknowledged_count
      FROM memos m
      JOIN staff s ON m.sender_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN memo_recipients mr ON m.id = mr.memo_id
      WHERE m.status = 'published'
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (m.subject ILIKE $${params.length} OR m.memo_number ILIKE $${params.length})`;
    }
    if (urgency) {
      params.push(urgency);
      query += ` AND m.urgency = $${params.length}`;
    }
    if (from_date) {
      params.push(from_date);
      query += ` AND m.published_at >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date);
      query += ` AND m.published_at <= $${params.length}`;
    }

    query += ' GROUP BY m.id, s.full_name, d.name ORDER BY m.published_at DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single memo with full detail
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows: memos } = await pool.query(
      `SELECT m.*,
              s.full_name as sender_name, s.job_title as sender_title,
              d.name as sender_department,
              ref.memo_number as reference_memo_number, ref.subject as reference_memo_subject
       FROM memos m
       JOIN staff s ON m.sender_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN memos ref ON m.reference_memo_id = ref.id
       WHERE m.id = $1`,
      [req.params.id]
    );

    if (!memos[0]) return res.status(404).json({ error: 'Memo not found' });
    const memo = memos[0];

    // Get attachments
    const { rows: attachments } = await pool.query(
      'SELECT id, original_name, file_size, mime_type, uploaded_at FROM memo_attachments WHERE memo_id = $1',
      [req.params.id]
    );

    // Get recipients with status
    const { rows: recipients } = await pool.query(
      `SELECT mr.*, s.full_name, s.job_title, d.name as department_name
       FROM memo_recipients mr
       JOIN staff s ON mr.staff_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE mr.memo_id = $1
       ORDER BY s.full_name`,
      [req.params.id]
    );

    // Get current user's recipient record (if any)
    const myRecord = recipients.find(r => r.staff_id === req.user.id);

    // Mark as opened if recipient hasn't opened yet
    if (myRecord && !myRecord.opened_at) {
      await pool.query(
        'UPDATE memo_recipients SET delivery_status = $1, opened_at = NOW() WHERE memo_id = $2 AND staff_id = $3',
        ['opened', req.params.id, req.user.id]
      );
      myRecord.opened_at = new Date();
      myRecord.delivery_status = 'opened';

      await pool.query(
        'INSERT INTO audit_log (actor_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
        [req.user.id, 'open_memo', 'memo', req.params.id]
      );
    }

    res.json({ ...memo, attachments, recipients, my_status: myRecord || null });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create/update draft
router.post('/', auth, async (req, res) => {
  if (!canSendMemo(req.user.role)) {
    return res.status(403).json({ error: 'Your role cannot create memos' });
  }

  const { subject, body, urgency, classification, action_required, action_description, action_deadline, reference_memo_id } = req.body;
  if (!subject || !body) return res.status(400).json({ error: 'Subject and body required' });

  try {
    // Generate draft memo number placeholder
    const { rows } = await pool.query(
      `INSERT INTO memos (memo_number, subject, body, sender_id, urgency, classification, action_required, action_description, action_deadline, reference_memo_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft')
       RETURNING *`,
      [`DRAFT-${Date.now()}`, subject, body, req.user.id, urgency || 'routine', classification || 'internal',
       action_required || false, action_description, action_deadline || null, reference_memo_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Publish a memo with recipients
router.post('/:id/publish', auth, async (req, res) => {
  if (!canSendMemo(req.user.role)) {
    return res.status(403).json({ error: 'Your role cannot publish memos' });
  }

  const { recipient_type, recipient_ids, department_ids, all_staff } = req.body;

  try {
    const { rows: memos } = await pool.query(
      'SELECT * FROM memos WHERE id = $1 AND sender_id = $2 AND status = $3',
      [req.params.id, req.user.id, 'draft']
    );
    if (!memos[0]) return res.status(404).json({ error: 'Draft not found' });

    // Generate official memo number
    const year = new Date().getFullYear();
    const { rows: count } = await pool.query(
      "SELECT COUNT(*) FROM memos WHERE status = 'published' AND EXTRACT(YEAR FROM published_at) = $1",
      [year]
    );
    const seq = String(parseInt(count[0].count) + 1).padStart(3, '0');
    const memo_number = `MEMO/MOT/${year}/${seq}`;

    // Collect recipient staff IDs
    let staffIds = [];

    if (all_staff) {
      const { rows } = await pool.query("SELECT id FROM staff WHERE account_status = 'active' AND id != $1", [req.user.id]);
      staffIds = rows.map(r => r.id);
    } else {
      if (recipient_ids?.length) staffIds.push(...recipient_ids);
      if (department_ids?.length) {
        const { rows } = await pool.query(
          "SELECT id FROM staff WHERE department_id = ANY($1) AND account_status = 'active' AND id != $2",
          [department_ids, req.user.id]
        );
        staffIds.push(...rows.map(r => r.id));
      }
    }

    // Deduplicate
    staffIds = [...new Set(staffIds)];
    if (!staffIds.length) return res.status(400).json({ error: 'No recipients selected' });

    // Publish memo
    await pool.query(
      "UPDATE memos SET status = 'published', memo_number = $1, published_at = NOW(), updated_at = NOW() WHERE id = $2",
      [memo_number, req.params.id]
    );

    // Create recipient records
    const recipientValues = staffIds.map((sid, i) => `($1, $${i + 2})`).join(', ');
    await pool.query(
      `INSERT INTO memo_recipients (memo_id, staff_id) VALUES ${recipientValues}`,
      [req.params.id, ...staffIds]
    );

    await pool.query(
      'INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'publish_memo', 'memo', req.params.id, JSON.stringify({ memo_number, recipients: staffIds.length })]
    );

    res.json({ message: 'Memo published', memo_number, recipients: staffIds.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Acknowledge a memo
router.post('/:id/acknowledge', auth, async (req, res) => {
  const { comment } = req.body;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM memo_recipients WHERE memo_id = $1 AND staff_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'You are not a recipient of this memo' });
    if (rows[0].acknowledged_at) return res.status(400).json({ error: 'Already acknowledged' });

    await pool.query(
      `UPDATE memo_recipients
       SET delivery_status = 'acknowledged', acknowledged_at = NOW()
       WHERE memo_id = $1 AND staff_id = $2`,
      [req.params.id, req.user.id]
    );

    if (comment) {
      await pool.query(
        'INSERT INTO memo_acknowledgments (memo_recipient_id, staff_id, comment) VALUES ($1, $2, $3)',
        [rows[0].id, req.user.id, comment]
      );
    }

    await pool.query(
      'INSERT INTO audit_log (actor_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'acknowledge_memo', 'memo', req.params.id]
    );

    res.json({ message: 'Memo acknowledged' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tracking for a sent memo
router.get('/:id/tracking', auth, async (req, res) => {
  try {
    const { rows: memo } = await pool.query(
      'SELECT * FROM memos WHERE id = $1 AND sender_id = $2',
      [req.params.id, req.user.id]
    );
    // Allow auditors and directors to view any tracking
    const { rows: memoAny } = !memo[0]
      ? await pool.query('SELECT * FROM memos WHERE id = $1', [req.params.id])
      : { rows: memo };

    if (!memoAny[0]) return res.status(404).json({ error: 'Memo not found' });

    if (!memo[0] && !['auditor', 'director'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorised to view tracking' });
    }

    const { rows } = await pool.query(
      `SELECT mr.staff_id, s.full_name, s.job_title,
              d.name as department_name,
              mr.delivery_status, mr.delivered_at, mr.opened_at, mr.acknowledged_at,
              ma.comment as acknowledgment_comment
       FROM memo_recipients mr
       JOIN staff s ON mr.staff_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN memo_acknowledgments ma ON ma.memo_recipient_id = mr.id
       WHERE mr.memo_id = $1
       ORDER BY mr.acknowledged_at NULLS LAST, s.full_name`,
      [req.params.id]
    );

    const summary = {
      total: rows.length,
      acknowledged: rows.filter(r => r.delivery_status === 'acknowledged').length,
      opened: rows.filter(r => r.delivery_status === 'opened').length,
      delivered: rows.filter(r => r.delivery_status === 'delivered').length,
    };

    res.json({ memo: memoAny[0], recipients: rows, summary });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
