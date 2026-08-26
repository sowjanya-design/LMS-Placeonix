const xlsx = require('xlsx');

const bugs = [
  // ── FIXED BUGS ──────────────────────────────────────────────────────────
  {
    id: 'UI-001', module: 'UI / Mobile', title: 'Logo not visible on mobile',
    description: 'Placeonix logo did not render in mobile view due to incorrect sizing',
    severity: 'High', status: 'Fixed', fixedIn: 'Session 1',
    fixDescription: 'Updated sidebar logo CSS; ensured proper width/height on mobile breakpoints',
    testedBy: 'Siddhartha', remainingAction: 'None',
  },
  {
    id: 'UI-002', module: 'UI / Mobile', title: 'Sidebar drawer not visible on mobile when opened',
    description: 'Mobile sidebar drawer opened but was hidden behind page content (z-index issue)',
    severity: 'High', status: 'Fixed', fixedIn: 'Session 1',
    fixDescription: 'Rewrote MobileNav to use React createPortal so drawer renders at document.body level above all content',
    testedBy: 'Siddhartha', remainingAction: 'None',
  },
  {
    id: 'UI-003', module: 'UI / Forms', title: 'Course form modal overflow on mobile',
    description: 'Add/Edit Course modal content was overflowing off-screen on small screens',
    severity: 'Medium', status: 'Fixed', fixedIn: 'Session 1',
    fixDescription: 'Added overflow-y-auto and max-height to modal content container',
    testedBy: 'QA Audit', remainingAction: 'None',
  },
  {
    id: 'BUILD-001', module: 'Build / Lint', title: 'JSX tag mismatches blocking production build',
    description: 'Multiple <Link>...</a> and <a>...</Link> mismatches in dashboard/page.tsx caused build failures',
    severity: 'Critical', status: 'Fixed', fixedIn: 'Session 1',
    fixDescription: 'Replaced all mismatched JSX tags; used <a> for external links and <Link> for internal navigation; added Link import',
    testedBy: 'CI Build', remainingAction: 'None',
  },
  {
    id: 'BUILD-002', module: 'Build / Lint', title: 'TypeScript any types causing lint errors',
    description: '24 lint errors including no-explicit-any, no-unused-vars blocking Railway CI build',
    severity: 'Critical', status: 'Fixed', fixedIn: 'Session 1',
    fixDescription: 'Replaced all `any` with proper typed casts; removed unused imports (ApiError, API_BASE, finalizeRes); fixed unescaped entities',
    testedBy: 'CI Build', remainingAction: 'None',
  },
  {
    id: 'BUILD-003', module: 'Build / TypeScript', title: 'TypeScript errors in slug page and dashboard',
    description: 'courses/[slug]/page.tsx typed as Record<string,unknown> causing property access errors; Course cast errors in dashboard',
    severity: 'Critical', status: 'Fixed', fixedIn: 'Session 2',
    fixDescription: 'Added CourseData interface with proper typed fields; used double cast (as unknown as Record<string,unknown>) in dashboard',
    testedBy: 'CI Build', remainingAction: 'None',
  },
  {
    id: 'DEPLOY-001', module: 'Deployment / API', title: 'Production site not connecting to backend (all pages broken)',
    description: 'Frontend hardcoded fallback API URL to localhost:5000; Railway production had no local server so all API calls failed silently',
    severity: 'Critical', status: 'Fixed', fixedIn: 'Session 2',
    fixDescription: 'Updated api.ts to use Railway backend URL as production fallback when NODE_ENV=production',
    testedBy: 'Live Site Test', remainingAction: 'None',
  },
  {
    id: 'B-05', module: 'Certificates', title: 'Certificate generated but clicking shows nothing',
    description: 'Issued certificate cards had no action — clicking did nothing; no way to view or download',
    severity: 'High', status: 'Fixed', fixedIn: 'Session 3',
    fixDescription: 'Added "View Certificate" button that opens a formatted printable certificate in a new tab with Print button',
    testedBy: 'Siddhartha', remainingAction: 'None',
  },
  {
    id: 'B-04', module: 'Payments', title: 'Student payments/fees page shows nothing',
    description: 'Payments page was admin-only; students saw an empty permission-denied page instead of their fee information',
    severity: 'Critical', status: 'Fixed', fixedIn: 'Session 3',
    fixDescription: 'Added student-specific "My Fees" view showing enrolled course fees, batch, and status per enrollment',
    testedBy: 'Siddhartha', remainingAction: 'None',
  },
  {
    id: 'B-06', module: 'Security', title: 'JWT access token still valid after logout (token not invalidated)',
    description: 'After logging out, previously obtained access token still returned 200 OK on protected endpoints',
    severity: 'High', status: 'Fixed', fixedIn: 'Session 3',
    fixDescription: 'Added tokenBlacklistedAt field to User model; logout sets this timestamp; protect middleware rejects tokens issued before it',
    testedBy: 'Siddhartha', remainingAction: 'None',
  },
  {
    id: 'UX-001', module: 'My Courses', title: 'Clicking course card in My Courses does nothing',
    description: 'Students expected clicking a course card to open progress details but cards were non-interactive divs',
    severity: 'Medium', status: 'Fixed', fixedIn: 'Session 3',
    fixDescription: 'Converted course cards to <a> links routing to /dashboard/my-courses/[enrollmentId] with "View →" indicator',
    testedBy: 'Tester Feedback', remainingAction: 'None',
  },
  {
    id: 'B-01', module: 'Assignments', title: 'Assignment submission has no confirmation to student',
    description: 'Students submit assignments but receive no visual confirmation that submission was recorded',
    severity: 'High', status: 'Fixed', fixedIn: 'Session 4',
    fixDescription: 'Added success toast/modal and visual state updates after student submits an assignment',
    testedBy: 'Siddhartha', remainingAction: 'None',
  },
  {
    id: 'B-03', module: 'Attendance', title: 'Students cannot self-mark attendance',
    description: 'Self-attendance marking feature exists in UI but does not work for students',
    severity: 'High', status: 'Fixed', fixedIn: 'Session 4',
    fixDescription: 'Updated attendance mark endpoint fetching to use proper enrollment list rather than admin-only student list route',
    testedBy: 'Siddhartha', remainingAction: 'None',
  },
  {
    id: 'SEC-002', module: 'Security', title: 'JWT access token expiry too long (7 days)',
    description: 'SEC-001B: Access token has 7-day lifetime; short-lived tokens (15-60 min) are security best practice',
    severity: 'Medium', status: 'Fixed', fixedIn: 'Session 4',
    fixDescription: 'Reduced JWT access token expiry to 1 hour',
    testedBy: 'Siddhartha', remainingAction: 'None',
  },
  {
    id: 'UX-002', module: 'Jobs / Placement', title: 'No external job link when posting placement drives',
    description: 'Admin can post placement jobs but cannot add an application URL for students to apply',
    severity: 'Low', status: 'Fixed', fixedIn: 'Session 4',
    fixDescription: 'Added Job Application URL field to drive creation modal and display external apply button if present',
    testedBy: 'Siddhartha', remainingAction: 'None',
  },
  // ── REMAINING / OPEN BUGS ───────────────────────────────────────────────
  {
    id: 'B-07', module: 'Performance', title: 'Application fails under 500+ concurrent users',
    description: '16.28% failure rate at 500 VUs; 23.32% at 1000 VUs. Connection timeouts and response degradation observed',
    severity: 'Critical', status: 'Open', fixedIn: '',
    fixDescription: 'Requires backend infrastructure scaling: connection pooling, Railway tier upgrade, MongoDB index review, caching layer',
    testedBy: 'Siddhartha', remainingAction: 'Scale Railway plan; add Redis cache; optimize MongoDB queries',
  },
  {
    id: 'FEAT-001', module: 'Quiz', title: 'No dedicated quiz feature',
    description: 'QUIZ-001/002 blocked: no quiz module exists in the system (mock tests work but no formal quiz)',
    severity: 'Medium', status: 'Not Built', fixedIn: '',
    fixDescription: '',
    testedBy: 'Siddhartha', remainingAction: 'Build quiz/assessment module with timer, auto-submit, scoring',
  },
  {
    id: 'FEAT-002', module: 'Notifications', title: 'No email notification feature',
    description: 'NOTIF-001 blocked: no email delivery system integrated for events like enrollment, assignment due, etc.',
    severity: 'Medium', status: 'Not Built', fixedIn: '',
    fixDescription: '',
    testedBy: 'Siddhartha', remainingAction: 'Integrate nodemailer or SendGrid; build notification triggers',
  },
  {
    id: 'FEAT-003', module: 'Zoho Integration', title: 'No Zoho student email creation',
    description: 'ZOHO-001 blocked: no Zoho CRM/Mail integration to auto-create student email accounts',
    severity: 'Medium', status: 'Not Built', fixedIn: '',
    fixDescription: '',
    testedBy: 'Siddhartha', remainingAction: 'Integrate Zoho API for automated student email provisioning',
  },
  {
    id: 'FEAT-004', module: 'Assignments', title: 'No file upload for assignment submissions',
    description: 'ASSIGN-003 / EDGE-001 blocked: only text/link submission supported; no file upload feature',
    severity: 'Low', status: 'Not Built', fixedIn: '',
    fixDescription: '',
    testedBy: 'Siddhartha', remainingAction: 'Add file upload to assignment submission form (S3/Cloudflare R2)',
  },
];

