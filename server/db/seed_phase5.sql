-- Phase 5 Seed Data

-- Asset categories
INSERT INTO asset_categories (name) VALUES
('ICT Equipment'), ('Office Furniture'), ('Motor Vehicles'), ('Office Equipment');

-- Assets — including the ones referenced by the existing disposal workflows
INSERT INTO assets (asset_tag, name, category_id, description, serial_number, purchase_date, purchase_value, current_value, condition, status, department_id, custodian_id, location) VALUES
-- These map to WF/MOT/2025/001 (Disposal of Obsolete ICT Equipment — Batch 1, in progress)
('MOT/AST/001', 'Dell OptiPlex Desktop Computer', 1, 'Standard office desktop, no longer supported', 'DL-2018-0041', '2018-03-12', 65000, 5000, 'non_functional', 'in_storage', 5, 16, 'ICT Storage Room, Utalii House'),
('MOT/AST/002', 'Dell OptiPlex Desktop Computer', 1, 'Standard office desktop, no longer supported', 'DL-2018-0042', '2018-03-12', 65000, 5000, 'non_functional', 'in_storage', 5, 16, 'ICT Storage Room, Utalii House'),
('MOT/AST/003', 'HP LaserJet Printer', 1, 'Office printer, frequent paper jams, parts unavailable', 'HP-2017-0019', '2017-08-20', 28000, 2000, 'poor', 'in_storage', 5, 16, 'ICT Storage Room, Utalii House'),
('MOT/AST/004', 'Samsung 24" Monitor', 1, 'Display panel damaged', 'SM-2018-0077', '2018-03-12', 18000, 1500, 'non_functional', 'in_storage', 5, 16, 'ICT Storage Room, Utalii House'),

-- These map to WF/MOT/2024/047 (Disposal of Obsolete Furniture, completed)
('MOT/AST/005', 'Executive Office Chair', 2, 'Broken hydraulics, torn upholstery', 'CHR-2015-014', '2015-06-10', 12000, 500, 'non_functional', 'disposed', 3, 12, 'Administration Block'),
('MOT/AST/006', 'Wooden Office Desk', 2, 'Water damage, structural crack', 'DSK-2015-008', '2015-06-10', 22000, 1000, 'poor', 'disposed', 3, 12, 'Administration Block'),

-- General active assets (not in any disposal workflow)
('MOT/AST/007', 'Toyota Land Cruiser', 3, 'Field operations vehicle', 'KDA 245X', '2021-01-15', 8500000, 6200000, 'good', 'in_use', 8, 21, 'Ministry Garage'),
('MOT/AST/008', 'Toyota Hilux', 3, 'Field operations vehicle, Wildlife Directorate', 'KDB 119Y', '2020-05-20', 4200000, 2800000, 'good', 'in_use', 8, 9, 'Ministry Garage'),
('MOT/AST/009', 'Dell Latitude Laptop', 1, 'Assigned to ICT Director', 'DL-2023-0102', '2023-02-01', 95000, 70000, 'good', 'in_use', 5, 6, 'Office of ICT Director'),
('MOT/AST/010', 'HP LaserJet Pro Printer', 1, 'Shared printer, Finance Directorate', 'HP-2022-0033', '2022-04-18', 45000, 28000, 'good', 'in_use', 3, 4, 'Finance Directorate Office'),
('MOT/AST/011', 'Conference Room Projector', 4, 'Main boardroom projector', 'EPS-2021-009', '2021-09-05', 85000, 50000, 'good', 'in_use', 2, 2, 'Ministry Boardroom'),
('MOT/AST/012', 'Filing Cabinet (4-drawer)', 2, 'HR records storage', 'FC-2019-022', '2019-11-12', 15000, 7000, 'fair', 'in_use', 4, 5, 'HR Directorate Office');

-- Link assets to the existing disposal workflows
INSERT INTO workflow_assets (instance_id, asset_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4),  -- WF/MOT/2025/001
(4, 5), (4, 6);                   -- WF/MOT/2024/047 (completed)

-- Mark disposed assets with their workflow reference
UPDATE assets SET disposal_workflow_id = 4, disposed_at = NOW() - INTERVAL '28 days' WHERE id IN (5, 6);

-- Link the existing task "Collect obsolete computers..." to the disposed assets
INSERT INTO task_assets (task_id, asset_id) VALUES (1, 5), (1, 6);

-- Asset history
INSERT INTO asset_history (asset_id, event, detail, actor_id, created_at) VALUES
(1, 'created', 'Asset registered in system', 6, NOW() - INTERVAL '60 days'),
(1, 'status_changed', 'Marked non-functional, moved to ICT storage', 16, NOW() - INTERVAL '10 days'),
(5, 'created', 'Asset registered in system', 4, NOW() - INTERVAL '90 days'),
(5, 'disposed', 'Disposed per WF/MOT/2024/047', 6, NOW() - INTERVAL '28 days'),
(6, 'created', 'Asset registered in system', 4, NOW() - INTERVAL '90 days'),
(6, 'disposed', 'Disposed per WF/MOT/2024/047', 6, NOW() - INTERVAL '28 days');

