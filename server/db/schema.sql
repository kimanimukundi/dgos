-- DGOS Database Schema
-- Ministry of Tourism & Wildlife Kenya

-- Drop in safe order
DROP TABLE IF EXISTS notices CASCADE;
DROP TABLE IF EXISTS memo_acknowledgments CASCADE;
DROP TABLE IF EXISTS memo_recipients CASCADE;
DROP TABLE IF EXISTS memo_attachments CASCADE;
DROP TABLE IF EXISTS memos CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS organisations CASCADE;

-- Core structure
CREATE TABLE organisations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  organisation_id INTEGER REFERENCES organisations(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE units (
  id SERIAL PRIMARY KEY,
  department_id INTEGER REFERENCES departments(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE staff (
  id SERIAL PRIMARY KEY,
  staff_id VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  job_title VARCHAR(255),
  grade VARCHAR(50),
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  -- roles: staff, supervisor, hod, director, system_admin, auditor
  department_id INTEGER REFERENCES departments(id),
  unit_id INTEGER REFERENCES units(id),
  supervisor_id INTEGER REFERENCES staff(id),
  employment_status VARCHAR(50) DEFAULT 'active',
  -- active, on_leave, suspended, separated
  account_status VARCHAR(50) DEFAULT 'active',
  -- active, disabled
  phone VARCHAR(50),
  must_change_password BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memos
CREATE TABLE memos (
  id SERIAL PRIMARY KEY,
  memo_number VARCHAR(100) UNIQUE NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  sender_id INTEGER REFERENCES staff(id),
  urgency VARCHAR(50) NOT NULL DEFAULT 'routine',
  -- routine, priority, urgent, confidential
  classification VARCHAR(50) DEFAULT 'internal',
  -- internal, restricted, confidential
  action_required BOOLEAN DEFAULT FALSE,
  action_description TEXT,
  action_deadline DATE,
  reference_memo_id INTEGER REFERENCES memos(id),
  status VARCHAR(50) DEFAULT 'draft',
  -- draft, published
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE memo_attachments (
  id SERIAL PRIMARY KEY,
  memo_id INTEGER REFERENCES memos(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE memo_recipients (
  id SERIAL PRIMARY KEY,
  memo_id INTEGER REFERENCES memos(id) ON DELETE CASCADE,
  staff_id INTEGER REFERENCES staff(id),
  delivery_status VARCHAR(50) DEFAULT 'delivered',
  -- delivered, opened, acknowledged
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledgment_comment TEXT
);

CREATE TABLE memo_acknowledgments (
  id SERIAL PRIMARY KEY,
  memo_recipient_id INTEGER REFERENCES memo_recipients(id),
  staff_id INTEGER REFERENCES staff(id),
  comment TEXT,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notices
CREATE TABLE notices (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  posted_by INTEGER REFERENCES staff(id),
  target VARCHAR(50) DEFAULT 'all',
  -- all, department
  target_department_id INTEGER REFERENCES departments(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES staff(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_memos_sender ON memos(sender_id);
CREATE INDEX idx_memo_recipients_staff ON memo_recipients(staff_id);
CREATE INDEX idx_memo_recipients_memo ON memo_recipients(memo_id);
CREATE INDEX idx_staff_department ON staff(department_id);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
