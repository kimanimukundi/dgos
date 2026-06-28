-- Seed: Workflow Templates

INSERT INTO workflow_templates (name, description, initiator_roles, rejection_action) VALUES
('Asset Disposal',
 'Request for disposal of Ministry assets including equipment, furniture, and vehicles.',
 '{supervisor,hod,director,system_admin}',
 'return_to_initiator'),

('Leave Application',
 'Application for staff leave including annual, sick, compassionate, and study leave.',
 '{staff,supervisor,hod,director,system_admin,auditor}',
 'return_to_initiator'),

('Procurement Request',
 'Request for procurement of goods and services for the Ministry.',
 '{hod,director}',
 'return_to_initiator'),

('Policy Approval',
 'Submission of new or revised Ministry policies for official approval.',
 '{director}',
 'return_to_initiator'),

('Staff Recruitment',
 'Initiation of staff recruitment process for a vacant position.',
 '{hod,director}',
 'return_to_initiator');

-- Template steps
-- 1. Asset Disposal: ICT → Procurement (Finance) → Finance Director → Director General
INSERT INTO workflow_template_steps (template_id, step_order, label, approver_role, approver_scope, sla_hours) VALUES
(1, 1, 'Procurement Review', 'hod', 'any', 48),
(1, 2, 'Finance Verification', 'hod', 'any', 48),
(1, 3, 'Director Approval', 'director', 'any', 24);

-- 2. Leave Application: Supervisor → HOD → HR
INSERT INTO workflow_template_steps (template_id, step_order, label, approver_role, approver_scope, sla_hours) VALUES
(2, 1, 'Supervisor Approval', 'supervisor', 'initiator_dept', 24),
(2, 2, 'HOD Approval', 'hod', 'initiator_dept', 24),
(2, 3, 'HR Acknowledgment', 'hod', 'any', 48);

-- 3. Procurement Request: Finance → Director
INSERT INTO workflow_template_steps (template_id, step_order, label, approver_role, approver_scope, sla_hours) VALUES
(3, 1, 'Finance Review', 'hod', 'any', 48),
(3, 2, 'Director Approval', 'director', 'any', 24);

-- 4. Policy Approval: PS → CS
INSERT INTO workflow_template_steps (template_id, step_order, label, approver_role, approver_scope, sla_hours) VALUES
(4, 1, 'Principal Secretary Review', 'director', 'any', 72),
(4, 2, 'Cabinet Secretary Approval', 'director', 'any', 48);

-- 5. Staff Recruitment: HR Director → PS → CS
INSERT INTO workflow_template_steps (template_id, step_order, label, approver_role, approver_scope, sla_hours) VALUES
(5, 1, 'HR Director Review', 'hod', 'any', 48),
(5, 2, 'Principal Secretary Approval', 'director', 'any', 72),
(5, 3, 'Cabinet Secretary Approval', 'director', 'any', 48);

-- Sample workflow instances
INSERT INTO workflow_instances (template_id, reference_number, title, description, initiator_id, current_step, status, created_at) VALUES
(1, 'WF/MOT/2025/001',
 'Disposal of Obsolete ICT Equipment — Batch 1',
 'Request for disposal of 14 desktop computers, 8 monitors, and 3 printers that have exceeded their useful life. Assets are non-functional and occupying ICT storage space.',
 15, 2, 'in_progress', NOW() - INTERVAL '3 days'),

(2, 'WF/MOT/2025/002',
 'Annual Leave — Francis Kimani (5 days)',
 'Application for 5 days annual leave from 27th January to 31st January 2025.',
 19, 1, 'in_progress', NOW() - INTERVAL '1 day'),

(3, 'WF/MOT/2025/003',
 'Procurement of Office Stationery — Q1 2025',
 'Request for procurement of office stationery for all directorates for Q1 2025. Total estimated value: KES 145,000.',
 8, 1, 'in_progress', NOW() - INTERVAL '2 days'),

(1, 'WF/MOT/2024/047',
 'Disposal of Obsolete Furniture — Admin Block',
 'Disposal of 12 broken office chairs and 4 damaged desks from the administration block.',
 12, 3, 'completed', NOW() - INTERVAL '30 days');

-- Step actions for instance 1 (Asset Disposal — step 1 approved, step 2 pending)
INSERT INTO workflow_step_actions (instance_id, step_order, step_label, assigned_to, assigned_at, action, actioned_at, comment, sla_hours, sla_deadline) VALUES
(1, 1, 'Procurement Review', 4, NOW() - INTERVAL '3 days', 'approved', NOW() - INTERVAL '2 days',
 'Asset list verified. Disposal request is in order. Recommended for Finance verification.', 48, NOW() - INTERVAL '1 day'),
(1, 2, 'Finance Verification', 4, NOW() - INTERVAL '2 days', NULL, NULL, NULL, 48, NOW() + INTERVAL '1 day'),
(1, 3, 'Director Approval', 2, NULL, NULL, NULL, NULL, 24, NULL);

