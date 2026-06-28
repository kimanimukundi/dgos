-- Seed Data: Ministry of Tourism & Wildlife Kenya

-- Organisation
INSERT INTO organisations (name, short_name) VALUES
('Ministry of Tourism & Wildlife', 'MOT');

-- Departments
INSERT INTO departments (organisation_id, name, code) VALUES
(1, 'Office of the Cabinet Secretary', 'OCS'),
(1, 'Office of the Principal Secretary', 'OPS'),
(1, 'Directorate of Finance & Administration', 'DFA'),
(1, 'Directorate of Human Resource Management', 'DHR'),
(1, 'Directorate of ICT', 'DICT'),
(1, 'Directorate of Legal Services', 'DLS'),
(1, 'Directorate of Tourism Development', 'DTD'),
(1, 'Directorate of Wildlife Conservation', 'DWC');

-- Units
INSERT INTO units (department_id, name, code) VALUES
(1, 'Communications & Public Affairs Unit', 'CPAU'),
(2, 'Planning & Strategy Unit', 'PSU'),
(3, 'Finance & Accounts Unit', 'FAU'),
(3, 'Administration & Logistics Unit', 'ALU'),
(4, 'Staff Establishment Unit', 'SEU'),
(4, 'Staff Welfare & Development Unit', 'SWDU'),
(5, 'Systems & Infrastructure Unit', 'SIU'),
(6, 'Legal Advisory Unit', 'LAU'),
(7, 'Tourism Policy Unit', 'TPU'),
(7, 'Tourism Standards & Regulation Unit', 'TSRU'),
(8, 'Wildlife Policy Unit', 'WPU'),
(8, 'Conservation Programs Unit', 'CPU');

-- Staff (passwords will be bcrypt hashed via setup script)
-- All default passwords: Password@123 (must change on first login)
-- password hash for Password@123
INSERT INTO staff (staff_id, full_name, email, password_hash, job_title, grade, role, department_id, unit_id, supervisor_id, must_change_password) VALUES
-- Cabinet Secretary (no supervisor)
('MOT/001', 'Hon. James Kariuki Mwangi', 'cs@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Cabinet Secretary', 'CS', 'director', 1, 1, NULL, FALSE),

-- Principal Secretary
('MOT/002', 'Mrs. Grace Njeri Odhiambo', 'ps.tourism@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Principal Secretary - Tourism', 'PS', 'director', 2, 2, 1, FALSE),
('MOT/003', 'Mr. David Kipchoge Rotich', 'ps.wildlife@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Principal Secretary - Wildlife', 'PS', 'director', 2, 2, 1, FALSE),

-- Directors
('MOT/004', 'Ms. Esther Wambui Kamau', 'director.finance@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Director, Finance & Administration', 'D1', 'hod', 3, 3, 2, FALSE),
('MOT/005', 'Mr. Peter Omondi Otieno', 'director.hr@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Director, Human Resource Management', 'D1', 'hod', 4, 5, 2, FALSE),
('MOT/006', 'Mr. Samuel Njoroge Waweru', 'director.ict@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Director, ICT', 'D1', 'hod', 5, 7, 2, FALSE),
('MOT/007', 'Ms. Fatuma Hassan Abdi', 'director.legal@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Director, Legal Services', 'D1', 'hod', 6, 8, 2, FALSE),
('MOT/008', 'Mr. Charles Mutua Kioko', 'director.tourism@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Director, Tourism Development', 'D1', 'hod', 7, 9, 2, FALSE),
('MOT/009', 'Dr. Agnes Chebet Korir', 'director.wildlife@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Director, Wildlife Conservation', 'D1', 'hod', 8, 11, 3, FALSE),

-- Supervisors & Staff — Finance
('MOT/010', 'Mr. John Kamau Njeru', 'john.kamau@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Senior Accountant', 'S3', 'supervisor', 3, 3, 4, FALSE),
('MOT/011', 'Ms. Mary Achieng Oluoch', 'mary.achieng@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Accountant', 'S2', 'staff', 3, 3, 10, TRUE),
('MOT/012', 'Mr. Kevin Maina Wanjiku', 'kevin.maina@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administration Officer', 'S2', 'staff', 3, 4, 4, TRUE),

