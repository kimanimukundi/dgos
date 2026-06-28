const express = require('express');
const pool = require('../db/pool');
const { auth } = require('../middleware/auth');

const router = express.Router();

const canInitiate = (role) => ['supervisor', 'hod', 'director', 'system_admin'].includes(role);

// Get all templates
router.get('/templates', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, COUNT(s.id) as step_count
       FROM workflow_templates t
       LEFT JOIN workflow_template_steps s ON t.id = s.template_id
       WHERE t.active = TRUE
       GROUP BY t.id ORDER BY t.name`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Get template with steps
router.get('/templates/:id', auth, async (req, res) => {
  try {
    const { rows: templates } = await pool.query('SELECT * FROM workflow_templates WHERE id = $1', [req.params.id]);
    if (!templates[0]) return res.status(404).json({ error: 'Template not found' });
    const { rows: steps } = await pool.query(
      'SELECT * FROM workflow_template_steps WHERE template_id = $1 ORDER BY step_order',
      [req.params.id]
    );
    res.json({ ...templates[0], steps });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Get all instances (filtered by role)
router.get('/', auth, async (req, res) => {
  const { status, mine } = req.query;
  try {
    let query = `
      SELECT wi.id, wi.reference_number, wi.title, wi.status, wi.current_step,
             wi.created_at, wi.completed_at,
             wt.name as template_name,
             s.full_name as initiator_name, s.job_title as initiator_title,
             d.name as initiator_department,
             (SELECT COUNT(*) FROM workflow_template_steps WHERE template_id = wi.template_id) as total_steps,
             (SELECT wsa.assigned_to FROM workflow_step_actions wsa
              WHERE wsa.instance_id = wi.id AND wsa.step_order = wi.current_step LIMIT 1) as current_assignee_id
      FROM workflow_instances wi
      JOIN workflow_templates wt ON wi.template_id = wt.id
      JOIN staff s ON wi.initiator_id = s.id
      LEFT JOIN departments d ON s.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (status) { params.push(status); query += ` AND wi.status = $${params.length}`; }
    if (mine === 'true') { params.push(req.user.id); query += ` AND wi.initiator_id = $${params.length}`; }

    query += ' ORDER BY wi.created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Get instances pending my action
router.get('/pending-my-action', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT wi.id, wi.reference_number, wi.title, wi.status, wi.current_step,
              wi.created_at, wt.name as template_name,
              s.full_name as initiator_name,
              wsa.step_label, wsa.assigned_at, wsa.sla_deadline
       FROM workflow_step_actions wsa
       JOIN workflow_instances wi ON wsa.instance_id = wi.id
       JOIN workflow_templates wt ON wi.template_id = wt.id
       JOIN staff s ON wi.initiator_id = s.id
       WHERE wsa.assigned_to = $1 AND wsa.action IS NULL AND wi.status = 'in_progress'
       AND wsa.step_order = wi.current_step
       ORDER BY wsa.sla_deadline ASC NULLS LAST`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Get single instance with full history
router.get('/:id', auth, async (req, res) => {
  try {
    const { rows: instances } = await pool.query(
      `SELECT wi.*, wt.name as template_name, wt.description as template_description,
              s.full_name as initiator_name, s.job_title as initiator_title,
              d.name as initiator_department,
              (SELECT COUNT(*) FROM workflow_template_steps WHERE template_id = wi.template_id) as total_steps
       FROM workflow_instances wi
       JOIN workflow_templates wt ON wi.template_id = wt.id
       JOIN staff s ON wi.initiator_id = s.id
       LEFT JOIN departments d ON s.department_id = d.id
       WHERE wi.id = $1`,
      [req.params.id]
    );
    if (!instances[0]) return res.status(404).json({ error: 'Not found' });

    const { rows: steps } = await pool.query(
      `SELECT wsa.*, s.full_name as assignee_name, s.job_title as assignee_title
       FROM workflow_step_actions wsa
       LEFT JOIN staff s ON wsa.assigned_to = s.id
       WHERE wsa.instance_id = $1 ORDER BY wsa.step_order`,
      [req.params.id]
    );

    const { rows: templateSteps } = await pool.query(
      'SELECT * FROM workflow_template_steps WHERE template_id = $1 ORDER BY step_order',
      [instances[0].template_id]
    );

    // Is this step assigned to me?
    const myStep = steps.find(s => s.assigned_to === req.user.id && s.action === null && s.step_order === instances[0].current_step);

    // Linked assets (for Asset Disposal workflows)
    const { rows: linkedAssets } = await pool.query(
      `SELECT a.id, a.asset_tag, a.name, a.condition, a.status, a.current_value
       FROM workflow_assets wa JOIN assets a ON wa.asset_id = a.id
       WHERE wa.instance_id = $1`,
      [req.params.id]
    );

    res.json({ ...instances[0], steps, template_steps: templateSteps, my_pending_step: myStep || null, linked_assets: linkedAssets });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Get assets available to link (active, not already disposed)
router.get('/assets/available', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, asset_tag, name, condition, status, department_id
       FROM assets WHERE status != 'disposed' ORDER BY asset_tag`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Initiate a new workflow
router.post('/', auth, async (req, res) => {
  if (!canInitiate(req.user.role) &&
      req.body.template_id !== 2) { // leave can be initiated by anyone
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { template_id, title, description, asset_ids } = req.body;
  if (!template_id || !title) return res.status(400).json({ error: 'template_id and title required' });

  try {
    const { rows: templates } = await pool.query(
      'SELECT * FROM workflow_templates WHERE id = $1 AND active = TRUE', [template_id]
    );
    if (!templates[0]) return res.status(404).json({ error: 'Template not found' });

    const { rows: steps } = await pool.query(
      'SELECT * FROM workflow_template_steps WHERE template_id = $1 ORDER BY step_order', [template_id]
    );
    if (!steps.length) return res.status(400).json({ error: 'Template has no steps' });

    // Generate reference number
    const year = new Date().getFullYear();
    const { rows: count } = await pool.query(
      'SELECT COUNT(*) FROM workflow_instances WHERE EXTRACT(YEAR FROM created_at) = $1', [year]
    );
    const seq = String(parseInt(count[0].count) + 1).padStart(3, '0');
    const ref = `WF/MOT/${year}/${seq}`;

    // Create instance
    const { rows: instances } = await pool.query(
      `INSERT INTO workflow_instances (template_id, reference_number, title, description, initiator_id, current_step, status)
       VALUES ($1, $2, $3, $4, $5, 1, 'in_progress') RETURNING *`,
      [template_id, ref, title, description, req.user.id]
    );
    const instance = instances[0];

    // Link assets if provided (used by Asset Disposal template)
    if (asset_ids && asset_ids.length) {
      const values = asset_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
      await pool.query(
        `INSERT INTO workflow_assets (instance_id, asset_id) VALUES ${values}`,
        [instance.id, ...asset_ids]
      );
    }

    // Resolve first step assignee
    const firstStep = steps[0];
    const assignee = await resolveAssignee(firstStep, req.user.id);

    // Create all step action placeholders; assign only first
    for (const step of steps) {
      const isFirst = step.step_order === 1;
      const slaDeadline = isFirst ? new Date(Date.now() + step.sla_hours * 3600000) : null;
      await pool.query(
        `INSERT INTO workflow_step_actions (instance_id, step_order, step_label, assigned_to, assigned_at, sla_hours, sla_deadline)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [instance.id, step.step_order, step.label, isFirst ? assignee : null,
         isFirst ? new Date() : null, step.sla_hours, slaDeadline]
      );
    }

    await pool.query(
      'INSERT INTO audit_log (actor_id, action, entity_type, entity_id, metadata) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'initiate_workflow', 'workflow', instance.id, JSON.stringify({ ref, template: templates[0].name })]
    );

    res.status(201).json({ ...instance, reference_number: ref });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Act on a step (approve / reject / return)
router.post('/:id/action', auth, async (req, res) => {
  const { action, comment } = req.body;
  if (!['approved', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'action must be approved or rejected' });
  }

  try {
    const { rows: instances } = await pool.query(
      'SELECT * FROM workflow_instances WHERE id = $1', [req.params.id]
    );
    const instance = instances[0];
    if (!instance) return res.status(404).json({ error: 'Workflow not found' });
    if (instance.status !== 'in_progress') return res.status(400).json({ error: 'Workflow is not in progress' });

    // Verify this step is assigned to me
    const { rows: mySteps } = await pool.query(
      `SELECT * FROM workflow_step_actions
       WHERE instance_id = $1 AND step_order = $2 AND assigned_to = $3 AND action IS NULL`,
      [req.params.id, instance.current_step, req.user.id]
    );
    if (!mySteps[0]) return res.status(403).json({ error: 'This step is not assigned to you' });

    // Record action
    await pool.query(
      `UPDATE workflow_step_actions SET action = $1, actioned_at = NOW(), comment = $2
       WHERE instance_id = $3 AND step_order = $4 AND assigned_to = $5`,
      [action, comment || null, req.params.id, instance.current_step, req.user.id]
    );

    if (action === 'approved') {
      // Get total steps
      const { rows: stepCount } = await pool.query(
        'SELECT COUNT(*) FROM workflow_template_steps WHERE template_id = $1', [instance.template_id]
      );
      const total = parseInt(stepCount[0].count);

      if (instance.current_step >= total) {
        // Final step approved — complete workflow
        await pool.query(
          "UPDATE workflow_instances SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1",
          [req.params.id]
        );
        await pool.query(
          'INSERT INTO audit_log (actor_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
          [req.user.id, 'complete_workflow', 'workflow', req.params.id]
        );

        // If this is an Asset Disposal workflow, mark linked assets as disposed
        const { rows: templateCheck } = await pool.query(
          'SELECT name FROM workflow_templates WHERE id = $1', [instance.template_id]
        );
        if (templateCheck[0]?.name === 'Asset Disposal') {
          const { rows: linkedAssets } = await pool.query(
            'SELECT asset_id FROM workflow_assets WHERE instance_id = $1', [req.params.id]
          );
          for (const { asset_id } of linkedAssets) {
            await pool.query(
              `UPDATE assets SET status = 'disposed', disposed_at = NOW(), disposal_workflow_id = $1, updated_at = NOW() WHERE id = $2`,
              [req.params.id, asset_id]
            );
            await pool.query(
              'INSERT INTO asset_history (asset_id, event, detail, actor_id) VALUES ($1, $2, $3, $4)',
              [asset_id, 'disposed', `Disposed per ${instance.reference_number}`, req.user.id]
            );
          }
        }
      } else {
        // Advance to next step
        const nextStep = instance.current_step + 1;
        const { rows: nextStepDef } = await pool.query(
          'SELECT * FROM workflow_template_steps WHERE template_id = $1 AND step_order = $2',
          [instance.template_id, nextStep]
        );
        const assignee = await resolveAssignee(nextStepDef[0], instance.initiator_id);
        const slaDeadline = new Date(Date.now() + nextStepDef[0].sla_hours * 3600000);

        await pool.query(
          `UPDATE workflow_step_actions SET assigned_to = $1, assigned_at = NOW(), sla_deadline = $2
           WHERE instance_id = $3 AND step_order = $4`,
          [assignee, slaDeadline, req.params.id, nextStep]
        );
        await pool.query(
          'UPDATE workflow_instances SET current_step = $1, updated_at = NOW() WHERE id = $2',
          [nextStep, req.params.id]
        );
      }
    } else {
      // Rejected — return to initiator
      await pool.query(
        "UPDATE workflow_instances SET status = 'rejected', updated_at = NOW() WHERE id = $1",
        [req.params.id]
      );
      await pool.query(
        'INSERT INTO audit_log (actor_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
        [req.user.id, 'reject_workflow', 'workflow', req.params.id]
      );
    }

    res.json({ message: `Workflow step ${action}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Withdraw a workflow (initiator only, while in progress)
router.post('/:id/withdraw', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM workflow_instances WHERE id = $1', [req.params.id]);
    const instance = rows[0];
    if (!instance) return res.status(404).json({ error: 'Workflow not found' });
    if (instance.initiator_id !== req.user.id) return res.status(403).json({ error: 'Only the initiator can withdraw this request' });
    if (instance.status !== 'in_progress') return res.status(400).json({ error: 'Only in-progress workflows can be withdrawn' });

    await pool.query(
      "UPDATE workflow_instances SET status = 'withdrawn', updated_at = NOW() WHERE id = $1",
      [req.params.id]
    );
    await pool.query(
      'INSERT INTO audit_log (actor_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'withdraw_workflow', 'workflow', req.params.id]
    );

    res.json({ message: 'Workflow withdrawn' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Resolve assignee for a step
async function resolveAssignee(step, initiatorId) {
  try {
    const { rows: initiator } = await pool.query(
      'SELECT * FROM staff WHERE id = $1', [initiatorId]
    );
    const init = initiator[0];

    if (step.approver_scope === 'initiator_dept') {
      // Find someone with the right role in the initiator's department
      const { rows } = await pool.query(
        `SELECT id FROM staff WHERE role = $1 AND department_id = $2 AND account_status = 'active' LIMIT 1`,
        [step.approver_role, init.department_id]
      );
      if (rows[0]) return rows[0].id;
    }

    // Fall back to org-wide role
    const { rows } = await pool.query(
      `SELECT id FROM staff WHERE role = $1 AND account_status = 'active' ORDER BY id LIMIT 1`,
      [step.approver_role]
    );
    return rows[0]?.id || null;
  } catch { return null; }
}

module.exports = router;