-- ===== MEETINGS =====

INSERT INTO meetings (reference_number, title, agenda, organiser_id, meeting_date, start_time, end_time, location, status, minutes, minutes_recorded_at) VALUES
('MTG/MOT/2025/001',
 'Q1 2025 Directors'' Coordination Meeting',
 '1. Review of Q4 2024 performance\n2. Budget allocation for Q1 2025\n3. Staff recruitment update\n4. AOB',
 2, CURRENT_DATE - 3, '09:00', '11:00', 'Ministry Boardroom', 'completed',
 'Meeting opened by the Principal Secretary. Q4 2024 performance was reviewed across all directorates with Finance noting a 94% budget utilisation rate. Budget allocation for Q1 2025 was discussed and provisionally approved pending Treasury confirmation. HR Director gave an update on the ongoing recruitment process for two vacant Senior Officer positions. Meeting closed at 11:00 AM.',
 NOW() - INTERVAL '3 days'),

('MTG/MOT/2025/002',
 'ICT Systems Review Meeting',
 '1. DGOS rollout progress\n2. Network infrastructure upgrade proposal\n3. Cybersecurity awareness training',
 6, CURRENT_DATE + 2, '14:00', '15:30', 'ICT Conference Room', 'scheduled', NULL, NULL),

('MTG/MOT/2025/003',
 'Wildlife Corridor Policy Stakeholder Briefing',
 '1. Presentation of draft policy brief\n2. Stakeholder feedback session\n3. Next steps and timeline',
 9, CURRENT_DATE + 7, '10:00', '12:00', 'Ministry Boardroom', 'scheduled', NULL, NULL);

-- Attendees for the completed meeting
INSERT INTO meeting_attendees (meeting_id, staff_id, attendance_status) VALUES
(1, 2, 'attended'), (1, 4, 'attended'), (1, 5, 'attended'), (1, 6, 'attended'),
(1, 7, 'apologised'), (1, 8, 'attended'), (1, 9, 'attended');

-- Attendees for upcoming meetings
INSERT INTO meeting_attendees (meeting_id, staff_id, attendance_status) VALUES
(2, 6, 'invited'), (2, 15, 'invited'), (2, 16, 'invited'),
(3, 9, 'invited'), (3, 21, 'invited'), (3, 22, 'invited'), (3, 8, 'invited');

-- Action points from the completed meeting (one converted to a task)
INSERT INTO meeting_action_points (meeting_id, description, assigned_to, deadline, task_id) VALUES
(1, 'Prepare Q1 2025 ICT infrastructure report', 16, CURRENT_DATE + 3, 2),
(1, 'Circulate Q1 2025 budget allocation memo to all directorates', 4, CURRENT_DATE + 5, NULL),
(1, 'Finalise shortlist for Senior Officer recruitment', 13, CURRENT_DATE + 10, NULL);

-- ===== VENDORS & CONTRACTS =====

INSERT INTO vendors (name, contact_person, email, phone, address) VALUES
('Safaricom PLC', 'Corporate Accounts Team', 'corporate@safaricom.co.ke', '0722000000', 'Safaricom House, Waiyaki Way, Nairobi'),
('Computer Pride Ltd', 'James Mutiso', 'sales@computerpride.co.ke', '0733445566', 'Moi Avenue, Nairobi'),
('Jubilee Insurance Company', 'Corporate Desk', 'corporate@jubileeinsurance.com', '0709911000', 'Jubilee Insurance House, Wabera Street, Nairobi'),
('Office Solutions Kenya Ltd', 'Grace Mwende', 'info@officesolutions.co.ke', '0722334455', 'Industrial Area, Nairobi'),
('SecureGuard Services Ltd', 'Operations Manager', 'ops@secureguard.co.ke', '0700112233', 'Westlands, Nairobi');

INSERT INTO contracts (reference_number, title, vendor_id, department_id, contract_value, start_date, end_date, status, description, managed_by) VALUES
('CTR/MOT/2024/001', 'Ministry-wide Internet & Data Connectivity', 1, 5, 2400000, '2024-01-01', '2025-12-31', 'active',
 'Provision of dedicated fibre internet connectivity and mobile data bundles for all Ministry staff devices.', 6),

('CTR/MOT/2023/014', 'ICT Hardware Supply Agreement', 2, 5, 5800000, '2023-06-01', '2025-07-15', 'active',
 'Framework agreement for supply of desktop computers, laptops, and peripherals as needed.', 6),

('CTR/MOT/2024/008', 'Group Medical Insurance Cover', 3, 4, 18500000, '2024-04-01', '2026-03-31', 'active',
 'Comprehensive medical insurance cover for all Ministry staff and dependents.', 5),

('CTR/MOT/2023/021', 'Office Furniture Supply', 4, 3, 1200000, '2023-09-01', '2025-08-31', 'active',
 'Supply and installation of office furniture for the Administration Block refurbishment.', 4),

('CTR/MOT/2022/009', 'Physical Security Services', 5, 3, 9600000, '2022-10-01', '2024-09-30', 'expired',
 'Provision of security guard services at Utalii House premises.', 4);