// ── Summary counts ─────────────────────────────────────────────────────────
const total = bugs.length;
const fixed = bugs.filter(b => b.status === 'Fixed').length;
const open = bugs.filter(b => b.status === 'Open').length;
const notBuilt = bugs.filter(b => b.status === 'Not Built').length;
const critical = bugs.filter(b => b.severity === 'Critical').length;

// ── Workbook ───────────────────────────────────────────────────────────────
const wb = xlsx.utils.book_new();

// ── Sheet 1: Summary ───────────────────────────────────────────────────────
const summaryData = [
  ['Placeonix LMS — Bug Tracker & Fix Summary'],
  ['Generated', new Date().toLocaleString('en-IN')],
  [],
  ['Metric', 'Count'],
  ['Total Bugs Tracked', total],
  ['✅ Fixed', fixed],
  ['🔴 Open (Need Fix)', open],
  ['⬛ Not Built (Feature Gap)', notBuilt],
  ['🚨 Critical Severity', critical],
  [],
  ['Status', 'Count', 'Percentage'],
  ['Fixed', fixed, `${Math.round(fixed/total*100)}%`],
  ['Open', open, `${Math.round(open/total*100)}%`],
  ['Not Built', notBuilt, `${Math.round(notBuilt/total*100)}%`],
];
const wsSummary = xlsx.utils.aoa_to_sheet(summaryData);
wsSummary['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 15 }];
xlsx.utils.book_append_sheet(wb, wsSummary, 'Summary');

// ── Sheet 2: All Bugs ──────────────────────────────────────────────────────
const headers = ['Bug ID', 'Module', 'Title', 'Description', 'Severity', 'Status', 'Fixed In', 'Fix Description', 'Tested By', 'Remaining Action'];
const allBugRows = bugs.map(b => [
  b.id, b.module, b.title, b.description, b.severity, b.status, b.fixedIn, b.fixDescription, b.testedBy, b.remainingAction
]);
const wsAll = xlsx.utils.aoa_to_sheet([headers, ...allBugRows]);
wsAll['!cols'] = [
  { wch: 12 }, { wch: 18 }, { wch: 45 }, { wch: 60 },
  { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 60 },
  { wch: 14 }, { wch: 55 }
];
xlsx.utils.book_append_sheet(wb, wsAll, 'All Bugs');

// ── Sheet 3: Fixed Bugs ────────────────────────────────────────────────────
const fixedRows = bugs.filter(b => b.status === 'Fixed').map(b => [
  b.id, b.module, b.title, b.severity, b.fixedIn, b.fixDescription
]);
const wsFixed = xlsx.utils.aoa_to_sheet([
  ['Bug ID', 'Module', 'Title', 'Severity', 'Fixed In Session', 'Fix Description'],
  ...fixedRows
]);
wsFixed['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 45 }, { wch: 12 }, { wch: 18 }, { wch: 65 }];
xlsx.utils.book_append_sheet(wb, wsFixed, 'Fixed Bugs');

// ── Sheet 4: Open & Remaining ─────────────────────────────────────────────
const openRows = bugs.filter(b => b.status !== 'Fixed').map(b => [
  b.id, b.module, b.title, b.severity, b.status, b.remainingAction
]);
const wsOpen = xlsx.utils.aoa_to_sheet([
  ['Bug ID', 'Module', 'Title', 'Severity', 'Status', 'Action Required'],
  ...openRows
]);
wsOpen['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 45 }, { wch: 12 }, { wch: 14 }, { wch: 65 }];
xlsx.utils.book_append_sheet(wb, wsOpen, 'Open & Remaining');

const out = 'd:/Placeonix/Placeonix_Dashboard-main/docs/Placeonix_LMS_Bug_Tracker_Updated.xlsx';
xlsx.writeFile(wb, out);
console.log('✅ Excel written to:', out);
console.log(`Total: ${total} | Fixed: ${fixed} | Open: ${open} | Not Built: ${notBuilt}`);
