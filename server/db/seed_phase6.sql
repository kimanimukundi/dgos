-- Phase 6 Seed Data: ICT Helpdesk Tickets

-- A spread of tickets across statuses, assigned across ICT staff (15, 16) per load balancing
INSERT INTO tickets (ticket_number, subject, description, category, priority, status, requester_id, raised_by_id, assigned_to, resolution_note, resolved_at, closed_at, created_at) VALUES

('TKT/MOT/2025/001',
 'Cannot log in to DGOS system',
 'I am getting "invalid credentials" error when trying to log in this morning. I have not changed my password recently.',
 'access', 'high', 'resolved', 11, 11, 16,
 'Account had been locked due to multiple failed login attempts from a cached old password on a second device. Unlocked the account and confirmed successful login with the user.',
 NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '5 days'),

('TKT/MOT/2025/002',
 'Printer in Finance office not working',
 'The HP LaserJet printer (MOT/AST/010) in the Finance Directorate office is showing a paper jam error but there is no visible paper stuck. Tried restarting it twice.',
 'hardware', 'medium', 'in_progress', 10, 10, 16, NULL, NULL, NULL, NOW() - INTERVAL '2 days'),

('TKT/MOT/2025/003',
 'Need access to shared Wildlife Conservation drive',
 'I joined the Wildlife Conservation directorate last month and still do not have access to the shared documents folder that my colleagues use.',
 'access', 'medium', 'open', 22, 22, NULL, NULL, NULL, NULL, NOW() - INTERVAL '1 day'),

('TKT/MOT/2025/004',
 'Laptop running extremely slow',
 'My laptop (assigned to me, Dell Latitude) has become very slow over the past week. Takes over 5 minutes to boot and applications freeze frequently.',
 'hardware', 'medium', 'assigned', 6, 6, 15, NULL, NULL, NULL, NOW() - INTERVAL '6 hours'),

('TKT/MOT/2025/005',
 'Email not syncing on mobile device',
 'My Ministry email stopped syncing on my phone two days ago. Works fine on the desktop. Already tried removing and re-adding the account.',
 'software', 'low', 'open', 19, 19, NULL, NULL, NULL, NULL, NOW() - INTERVAL '3 hours'),

('TKT/MOT/2025/006',
 'Request new laptop for incoming staff member',
 'We have a new HR Officer starting next Monday and will need a laptop set up with standard Ministry software and DGOS access before their start date.',
 'hardware', 'high', 'assigned', 14, 13, 16, NULL, NULL, NULL, NOW() - INTERVAL '12 hours'),

('TKT/MOT/2025/007',
 'Internet connection extremely slow in Boardroom',
 'During the Q1 coordination meeting, internet was unusable for video calls. Affects the projector wireless casting too.',
 'network', 'critical', 'resolved', 2, 2, 15,
 'Identified that the boardroom was connected to a congested access point. Moved the boardroom AP to a dedicated VLAN and confirmed improved speeds with a test call.',
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 days'),

('TKT/MOT/2025/008',
 'Unable to open shared Tourism Standards documents',
 'Getting "access denied" when trying to open files in the Tourism Standards Unit shared folder that I could access last week.',
 'access', 'medium', 'closed', 20, 20, 16,
 'Permissions had been accidentally reset during a folder reorganisation. Restored correct group permissions and verified access with the user.',
 NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '11 days');

-- Comments on a few tickets to show the back-and-forth pattern
INSERT INTO ticket_comments (ticket_id, author_id, comment, created_at) VALUES
(1, 16, 'Hi Mary, can you confirm if you have logged in from a phone or another computer recently?', NOW() - INTERVAL '4 days 20 hours'),
(1, 11, 'Yes, I tried logging in from my personal laptop yesterday and may have used an old saved password.', NOW() - INTERVAL '4 days 18 hours'),
(1, 16, 'That confirms it — the repeated failed attempts from that device locked your account. Unlocking now.', NOW() - INTERVAL '4 days 10 hours'),

(2, 16, 'Checked the printer remotely, it shows a sensor fault rather than an actual jam. Will come by this afternoon to inspect physically.', NOW() - INTERVAL '1 day'),
(2, 10, 'Thank you, I will be in the office until 4pm today.', NOW() - INTERVAL '20 hours'),

(7, 15, 'On site now, checking the access point configuration.', NOW() - INTERVAL '3 days 2 hours'),
(7, 15, 'Found the issue — too many devices on one AP. Reconfiguring now.', NOW() - INTERVAL '3 days 1 hour'),
(7, 2, 'Thank you for the quick turnaround, please confirm once tested.', NOW() - INTERVAL '2 days 20 hours');
