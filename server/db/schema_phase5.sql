-- Phase 5: Asset Registry, Meeting Management, Contract Registry
-- Plus depth additions: workflow step attachments, task subtasks/attachments

-- ===== ASSET REGISTRY =====

CREATE TABLE IF NOT EXISTS asset_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  asset_tag VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_id INTEGER REFERENCES asset_categories(id),
  description TEXT,
  serial_number VARCHAR(255),
  purchase_date DATE,
  purchase_value NUMERIC(12,2),
  current_value NUMERIC(12,2),
  condition VARCHAR(50) DEFAULT 'good',
  -- good, fair, poor, non_functional
  status VARCHAR(50) DEFAULT 'in_use',
  -- in_use, in_storage, under_repair, disposed
  department_id INTEGER REFERENCES departments(id),
  custodian_id INTEGER REFERENCES staff(id),
  location VARCHAR(255),
  disposed_at TIMESTAMPTZ,
  disposal_workflow_id INTEGER REFERENCES workflow_instances(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link table: which assets a disposal workflow covers
CREATE TABLE IF NOT EXISTS workflow_assets (
  id SERIAL PRIMARY KEY,
  instance_id INTEGER REFERENCES workflow_instances(id) ON DELETE CASCADE,
  asset_id INTEGER REFERENCES assets(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instance_id, asset_id)
);

-- Link table: which assets a task relates to
CREATE TABLE IF NOT EXISTS task_assets (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  asset_id INTEGER REFERENCES assets(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, asset_id)
);

-- Asset history log (separate from generic audit log — asset-specific lifecycle events)
CREATE TABLE IF NOT EXISTS asset_history (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
  event VARCHAR(100) NOT NULL,
  -- created, status_changed, custodian_changed, disposed
  detail TEXT,
  actor_id INTEGER REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== MEETING MANAGEMENT =====

CREATE TABLE IF NOT EXISTS meetings (
  id SERIAL PRIMARY KEY,
  reference_number VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  agenda TEXT,
  organiser_id INTEGER REFERENCES staff(id),
  meeting_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'scheduled',
  -- scheduled, completed, cancelled
  minutes TEXT,
  minutes_recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_attendees (
  id SERIAL PRIMARY KEY,
  meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
  staff_id INTEGER REFERENCES staff(id),
  attendance_status VARCHAR(50) DEFAULT 'invited',
  -- invited, attended, apologised, absent
  UNIQUE(meeting_id, staff_id)
);

CREATE TABLE IF NOT EXISTS meeting_action_points (
  id SERIAL PRIMARY KEY,
  meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  assigned_to INTEGER REFERENCES staff(id),
  deadline DATE,
  task_id INTEGER REFERENCES tasks(id),
  -- set once converted to an actual task
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== CONTRACT & VENDOR REGISTRY =====

CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  reference_number VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  vendor_id INTEGER REFERENCES vendors(id),
  department_id INTEGER REFERENCES departments(id),
  contract_value NUMERIC(14,2),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  -- active, expired, terminated, renewed
  description TEXT,
  managed_by INTEGER REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contract_documents (
  id SERIAL PRIMARY KEY,
  contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  uploaded_by INTEGER REFERENCES staff(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== DEPTH: workflow step attachments (table existed, ensure present) =====
-- workflow_attachments already exists in schema_phase34.sql — adding step-level link
ALTER TABLE workflow_attachments ADD COLUMN IF NOT EXISTS step_order INTEGER;

-- ===== DEPTH: workflow withdraw support =====
-- 'withdrawn' status already allowed in workflow_instances.status — no schema change needed

-- ===== DEPTH: task subtasks =====
CREATE TABLE IF NOT EXISTS subtasks (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- task_attachments already exists in schema_phase34.sql

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_department ON assets(department_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_custodian ON assets(custodian_id);
CREATE INDEX IF NOT EXISTS idx_workflow_assets_instance ON workflow_assets(instance_id);
CREATE INDEX IF NOT EXISTS idx_task_assets_task ON task_assets(task_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_staff ON meeting_attendees(staff_id);
CREATE INDEX IF NOT EXISTS idx_contracts_vendor ON contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
