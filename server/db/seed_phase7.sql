-- Phase 7 Seed Data: Document Management

INSERT INTO documents (document_number, title, document_type, department_id, description, status, uploaded_by, created_at) VALUES
('DOC/MOT/2025/001', 'Ministry ICT Security Policy', 'policy', 5,
 'Comprehensive policy governing password management, device usage, and data protection across all Ministry systems.',
 'published', 6, NOW() - INTERVAL '40 days'),

('DOC/MOT/2025/002', 'Tourism Standards Compliance Guidelines 2025', 'guideline', 7,
 'Updated guidelines for tourism facility inspections and standards compliance, replacing the 2023 edition.',
 'published', 8, NOW() - INTERVAL '20 days'),

('DOC/MOT/2024/014', 'Q4 2024 Ministry Performance Report', 'report', 2,
 'Quarterly performance report covering all directorates, submitted to the Office of the Principal Secretary.',
 'published', 2, NOW() - INTERVAL '15 days'),

('DOC/MOT/2024/009', 'Circular: Revised Leave Application Procedure', 'circular', 4,
 'Circular notifying all staff of the updated leave application procedure now processed through DGOS.',
 'published', 5, NOW() - INTERVAL '60 days'),

('DOC/MOT/2025/003', 'Draft Wildlife Corridor Expansion Policy', 'policy', 8,
 'Draft policy brief on proposed wildlife corridor expansions in Laikipia, pending stakeholder review.',
 'draft', 9, NOW() - INTERVAL '3 days'),

('DOC/MOT/2023/021', 'Ministry ICT Security Policy (Original)', 'policy', 5,
 'Original ICT security policy, superseded by the 2025 revision.',
 'superseded', 6, NOW() - INTERVAL '400 days');

-- Versions (each document has at least one)
INSERT INTO document_versions (document_id, version_number, original_name, change_note, uploaded_by, uploaded_at) VALUES
(1, 1, 'ICT_Security_Policy_v1.pdf', 'Initial publication', 6, NOW() - INTERVAL '40 days'),
(2, 1, 'Tourism_Standards_Guidelines_2025.pdf', 'Initial publication, replaces 2023 edition', 8, NOW() - INTERVAL '20 days'),
(3, 1, 'Q4_2024_Performance_Report.pdf', 'Initial publication', 2, NOW() - INTERVAL '15 days'),
(4, 1, 'Circular_Leave_Procedure.pdf', 'Initial publication', 5, NOW() - INTERVAL '60 days'),
(5, 1, 'Wildlife_Corridor_Policy_Draft.pdf', 'First draft for internal review', 9, NOW() - INTERVAL '3 days'),
(6, 1, 'ICT_Security_Policy_Original.pdf', 'Original version', 6, NOW() - INTERVAL '400 days');

-- Set current_version_id for each
UPDATE documents SET current_version_id = (SELECT id FROM document_versions WHERE document_id = documents.id ORDER BY version_number DESC LIMIT 1);
