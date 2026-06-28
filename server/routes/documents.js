const express = require('express');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

const router = express.Router();

// List documents (published visible to all, drafts only to uploader/dept)
router.get('/', auth, async (req, res) => {
  const { type, department_id, search } = req.query;
  try {
    let query = `
      SELECT d.*, dep.name as department_name, s.full_name as uploaded_by_name,
             dv.version_number, dv.original_name, dv.file_size, dv.uploaded_at as version_uploaded_at,
             wi.reference_number as workflow_ref
      FROM documents d
      LEFT JOIN departments dep ON d.department_id = dep.id
      LEFT JOIN staff s ON d.uploaded_by = s.id
      LEFT JOIN document_versions dv ON d.current_version_id = dv.id
      LEFT JOIN workflow_instances wi ON d.workflow_instance_id = wi.id
      WHERE (d.status != 'draft' OR d.uploaded_by = $1 OR d.department_id = $2)
    `;
    const params = [req.user.id, req.user.department_id || 0];
    if (type) { params.push(type); query += ` AND d.document_type = $${params.length}`; }
    if (department_id) { params.push(department_id); query += ` AND d.department_id = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (d.title ILIKE $${params.length} OR d.document_number ILIKE $${params.length} OR d.description ILIKE $${params.length})`;
    }
    query += ' ORDER BY d.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Single document with version history
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT d.*, dep.name as department_name, s.full_name as uploaded_by_name,
             wi.reference_number as workflow_ref, wi.title as workflow_title
      FROM documents d
      LEFT JOIN departments dep ON d.department_id = dep.id
      LEFT JOIN staff s ON d.uploaded_by = s.id
      LEFT JOIN workflow_instances wi ON d.workflow_instance_id = wi.id
      WHERE d.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Document not found' });

    const doc = rows[0];
    if (doc.status === 'draft' && doc.uploaded_by !== req.user.id && doc.department_id !== req.user.department_id) {
      return res.status(403).json({ error: 'Not authorised to view this document' });
    }

    const { rows: versions } = await pool.query(`
      SELECT dv.*, s.full_name as uploaded_by_name
      FROM document_versions dv LEFT JOIN staff s ON dv.uploaded_by = s.id
      WHERE dv.document_id = $1 ORDER BY dv.version_number DESC
    `, [req.params.id]);

    res.json({ ...doc, versions });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Create a new document (with initial version)
router.post('/', auth, async (req, res) => {
  const { title, document_type, department_id, description, status, original_name, workflow_instance_id } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  try {
    const year = new Date().getFullYear();
    const { rows: count } = await pool.query(
      'SELECT COUNT(*) FROM documents WHERE EXTRACT(YEAR FROM created_at) = $1', [year]
    );
    const seq = String(parseInt(count[0].count) + 1).padStart(3, '0');
    const document_number = `DOC/MOT/${year}/${seq}`;

    const { rows: doc } = await pool.query(`
      INSERT INTO documents (document_number, title, document_type, department_id, description, status, uploaded_by, workflow_instance_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [document_number, title, document_type || 'other', department_id || req.user.department_id || null,
        description, status || 'published', req.user.id, workflow_instance_id || null]);

    const { rows: version } = await pool.query(`
      INSERT INTO document_versions (document_id, version_number, original_name, change_note, uploaded_by)
      VALUES ($1, 1, $2, 'Initial publication', $3) RETURNING *
    `, [doc[0].id, original_name || `${title}.pdf`, req.user.id]);

    await pool.query('UPDATE documents SET current_version_id = $1 WHERE id = $2', [version[0].id, doc[0].id]);

    await pool.query(
      'INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata) VALUES ($1,$2,$3,$4,$5)',
      [req.user.id, 'upload_document', 'document', doc[0].id, JSON.stringify({ document_number })]
    );

    res.status(201).json({ ...doc[0], current_version_id: version[0].id });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Upload a new version of an existing document
router.post('/:id/versions', auth, async (req, res) => {
  const { original_name, change_note } = req.body;
  try {
    const { rows: doc } = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!doc[0]) return res.status(404).json({ error: 'Document not found' });

    const { rows: lastVersion } = await pool.query(
      'SELECT MAX(version_number) as max FROM document_versions WHERE document_id = $1', [req.params.id]
    );
    const nextVersion = (lastVersion[0].max || 0) + 1;

    const { rows: version } = await pool.query(`
      INSERT INTO document_versions (document_id, version_number, original_name, change_note, uploaded_by)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [req.params.id, nextVersion, original_name || `${doc[0].title}_v${nextVersion}.pdf`, change_note, req.user.id]);

    await pool.query(
      `UPDATE documents SET current_version_id = $1, status = 'published', updated_at = NOW() WHERE id = $2`,
      [version[0].id, req.params.id]
    );

    res.status(201).json(version[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Update status (publish a draft, archive, etc)
router.patch('/:id', auth, async (req, res) => {
  const { status } = req.body;
  try {
    const { rows: doc } = await pool.query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (!doc[0]) return res.status(404).json({ error: 'Document not found' });
    if (doc[0].uploaded_by !== req.user.id && !['hod','director','system_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorised' });
    }
    await pool.query('UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2', [status, req.params.id]);
    res.json({ message: 'Document updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