-- Step actions for instance 2 (Leave — step 1 pending)
INSERT INTO workflow_step_actions (instance_id, step_order, step_label, assigned_to, assigned_at, action, actioned_at, comment, sla_hours, sla_deadline) VALUES
(2, 1, 'Supervisor Approval', 18, NOW() - INTERVAL '1 day', NULL, NULL, NULL, 24, NOW() + INTERVAL '12 hours'),
(2, 2, 'HOD Approval', 8, NULL, NULL, NULL, NULL, 24, NULL),
(2, 3, 'HR Acknowledgment', 5, NULL, NULL, NULL, NULL, 48, NULL);

-- Step actions for instance 3 (Procurement — step 1 pending)
INSERT INTO workflow_step_actions (instance_id, step_order, step_label, assigned_to, assigned_at, action, actioned_at, comment, sla_hours, sla_deadline) VALUES
(3, 1, 'Finance Review', 4, NOW() - INTERVAL '2 days', NULL, NULL, NULL, 48, NOW() + INTERVAL '6 hours'),
(3, 2, 'Director Approval', 2, NULL, NULL, NULL, NULL, 24, NULL);

-- Completed workflow (instance 4)
INSERT INTO workflow_step_actions (instance_id, step_order, step_label, assigned_to, assigned_at, action, actioned_at, comment, sla_hours, sla_deadline) VALUES
(4, 1, 'Procurement Review', 4, NOW() - INTERVAL '32 days', 'approved', NOW() - INTERVAL '31 days', 'Approved for Finance verification.', 48, NOW() - INTERVAL '30 days'),
(4, 2, 'Finance Verification', 4, NOW() - INTERVAL '31 days', 'approved', NOW() - INTERVAL '29 days', 'Budget verified. Assets confirmed for disposal.', 48, NOW() - INTERVAL '29 days'),
(4, 3, 'Director Approval', 2, NOW() - INTERVAL '29 days', 'approved', NOW() - INTERVAL '28 days', 'Approved. ICT to proceed with disposal per government guidelines.', 24, NOW() - INTERVAL '28 days');

UPDATE workflow_instances SET status = 'completed', completed_at = NOW() - INTERVAL '28 days' WHERE id = 4;

-- Sample tasks
INSERT INTO tasks (title, description, assigned_to, assigned_by, deadline, priority, status, workflow_instance_id, created_at) VALUES
('Collect obsolete computers from all departments',
 'Following approval of WF/MOT/2024/047, collect all items listed in the disposal manifest from each directorate. Get signed receipt from each HOD.',
 16, 6, CURRENT_DATE + INTERVAL '5 days', 'high', 'in_progress', 4, NOW() - INTERVAL '27 days'),

('Prepare Q1 2025 ICT infrastructure report',
 'Compile a report covering: current system status, uptime statistics, pending issues, and planned upgrades for Q1 2025. Submit to Director ICT for review.',
 16, 6, CURRENT_DATE + INTERVAL '3 days', 'normal', 'pending', NULL, NOW() - INTERVAL '2 days'),

('Update staff email distribution lists',
 'Review and update all Ministry email distribution lists following recent staff changes. Ensure all new staff are added and separated staff are removed.',
 15, 6, CURRENT_DATE - INTERVAL '2 days', 'normal', 'overdue', NULL, NOW() - INTERVAL '7 days'),

('Conduct tourism standards inspection — Nairobi hotels',
 'Field inspection of 8 Nairobi hotels for compliance with Tourism Standards Regulations 2024. Submit inspection reports within 5 days of each visit.',
 19, 8, CURRENT_DATE + INTERVAL '14 days', 'high', 'pending', NULL, NOW() - INTERVAL '1 day'),

('Draft wildlife corridor policy brief',
 'Prepare a policy brief on proposed wildlife corridor expansions in Laikipia. Brief should cover ecological impact, land use implications, and stakeholder considerations.',
 22, 9, CURRENT_DATE + INTERVAL '10 days', 'critical', 'in_progress', NULL, NOW() - INTERVAL '3 days');

-- Sample leave requests
INSERT INTO leave_requests (reference_number, staff_id, leave_type, start_date, end_date, days_requested, reason, status, created_at) VALUES
('LV/MOT/2025/001', 11, 'annual', '2025-02-03', '2025-02-07', 5, 'Family vacation.', 'pending', NOW() - INTERVAL '2 days'),
('LV/MOT/2025/002', 14, 'sick', '2025-01-13', '2025-01-14', 2, 'Flu and fever. Medical certificate attached.', 'approved', NOW() - INTERVAL '5 days'),
('LV/MOT/2024/089', 20, 'annual', '2024-12-23', '2024-12-31', 7, 'End of year leave.', 'approved', NOW() - INTERVAL '35 days');
