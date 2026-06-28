-- Phase 7: Document Management

CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  document_number VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  document_type VARCHAR(50) NOT NULL DEFAULT 'other',
  -- policy, circular, report, guideline, other
  department_id INTEGER REFERENCES departments(id),
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'published',
  -- draft, published, superseded, archived
  current_version_id INTEGER,
  -- points to the latest row in document_versions
  uploaded_by INTEGER REFERENCES staff(id),
  workflow_instance_id INTEGER REFERENCES workflow_instances(id),
  -- optional link to the approval workflow that produced this document
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_versions (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  filename VARCHAR(500),
  original_name VARCHAR(500),
  file_size INTEGER,
  mime_type VARCHAR(100),
  change_note TEXT,
  uploaded_by INTEGER REFERENCES staff(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, version_number)
);

ALTER TABLE documents ADD CONSTRAINT fk_current_version
  FOREIGN KEY (current_version_id) REFERENCES document_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);