-- HR
('MOT/013', 'Ms. Rose Wanjiku Mwangi', 'rose.wanjiku@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Senior HR Officer', 'S3', 'supervisor', 4, 5, 5, FALSE),
('MOT/014', 'Mr. Brian Ochieng Nyambok', 'brian.ochieng@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'HR Officer', 'S2', 'staff', 4, 6, 13, TRUE),

-- ICT
('MOT/015', 'Mr. Dennis Kiprop Sang', 'dennis.kiprop@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Senior Systems Administrator', 'S3', 'system_admin', 5, 7, 6, FALSE),
('MOT/016', 'Ms. Patricia Njeri Gitau', 'patricia.njeri@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ICT Officer', 'S2', 'staff', 5, 7, 15, TRUE),

-- Legal
('MOT/017', 'Mr. Eric Baraza Mwamburi', 'eric.baraza@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Senior Legal Officer', 'S3', 'supervisor', 6, 8, 7, FALSE),

-- Tourism Development
('MOT/018', 'Ms. Lilian Cherop Bett', 'lilian.cherop@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Senior Tourism Officer', 'S3', 'supervisor', 7, 9, 8, FALSE),
('MOT/019', 'Mr. Francis Kimani Githinji', 'francis.kimani@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Tourism Standards Officer', 'S2', 'staff', 7, 10, 18, TRUE),
('MOT/020', 'Ms. Joyce Auma Odongo', 'joyce.auma@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Tourism Policy Officer', 'S2', 'staff', 7, 9, 18, TRUE),

-- Wildlife Conservation
('MOT/021', 'Mr. Joseph Lemasolai Lekutaas', 'joseph.lemasolai@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Senior Wildlife Officer', 'S3', 'supervisor', 8, 11, 9, FALSE),
('MOT/022', 'Ms. Naomi Wekesa Barasa', 'naomi.wekesa@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Wildlife Conservation Officer', 'S2', 'staff', 8, 12, 21, TRUE),
('MOT/023', 'Mr. Ibrahim Omar Farah', 'ibrahim.omar@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Conservation Programs Officer', 'S2', 'staff', 8, 12, 21, TRUE),

-- Auditor
('MOT/024', 'Ms. Catherine Muthoni Kariuki', 'auditor@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Internal Auditor', 'S3', 'auditor', 3, 3, 2, FALSE),

-- Communications
('MOT/025', 'Mr. Daniel Kuria Waithaka', 'daniel.kuria@tourism.go.ke', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Communications Officer', 'S2', 'staff', 1, 1, 1, TRUE);

-- Sample memos
INSERT INTO memos (memo_number, subject, body, sender_id, urgency, classification, action_required, status, published_at) VALUES
('MEMO/MOT/2025/001',
 'New Staff Induction Programme — January 2025',
 'All Heads of Department are hereby notified of the upcoming Staff Induction Programme scheduled for 20th January 2025 at the Ministry Boardroom, Utalii House.\n\nAll newly recruited staff members who joined the Ministry between July and December 2024 are required to attend. HODs are requested to submit a list of eligible staff from their respective directorates to the HR Directorate by 15th January 2025.\n\nAttendance is mandatory. Please ensure your staff are informed accordingly.',
 5, 'priority', 'internal', TRUE, 'published', NOW() - INTERVAL '5 days'),

('MEMO/MOT/2025/002',
 'Updated Password Policy for Ministry Systems',
 'Following a review of our ICT security protocols, the following password policy shall take effect immediately for all Ministry staff accessing government systems:\n\n1. Passwords must be a minimum of 10 characters\n2. Must contain uppercase, lowercase, numeric, and special characters\n3. Passwords must be changed every 90 days\n4. Do not share passwords under any circumstances\n\nThe ICT Directorate will provide support to any staff requiring assistance. All staff must update their passwords by 31st January 2025.',
 6, 'urgent', 'internal', TRUE, 'published', NOW() - INTERVAL '2 days'),

('MEMO/MOT/2025/003',
 'Quarterly Performance Review — Q4 2024',
 'All Directorates are required to submit their Q4 2024 performance reports to the Office of the Principal Secretary by 31st January 2025.\n\nReports should follow the standard template available from the Planning & Strategy Unit. Performance data should cover the period October to December 2024 and include key achievements, challenges, and targets for Q1 2025.',
 2, 'routine', 'internal', TRUE, 'published', NOW() - INTERVAL '1 day');

-- Memo recipients
-- Memo 1: to all HODs
INSERT INTO memo_recipients (memo_id, staff_id, delivery_status, opened_at, acknowledged_at) VALUES
(1, 4, 'acknowledged', NOW() - INTERVAL '4 days 22 hours', NOW() - INTERVAL '4 days 20 hours'),
(1, 5, 'acknowledged', NOW() - INTERVAL '4 days 18 hours', NOW() - INTERVAL '4 days 17 hours'),
(1, 6, 'acknowledged', NOW() - INTERVAL '4 days 15 hours', NOW() - INTERVAL '4 days 14 hours'),
(1, 7, 'opened', NOW() - INTERVAL '4 days 10 hours', NULL),
(1, 8, 'acknowledged', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days 22 hours'),
(1, 9, 'delivered', NULL, NULL);

-- Memo 2: to all staff
INSERT INTO memo_recipients (memo_id, staff_id, delivery_status, opened_at, acknowledged_at)
SELECT 2, id, 
  CASE WHEN id % 3 = 0 THEN 'acknowledged' WHEN id % 3 = 1 THEN 'opened' ELSE 'delivered' END,
  CASE WHEN id % 3 != 2 THEN NOW() - INTERVAL '1 day' ELSE NULL END,
  CASE WHEN id % 3 = 0 THEN NOW() - INTERVAL '20 hours' ELSE NULL END
FROM staff WHERE id != 6;

-- Memo 3: to finance and planning
INSERT INTO memo_recipients (memo_id, staff_id, delivery_status, opened_at, acknowledged_at) VALUES
(3, 4, 'delivered', NULL, NULL),
(3, 2, 'opened', NOW() - INTERVAL '20 hours', NULL),
(3, 10, 'delivered', NULL, NULL);

-- Sample notices
INSERT INTO notices (title, body, posted_by, target, expires_at) VALUES
('Public Holiday — 20th January 2025',
 'Please note that 20th January 2025 is a public holiday. The Ministry offices will be closed. All staff are advised to plan accordingly.',
 2, 'all', NOW() + INTERVAL '10 days'),
('Ministry Staff Welfare Meeting',
 'The Staff Welfare Committee will hold its quarterly meeting on Friday 17th January 2025 at 3:00 PM in Conference Room B, 3rd Floor Utalii House. All welfare representatives are requested to attend.',
 5, 'all', NOW() + INTERVAL '5 days'),
('IT Maintenance — Saturday 18th January',
 'The ICT Directorate will be carrying out scheduled system maintenance on Saturday 18th January 2025 from 8:00 AM to 2:00 PM. The DGOS system will be unavailable during this period.',
 6, 'all', NOW() + INTERVAL '3 days');
