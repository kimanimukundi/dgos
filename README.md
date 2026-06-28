# DGOS — Digital Government Operations System
### Ministry of Tourism & Wildlife, Kenya

A secure internal web application for official communication, document management, and workflow operations.

---

## Prerequisites

- Node.js v16+
- PostgreSQL 13+ (running locally)
- npm

---

## Setup Instructions

### 1. Configure the database connection

Edit `server/.env` if your PostgreSQL credentials differ from the defaults:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dgos
DB_USER=postgres
DB_PASSWORD=postgres        ← change this to your postgres password
JWT_SECRET=dgos-mot-kenya-secret-change-in-production
PORT=3001
```

### 2. Set up the database

```bash
cd server
node setup-db.js
```

This will:
- Create the `dgos` database
- Create all tables
- Load seed data (25 fictional staff, 3 sample memos, 3 notices)

### 3. Start the server

```bash
cd server
npm start
```

Server runs on http://localhost:3001

### 4. Start the client (new terminal)

```bash
cd client
npm start
```

Client runs on http://localhost:3000

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Cabinet Secretary | cs@tourism.go.ke | Password@123 |
| Principal Secretary | ps.tourism@tourism.go.ke | Password@123 |
| HOD (Finance) | director.finance@tourism.go.ke | Password@123 |
| HOD (ICT) | director.ict@tourism.go.ke | Password@123 |
| System Admin | dennis.kiprop@tourism.go.ke | Password@123 |
| Staff (Finance) | mary.achieng@tourism.go.ke | Password@123 |
| Staff (ICT) | patricia.njeri@tourism.go.ke | Password@123 |
| Auditor | auditor@tourism.go.ke | Password@123 |

Accounts marked with `must_change_password=TRUE` in seed data will be prompted to set a new password on first login.

---

## Demo Script (for presenting)

**As the ICT Director (`director.ict@tourism.go.ke`):**
1. Log in → see dashboard with pending memos
2. Open Inbox → see 3 memos with different statuses
3. Open Memo #2 (ICT Password Policy) → see official memo format → Acknowledge
4. Go to Sent Memos → see tracking view
5. Compose a new memo → send to Finance department
6. View the tracking page for the new memo

**As a Staff member (`mary.achieng@tourism.go.ke`):**
1. Log in → prompted to change password (first login)
2. See dashboard with unread memos
3. Receive and acknowledge the memo just sent

**As System Admin (`dennis.kiprop@tourism.go.ke`):**
1. Go to Admin → Manage Staff → create a new account
2. View Org Chart — all departments and units
3. View Staff Directory — search and filter

---

## System Architecture

```
dgos/
├── server/           Express API (Node.js)
│   ├── db/           PostgreSQL schema, seed data, connection pool
│   ├── middleware/   JWT auth, role checking
│   ├── routes/       auth, staff, memos, notices, dashboard
│   └── index.js      Entry point
│
└── client/           React SPA
    └── src/
        ├── context/  Auth context (JWT storage, login/logout)
        ├── pages/    All views (Dashboard, Inbox, MemoView, etc.)
        └── utils/    Axios instance with auth interceptors
