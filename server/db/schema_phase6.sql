-- Phase 6: Internal ICT Helpdesk

CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(100) UNIQUE NOT NULL,
  subject VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'other',
  -- hardware, software, network, access, other
  priority VARCHAR(50) NOT NULL DEFAULT 'medium',
  -- low, medium, high, critical
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  -- open, assigned, in_progress, resolved, closed, reopened
  requester_id INTEGER REFERENCES staff(id),
  raised_by_id INTEGER REFERENCES staff(id),
  -- same as requester unless raised on behalf of someone else
  assigned_to INTEGER REFERENCES staff(id),
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  reopened_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES staff(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  uploaded_by INTEGER REFERENCES staff(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);
