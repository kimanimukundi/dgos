const express = require('express');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json({ memos: [], workflows: [], tasks: [], assets: [], documents: [], contracts: [], tickets: [] });

  const term = `%${q.trim()}%`;
  const userId = req.user.id;
  const userDept = req.user.department_id || 0;

  try {
    // Memos — only ones the user sent or received
    const memosP = pool.query(`
      SELECT DISTINCT m.id, m.memo_number as ref, m.subject as title, m.published_at as date
      FROM memos m
      LEFT JOIN memo_recipients mr ON m.id = mr.memo_id
      WHERE m.status = 'published' AND (m.subject ILIKE $1 OR m.memo_number ILIKE $1)
      AND (m.sender_id = $2 OR mr.staff_id = $2)
      ORDER BY m.published_at DESC LIMIT 5
    `, [term, userId]);

    // Workflows — initiated by, or assigned a step to, this user; HOD+/auditor see all
    const isPrivileged = ['hod', 'director', 'auditor', 'system_admin'].includes(req.user.role);
    const workflowsP = isPrivileged
      ? pool.query(`
          SELECT id, reference_number as ref, title, created_at as date FROM workflow_instances
          WHERE (title ILIKE $1 OR reference_number ILIKE $1) ORDER BY created_at DESC LIMIT 5
        `, [term])
      : pool.query(`
          SELECT DISTINCT wi.id, wi.reference_number as ref, wi.title, wi.created_at as date
          FROM workflow_instances wi
          LEFT JOIN workflow_step_actions wsa ON wi.id = wsa.instance_id
          WHERE (wi.title ILIKE $1 OR wi.reference_number ILIKE $1)
          AND (wi.initiator_id = $2 OR wsa.assigned_to = $2)
          ORDER BY wi.created_at DESC LIMIT 5
        `, [term, userId]);

    // Tasks — assigned to or by this user
    const tasksP = pool.query(`
      SELECT id, title, deadline as date FROM tasks
      WHERE title ILIKE $1 AND (assigned_to = $2 OR assigned_by = $2)
      ORDER BY created_at DESC LIMIT 5
    `, [term, userId]);

    // Assets — visible to all staff
    const assetsP = pool.query(`
      SELECT id, asset_tag as ref, name as title, created_at as date FROM assets
      WHERE (name ILIKE $1 OR asset_tag ILIKE $1 OR serial_number ILIKE $1)
      ORDER BY asset_tag LIMIT 5
    `, [term]);

    // Documents — published visible to all, drafts only own/dept
    const documentsP = pool.query(`
      SELECT id, document_number as ref, title, created_at as date FROM documents
      WHERE (title ILIKE $1 OR document_number ILIKE $1)
      AND (status != 'draft' OR uploaded_by = $2 OR department_id = $3)
      ORDER BY created_at DESC LIMIT 5
    `, [term, userId, userDept]);

    // Contracts — visible to all staff
    const contractsP = pool.query(`
      SELECT id, reference_number as ref, title, end_date as date FROM contracts
      WHERE (title ILIKE $1 OR reference_number ILIKE $1)
      ORDER BY created_at DESC LIMIT 5
    `, [term]);

    // Tickets — own tickets, or any ticket if ICT staff (department_id = 5)
    const ticketsP = req.user.department_id === 5
      ? pool.query(`
          SELECT id, ticket_number as ref, subject as title, created_at as date FROM tickets
          WHERE (subject ILIKE $1 OR ticket_number ILIKE $1) ORDER BY created_at DESC LIMIT 5
        `, [term])
      : pool.query(`
          SELECT id, ticket_number as ref, subject as title, created_at as date FROM tickets
          WHERE (subject ILIKE $1 OR ticket_number ILIKE $1) AND requester_id = $2
          ORDER BY created_at DESC LIMIT 5
        `, [term, userId]);

    const [memos, workflows, tasks, assets, documents, contracts, tickets] = await Promise.all([
      memosP, workflowsP, tasksP, assetsP, documentsP, contractsP, ticketsP
    ]);

    res.json({
      memos: memos.rows, workflows: workflows.rows, tasks: tasks.rows,
      assets: assets.rows, documents: documents.rows, contracts: contracts.rows, tickets: tickets.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