```

---

## Phase Roadmap

| Phase | Status | Modules |
|-------|--------|---------|
| **Phase 1** | ✅ Built | Auth, Staff Directory, Org Chart, Roles, Dashboard |
| **Phase 2** | ✅ Built | Memos, Acknowledgments, Notice Board, Document Registry |
| **Phase 3** | ✅ Built | Workflows & Approvals, Task System |
| **Phase 4** | ✅ Built | Reports & Analytics, Audit Log UI, Leave & Absence |
| **Phase 5** | ✅ Built | Asset Registry, Meeting Management, Contracts & Vendors, depth additions |
| **Phase 6** | ✅ Built | ICT Helpdesk Ticketing |
| **Phase 7** | ✅ Built | Document Management, Global Search |
| **Phase 8** | ✅ Built | Notifications Center |

---

## Phase 8 — What's New

**Notifications Center** — A bell icon in the top bar, next to Global Search, surfacing everything that needs a user's attention across the entire system in one place. Unlike a typical notification log, these are **computed live** from existing data rather than stored as separate events — a "workflow step assigned to you" notification disappears the moment you act on it, because the underlying condition is gone. This avoids a forever-growing table and keeps the panel always accurate.

**What it pulls together:**
- Unacknowledged memos (sorted by urgency)
- Workflow steps awaiting your action (flagging SLA breaches)
- Tasks due within 48 hours or overdue
- Helpdesk tickets assigned to you (ICT staff) or resolved tickets awaiting your confirmation (requesters)
- Leave requests awaiting your approval (supervisors/HODs), or your own leave that was just actioned
- Contracts expiring within 90 days (HOD+)
- Meetings you're invited to within the next 24 hours

Each category is capped at 5 items sorted by genuine urgency, with a "View all" link to the full module rather than an endless list. Read/unread state persists per user — clicking a notification marks it read and navigates straight to the record.

---

## Demo Script — Phase 8

**As a Director or HOD with several things pending:**
1. Click the bell icon in the top bar → see a populated panel grouped by type: pending workflow approvals, unacknowledged memos, leave awaiting approval
2. Click directly into one — it marks read and takes you straight to the record
3. Click "Mark all read" → badge clears

**As ICT staff:**
1. The bell shows tickets assigned to you, sorted by priority — critical tickets are visually flagged in red

**Cross-check the "computed, not stored" behaviour:**
1. Note an unacknowledged memo showing in the bell
2. Go acknowledge it in the Inbox
3. Reopen the bell — that notification is gone, because the condition that created it no longer exists



---

## Phase 7 — What's New

**Document Management** — A real registry for Policies, Circulars, Reports, and Guidelines — separate from memos. Any staff member can upload. Full version history: uploading a new version doesn't overwrite, it adds a new row and marks the prior version's document as updated, with both visible in a version timeline. Documents can optionally link back to the workflow that produced them (e.g. a Policy Approval workflow). Draft documents are private to the uploader and their department; published documents are visible to everyone.

**Global Search** — A search bar fixed in the top bar across every page, querying Memos, Workflows, Tasks, Assets, Documents, Contracts, and Tickets simultaneously with a 300ms debounce. Results are grouped by type and respect the same visibility rules as each module — you only see memos you sent or received, workflows you're involved in (unless you're HOD+/Auditor), tickets you raised (unless you're ICT staff), and so on.

---

## Demo Script — Phase 7

**Document Management — as any staff member:**
1. Go to Document Registry → Upload Document → fill in a Policy, mark it Published
2. Open it → Upload New Version with a change note → see both versions in the timeline, with "Current" tagged on the latest

**Document Management — draft visibility:**
1. Upload a document as Draft → log in as someone outside your department → confirm it's not visible to them
2. Log back in as yourself or your HOD → publish it → now everyone can see it

**Global Search — from anywhere in the app:**
1. Type "ICT" in the top search bar → see results grouped across Memos, Workflows, Documents, Tickets all at once
2. Try searching a memo number like "MEMO/MOT/2025" or an asset tag like "MOT/AST" — direct click-through to the record



---

## Phase 6 — What's New

**ICT Helpdesk** — Any staff member can raise a support ticket (Hardware / Software / Network / Access & Accounts / Other), with HOD+ able to raise on behalf of someone else. Tickets auto-assign to whichever ICT staff member currently has the fewest open tickets — true load balancing, not round-robin.

**Lifecycle:** Open → Assigned → In Progress → Resolved → Closed, with a **Reopen** path the original requester can trigger if the issue isn't actually fixed. Resolving requires a written resolution note — same evidence principle as Tasks.

**Two views:** "My Tickets" (everyone) and "ICT Queue" (ICT department staff only — filterable by Unassigned / Assigned to Me / All). Tickets visually flag as "Aging" if open >24h unassigned or untouched >72h.

**Seed data** includes 8 tickets spanning every status, with realistic comment threads on three of them showing the back-and-forth pattern.

---

## Demo Script — Phase 6

**As any staff member (`mary.achieng@tourism.go.ke`):**
1. Go to ICT Helpdesk → Raise Ticket → submit something simple (e.g. "Monitor flickering")
2. Watch it auto-assign to whichever ICT staff member has the lightest load
3. Check My Tickets — see it sitting there with status "Assigned"

**As ICT staff (`patricia.njeri@tourism.go.ke` or `dennis.kiprop@tourism.go.ke`):**
1. Go to ICT Helpdesk → ICT Queue tab → see tickets sorted by priority, oldest first
2. Open one assigned to you → mark In Progress → add a resolution note → Mark Resolved
3. Try the "Aging" filter visually by checking ticket TKT/MOT/2025/005 (open 3+ hours, low priority) vs critical ones

**As the original requester:**
1. Open a resolved ticket you raised → click "Reopen This Ticket" → see it flip back to Reopened status, ready for ICT to pick up again



---

## Phase 5 — What's New

**Asset Registry** — Full asset lifecycle tracking: tag, category, condition, custodian, location, value. Wired into the existing Asset Disposal workflow — selecting assets when initiating a disposal request links them, and when the workflow completes, those assets are automatically marked `disposed` with a history entry. The seed data retroactively links real assets to the existing demo workflows (both the in-progress and the completed one).

**Meeting Management** — Schedule meetings with agenda and attendees, record minutes, and add action points. Action points can optionally auto-generate a linked Task in one step.

**Contracts & Vendor Registry** — Vendor directory, contract records with value/dates, automatic expiry detection, and a 90-day expiry warning banner.

**Depth additions:**
- Workflows can now be **withdrawn** by the initiator while in progress
- Tasks support **subtasks** (simple checklist) and can be **linked to specific assets**
- Workflow detail and Task detail pages show linked assets with click-through

---

## Demo Script — Phase 5

**As ICT Admin (`dennis.kiprop@tourism.go.ke`):**
1. Go to Asset Registry → see all 12 seeded assets, including 4 already linked to the in-progress disposal workflow
2. Open one of the disposed assets → see its full history trail ending in "Disposed per WF/MOT/2024/047"

**As Finance HOD (`director.finance@tourism.go.ke`):**
1. Go to Workflows → open the Asset Disposal request → see the 4 linked assets listed with click-through to each
2. Approve the step → the workflow advances; once the final Director approval happens, those assets will auto-flip to "disposed"

**As any HOD/Director:**
1. Go to Meetings → open "Q1 2025 Directors' Coordination Meeting" (completed, with minutes and 3 action points already recorded)
2. One action point is already linked to an existing Task — click through to see it
3. Go to Contracts & Vendors → notice the expiry alert banner (one contract already seeded as expired, demonstrating the auto-detection)

**Depth — as a task assignee:**
1. Open a task you're assigned → add a subtask, check it off
2. Open the Asset Disposal collection task → see it's already linked to two disposed assets



---

## Phase 3 & 4 — What's New

**Workflows & Approvals** — 5 pre-loaded templates: Asset Disposal, Leave Application, Procurement Request, Policy Approval, Staff Recruitment. Each routes through defined steps by role; approvers see SLA deadlines and can approve/reject with comments. Rejecting ends the workflow; approving the final step completes it.

**Tasks** — Assign work with deadlines and priority. Completion requires a written note (the "evidence" principle). Auto-flags overdue. Comment thread for updates.

**Leave & Absence** — Staff apply for leave (annual/sick/compassionate/study/maternity/paternity), supervisors and HODs approve. Acting officer can be designated.

**Reports & Analytics** — 5 report types: Memo Acknowledgment rates, Workflow Performance (with step-level bottleneck analysis), Task Completion by department, Staff Activity, and a full filterable Audit Log.

---

## Demo Script — Phase 3 & 4 additions

**As ICT HOD (`director.ict@tourism.go.ke`):**
1. Go to Workflows → see "Asset Disposal — Batch 1" sitting at step 2 (Finance Verification, assigned to you)
2. Open it → see the full approval chain visually, with step 1 already approved
3. Approve it with a comment → see it advance to Director Approval

**As Finance HOD (`director.finance@tourism.go.ke`):**
1. Go to Tasks → assign a new task to a Finance staff member
2. Go to Leave → see pending leave approval for someone in Finance

**As Director/Auditor (`auditor@tourism.go.ke` or any Director):**
1. Go to Reports & Audit
2. View Workflow Performance → see step bottleneck analysis (which steps take longest)
3. View Task Completion → see overdue tasks across departments
4. View Audit Log → filter by staff member, see every action they've taken



---

## Notes

- The org structure is fully data-driven. When the real Ministry structure is ready, an admin can update departments, units, and staff via the Admin panel without any code changes.
- All published memos are immutable and permanently stored.
- The audit log records every action automatically.
- SMS notifications are architecturally designed for (urgency tiers, notification model) but not wired to an SMS gateway in this prototype.
