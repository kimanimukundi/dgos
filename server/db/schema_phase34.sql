-- Phase 3 & 4 Schema Additions
-- Run after schema.sql

-- Workflow templates
CREATE TABLE IF NOT EXISTS workflow_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  initiator_roles TEXT[] NOT NULL DEFAULT '{staff,supervisor,hod,director}',
  rejection_action VARCHAR(50) DEFAULT 'return_to_initiator',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Steps within a template (ordered)
CREATE TABLE IF NOT EXISTS workflow_template_steps (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES workflow_templates(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  label VARCHAR(255) NOT NULL,
  -- assignee is resolved by role + department of initiator's chain
  approver_role VARCHAR(50) NOT NULL,
  -- 'initiator_dept' means same dept as initiator; 'any' means org-wide role
  approver_scope VARCHAR(50) DEFAULT 'initiator_dept',
  sla_hours INTEGER DEFAULT 48,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow instances (actual requests)
CREATE TABLE IF NOT EXISTS workflow_instances (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES workflow_templates(id),
  reference_number VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  initiator_id INTEGER REFERENCES staff(id),
  current_step INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'in_progress',
  -- in_progress, completed, rejected, withdrawn
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_attachments (
  id SERIAL PRIMARY KEY,
  instance_id INTEGER REFERENCES workflow_instances(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  file_size INTEGER,
  uploaded_by INTEGER REFERENCES staff(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Each step action within an instance
CREATE TABLE IF NOT EXISTS workflow_step_actions (
  id SERIAL PRIMARY KEY,
  instance_id INTEGER REFERENCES workflow_instances(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_label VARCHAR(255) NOT NULL,
  assigned_to INTEGER REFERENCES staff(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  action VARCHAR(50),
  -- approved, rejected, returned, pending
  actioned_at TIMESTAMPTZ,
  comment TEXT,
  sla_hours INTEGER DEFAULT 48,
  sla_deadline TIMESTAMPTZ
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  assigned_to INTEGER REFERENCES staff(id),
  assigned_by INTEGER REFERENCES staff(id),
  deadline DATE,
  priority VARCHAR(50) DEFAULT 'normal',
  -- low, normal, high, critical
  status VARCHAR(50) DEFAULT 'pending',
  -- pending, in_progress, completed, overdue
  workflow_instance_id INTEGER REFERENCES workflow_instances(id),
  completion_note TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_attachments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  file_size INTEGER,
  uploaded_by INTEGER REFERENCES staff(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES staff(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  reference_number VARCHAR(100) UNIQUE NOT NULL,
  staff_id INTEGER REFERENCES staff(id),
  leave_type VARCHAR(100) NOT NULL,
  -- annual, sick, compassionate, study, maternity, paternity
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested INTEGER,
  reason TEXT,
  acting_officer_id INTEGER REFERENCES staff(id),
  status VARCHAR(50) DEFAULT 'pending',
  -- pending, approved, rejected
  supervisor_action VARCHAR(50),
  supervisor_comment TEXT,
  supervisor_actioned_at TIMESTAMPTZ,
  hr_action VARCHAR(50),
  hr_comment TEXT,
  hr_actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_instances_initiator ON workflow_instances(initiator_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_step_actions_instance ON workflow_step_actions(instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_actions_assigned ON workflow_step_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_leave_staff ON leave_requests(staff_id);
