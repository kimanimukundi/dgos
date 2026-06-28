// Product tour steps per role
// route: navigate here before showing this step
// target: data-tour attribute of the element to highlight (null = page-level spotlight)
// spotlight: true = dim everything else; false = tooltip only

export const TOUR_STEPS = {
  cs: [
    { route: '/', target: 'stat-cards', spotlight: true, title: 'Your command centre', body: 'These cards show everything pending your attention right now — unacknowledged memos, pending approvals, active tasks, and open tickets. Updated in real time.' },
    { route: '/', target: 'notification-bell', spotlight: false, title: 'Notification centre', body: 'Click the bell to see everything across the system that needs you — pulled from memos, workflows, meetings, and contracts into one place.' },
    { route: '/', target: 'recent-memos-panel', spotlight: false, title: 'Recent memos', body: 'The most recent memos you\'ve received appear here. Green dot means acknowledged, blue means opened, grey means unread.' },
    { route: '/memos/inbox', target: 'memo-list', spotlight: true, title: 'Your memo inbox', body: 'Every official memo sent to you appears here. Colour-coded by urgency — red for Urgent, orange for Priority, blue for Routine. Nothing gets lost.' },
    { route: '/memos/inbox', target: 'urgency-filter', spotlight: false, title: 'Filter by status', body: 'Filter between All, Unread, Opened, and Acknowledged. As Cabinet Secretary you can see at a glance what still needs your attention.' },
    { route: '/workflows', target: 'pending-banner', spotlight: true, title: 'Approvals awaiting you', body: 'This banner shows workflow steps currently assigned to you. As the final approver on most chains, your decision completes the process.' },
    { route: '/workflows', target: 'workflow-list', spotlight: false, title: 'All active workflows', body: 'Every approval request across the Ministry is tracked here — Asset Disposal, Procurement, Policy Approval, Staff Recruitment. Each one shows who initiated it, where it is, and how long it\'s taken.' },
    { route: '/reports', target: 'report-tabs', spotlight: true, title: 'Reports & Analytics', body: 'Five operational reports built for management decisions — memo acknowledgment rates, workflow bottlenecks, task completion, staff activity, and the full audit log.' },
    { route: '/reports', target: 'report-tabs', spotlight: false, title: 'The audit log', body: 'Click the Audit Log tab. Every action in the system — logins, approvals, memo sends — is permanently recorded. Nobody, including admins, can delete an entry.' },
    { route: '/org-chart', target: 'org-tree', spotlight: true, title: 'Live org chart', body: 'The Ministry structure — directorates, units, and staff — all in one collapsible view. This is the data layer that powers routing, permissions, and workflow assignment.' },
  ],

  hod_finance: [
    { route: '/', target: 'stat-cards', spotlight: true, title: 'What needs your attention', body: 'Your dashboard shows pending approvals, unacknowledged memos, tasks due soon, and open helpdesk tickets — specific to your role and department.' },
    { route: '/', target: 'notification-bell', spotlight: false, title: 'Everything in one place', body: 'The bell icon surfaces all notifications across the system — workflow steps waiting on you, leave requests to approve, contracts expiring soon.' },
    { route: '/workflows', target: 'pending-banner', spotlight: true, title: 'Workflows awaiting your approval', body: 'There are workflow steps assigned to you right now. The Finance Review step on the Procurement Request and Asset Disposal are both in your queue.' },
    { route: '/workflows', target: 'workflow-list', spotlight: false, title: 'Open a workflow to act', body: 'Click any workflow to see the full approval chain, linked assets or documents, and the action panel at the bottom. Approve or reject with a comment.' },
    { route: '/leave', target: 'leave-pending-tab', spotlight: true, title: 'Leave approvals', body: 'Your team\'s leave requests come here for your approval. Review the dates, acting officer, and reason — then approve or reject in one click.' },
    { route: '/contracts', target: 'expiry-banner', spotlight: true, title: 'Contract expiry alerts', body: 'The system automatically flags contracts expiring within 90 days. One is already showing — click it to see vendor contact details and managed-by information.' },
    { route: '/contracts', target: 'contract-list', spotlight: false, title: 'Full contract registry', body: 'All Ministry contracts in one searchable list — value, vendor, department, and expiry date. No more hunting through filing cabinets.' },
    { route: '/memos/inbox', target: 'memo-list', spotlight: true, title: 'Your memo inbox', body: 'Official memos sent to you or your department. Every one requires acknowledgment — creating a permanent record that you received and read it.' },
  ],

  ict_director: [
    { route: '/', target: 'stat-cards', spotlight: true, title: 'Your ICT dashboard', body: 'Pending approvals, assigned tasks, open helpdesk tickets — all live. As ICT Director you also see asset-related workflow steps and your team\'s ticket queue.' },
    { route: '/workflows', target: 'workflow-list', spotlight: true, title: 'Asset disposal in progress', body: 'WF/MOT/2025/001 — Disposal of Obsolete ICT Equipment — is mid-chain. Step 1 (Procurement Review) is approved. Finance Verification is next. Open it to see the linked assets.' },
    { route: '/workflows', target: 'linked-assets', spotlight: false, title: 'Assets linked to this workflow', body: 'Four ICT assets are attached to this disposal request. When the workflow completes its final approval, those assets automatically flip to "disposed" with a timestamped history entry.' },
    { route: '/assets', target: 'asset-list', spotlight: true, title: 'Asset registry', body: 'Every Ministry asset — ICT equipment, furniture, vehicles — tracked with tag, condition, custodian, location, and value. The source of truth for what the Ministry owns.' },
    { route: '/assets', target: 'asset-search', spotlight: false, title: 'Search and filter', body: 'Search by asset name, tag number, or serial number. Filter by status — In Use, In Storage, Under Repair, Disposed. Click any asset to see its full lifecycle history.' },
    { route: '/tickets', target: 'ict-queue-tab', spotlight: true, title: 'The ICT helpdesk queue', body: 'All staff support tickets land here. Sorted by priority — Critical first, then High, Medium, Low. Tickets are auto-assigned by load balancing across ICT staff.' },
    { route: '/tickets', target: 'ticket-list', spotlight: false, title: 'Work tickets through the queue', body: 'Open a ticket to see the full conversation, mark it In Progress, add resolution notes, and close it. The requester is updated at each stage.' },
    { route: '/admin/staff', target: 'staff-table', spotlight: true, title: 'Staff account management', body: 'As ICT Director you have visibility of all staff accounts — roles, departments, and status. The System Admin account (Dennis Kiprop) handles actual account creation and changes.' },
  ],

  ict_admin: [
    { route: '/', target: 'stat-cards', spotlight: true, title: 'System Admin dashboard', body: 'You\'re the System Administrator — the person who sets up accounts, manages the org structure, and keeps the system running. Your dashboard reflects what\'s active across the whole Ministry.' },
    { route: '/admin/staff', target: 'staff-table', spotlight: true, title: 'Staff account management', body: 'Every Ministry staff account is listed here — name, Staff ID, role, department, and status. This is where you create, edit, and deactivate accounts.' },
    { route: '/admin/staff', target: 'add-staff-btn', spotlight: false, title: 'Create a new account', body: 'Click "+ Add Staff" to create a new account. The system generates a Staff ID automatically. New accounts get a default password and must change it on first login.' },
    { route: '/admin/staff', target: 'staff-table', spotlight: false, title: 'Role-based permissions', body: 'Each account has one of six roles: Staff, Supervisor, HOD, Director, System Admin, or Auditor. The role determines what the person can see and do across every module.' },
    { route: '/tickets', target: 'ict-queue-tab', spotlight: true, title: 'Your helpdesk queue', body: 'As ICT staff, you see the full helpdesk queue — not just your own tickets. Tickets are auto-assigned to whoever has the fewest open tickets at the time of submission.' },
    { route: '/tickets', target: 'unassigned-filter', spotlight: false, title: 'Unassigned tickets', body: 'Click "Unassigned" to see tickets that haven\'t been picked up yet. You can manually assign them to any ICT team member — useful when someone is on leave.' },
    { route: '/org-chart', target: 'org-tree', spotlight: true, title: 'The org chart is data, not code', body: 'The entire Ministry structure — 8 directorates, 12 units, 25 staff — is stored as data in the database, not hardcoded. When the real Ministry structure is loaded, you update it here through the Admin panel.' },
    { route: '/directory', target: 'staff-list', spotlight: false, title: 'Staff directory', body: 'All active staff in one searchable list. Filter by department, search by name or job title. Click any staff member to see their full profile — supervisor, unit, grade, contact.' },
    { route: '/reports', target: 'report-tabs', spotlight: true, title: 'System-wide reports', body: 'As System Admin you have access to all four reports and the audit log. Use Staff Activity to see who\'s logged in recently and who hasn\'t used the system at all.' },
  ],

  staff: [
    { route: '/', target: 'stat-cards', spotlight: true, title: 'Welcome to DGOS', body: 'This is your personal dashboard — it shows unread memos, tasks assigned to you, and open helpdesk tickets. Everything is specific to you, not the whole Ministry.' },
    { route: '/', target: 'notification-bell', spotlight: false, title: 'Your notification bell', body: 'Click the bell to see everything needing your attention — unread memos, upcoming meetings you\'re invited to, leave decisions — without visiting each module separately.' },
    { route: '/memos/inbox', target: 'memo-list', spotlight: true, title: 'Your memo inbox', body: 'Official memos from your HOD, Director, or the Principal Secretary appear here. Grey means unread, blue means opened, green means acknowledged.' },
    { route: '/memos/inbox', target: 'memo-list', spotlight: false, title: 'Open and acknowledge', body: 'Click any memo to read it. At the bottom you\'ll see an Acknowledge Receipt button — clicking it creates an official timestamped record that you received and read it. This replaces the physical signature.' },
    { route: '/leave', target: 'apply-leave-btn', spotlight: true, title: 'Apply for leave', body: 'No more paper leave forms. Select your leave type, dates, and optionally an acting officer. Your supervisor gets notified immediately and can approve or reject with a comment.' },
    { route: '/leave', target: 'my-leave-list', spotlight: false, title: 'Track your leave status', body: 'All your past and pending leave applications are here. You can see whether each one is pending, approved, or rejected — and the comment your supervisor left.' },
    { route: '/tickets', target: 'raise-ticket-btn', spotlight: true, title: 'ICT support — raise a ticket', body: 'Need help with a computer, software, or network issue? Raise a ticket here instead of calling ICT. It gets auto-assigned and you can track its status in real time.' },
    { route: '/tickets', target: 'my-ticket-list', spotlight: false, title: 'Track your tickets', body: 'All your support requests are here — Open, Assigned, In Progress, or Resolved. Once ICT resolves it, you can reopen it if the problem isn\'t fixed.' },
    { route: '/notices', target: 'notice-list', spotlight: true, title: 'Notice board', body: 'General announcements — public holidays, events, maintenance windows — appear here. Unlike memos, notices don\'t require acknowledgment. They expire and auto-archive.' },
  ],

  auditor: [
    { route: '/', target: 'stat-cards', spotlight: true, title: 'Auditor view', body: 'As Internal Auditor you have read-only access to everything across the Ministry. You cannot send memos, approve workflows, or modify data — but you can see the complete picture.' },
    { route: '/reports', target: 'report-tabs', spotlight: true, title: 'Your primary workspace', body: 'Reports & Audit is where you spend most of your time. Five reports give you operational visibility across memos, workflows, tasks, and staff activity.' },
    { route: '/reports', target: 'report-tabs', spotlight: false, title: 'Memo acknowledgment rates', body: 'Click "Memo Acknowledgment". This shows every published memo with its acknowledgment rate — who hasn\'t read what. A 60% rate on a Ministry-wide circular is an accountability gap made visible.' },
    { route: '/reports', target: 'report-tabs', spotlight: false, title: 'Workflow bottlenecks', body: 'Click "Workflow Performance". This shows average hours per step across all workflow types. If Finance consistently breaches its 48-hour SLA on procurement approvals, it shows here with exact figures.' },
    { route: '/reports', target: 'audit-log-section', spotlight: false, title: 'The audit log', body: 'Click "Audit Log". Filter by staff member, action type, or date range. Every login, approval, and document upload is here — permanently, in chronological order. Nobody can delete an entry.' },
    { route: '/directory', target: 'staff-list', spotlight: true, title: 'Full staff directory', body: 'You can see all active staff across every directorate — roles, departments, supervisors. Use this alongside the audit log to build a complete picture of any individual\'s activity.' },
    { route: '/workflows', target: 'workflow-list', spotlight: true, title: 'All workflows — read only', body: 'You can see every workflow instance across the Ministry — in progress, completed, or rejected — with the full step history and comments. You cannot act on any of them.' },
  ],
};
