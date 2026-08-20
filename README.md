# How to start the APP?
```
cd ~/Projects/github/dashboard
npm run dev
```

# Daily Routine Reset Launchd

```
launchctl load ~/Library/LaunchAgents/com.dashboard.dailyreset.plist

```

# Daily Routine Reset node-cron


# Entry point of App 
- public/index.html -> ../index.js -> ../App.js -> Routes (/ -> HomeDashboard)
- App.js -> Login(auth), User Registration, Routes, Top Navbar, Sidebar, Botton Navbar
- /(HomeDashboard) -> src/home/index.jsx

# in Section (9) - it's generic code for all 9 sections including routes and frontend 
# backend (routes/section.js (select/DML))
# backend (db/sectionConfig.js (table, column, orderby clause))
# backend (db/sectionRepository.js (DML, Select - query formation with dynamic columns for each table)) - parsing

# frontend (config/sectionFields.js) -  Frontend form mapping with actual table columns
# frontend (component/SectionForm.js) - 

# If you want to fix Section
 1. db/sectionConfig.js  (update column names)
 2. config/sectionFields.js (update column name, Frontend fields)
 3. for person name (join with )

# Rule of Thumb
Root package.json: Holds project-wide orchestrators and tooling (like concurrently).

backend/package.json: Holds server dependencies and server-specific start/build scripts.

frontend/package.json: Holds UI libraries (React/Vue), client build tools (Vite/Webpack), and client scripts.


# Errors section 
```
[frontend] src/scenes/global/Sidebar.jsx
[frontend]   Line 21:8:  'MedicalServicesIcon' is defined but never used  no-unused-vars
[frontend]
[frontend] webpack compiled with 1 warning
[frontend] (node:5072) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
[frontend] Proxy error: Could not proxy request /getKidsMenu from localhost:3000 to http://localhost:5000.
[frontend] See https://nodejs.org/api/errors.html#errors_common_system_errors for more information (ECONNREFUSED).
[frontend]
[frontend] Proxy error: Could not proxy request /getKidsMenu from localhost:3000 to http://localhost:5000.
[frontend] See https://nodejs.org/api/errors.html#errors_common_system_errors for more information (ECONNREFUSED).```

fixed:
in root package.json 
  "proxy": "http://localhost:5001", =>   "proxy": "http://127.0.0.1:5001",

```

## Issues to be fixed
npm audit fixes
update npm packages

react-pro-sidebar@0.7.1 is old and known to have friction with responsive/mobile behavior and newer React — 
worth considering react-pro-sidebar@1.x or a lighter custom drawer when we get to the mobile pass.


# Fixed issues
- Sidebar overlapping fixed
    Setting .pro-sidebar { position: relative !important; } forces the browser to place the sidebar in normal flexflow next to your content instead of floating over Today's Routine.
    The @media (max-width: 768px) rule ensures that when you test on mobile screens, it cleanly converts into a sliding drawer overlay.

- use Tailscale https
- Add/Modify/Update button
- The Skipped popup dropdown form is ugly, need better colors

# Must Do
- run the app in launchd
//app.use("/api", require("./routes/routine"));  // breaks routine route, need to fix 


# Enhancements
- Implement PWA


P5 (low)
- Frontend: CRA (react-scripts 5) + MUI v5 + react-pro-sidebar v0.7 + react-router-dom v6 + FullCalendar + Nivo/Chart.js (two charting libs installed — Nivo and Chart.js, worth consolidating later).

# Stack overview
- Backend: Express + sqlite3 + multer + cors, single server.js, no route file separation yet.
- DB: SQLite file expected at backend/routine.db, tables referenced so far: meal, event, doctor_appointment, activity. No routine table yet, matching what you said — that section genuinely doesn't exist.

# Bugs / gaps found
## Backend
- deleteEvent and updateEvent have broken SQL — DELETE ... WHERE (cols) VALUES (?,?,?) and UPDATE event (cols) VALUES (?,?,?) are invalid syntax (mixing INSERT grammar into DELETE/UPDATE) and neither uses a primary key. These will throw at runtime, not just misbehave.
- No table has a clear primary key referenced anywhere in the queries (e.g. event_id), which you'll need for reliable update/delete once we design DDL.
- No auth/access control on any route. Given the module list (Passport, Driver License, Account Logins, Insurance, Medical), this matters a lot even for a home server — at minimum a login gate before this goes past your LAN.
- cors: origin: '*' — fine for local dev, should be locked down before any external exposure.
- multer saves with file.originalname — no size/type validation, no collision handling (two uploads with the same name overwrite each other).

## Frontend
- Topbar: search input has no state/handler (decorative only); notification/settings/profile icons have no onClick.
- Sidebar: hardcoded name ("Sandarbh") and several duplicate/inconsistent to= paths (e.g. "Health" insurance item and "Driver License" personal item both point to /health; "Team" and "Manage Team" both point to /team; "Geography Chart" is listed twice). A lot of this looks like leftover from the MUI admin-dashboard template it was scaffolded from and needs re-mapping to your real modules.
- Most of App.js's routes are commented out, so the Sidebar currently links to many pages that don't render.
- No responsive breakpoints anywhere — index.css is just 100% width/height, and the Sidebar/Topbar use fixed MUI Box layouts. Mobile support is a real (but doable) task, not just styling polish.
- react-pro-sidebar@0.7.1 is old and known to have friction with responsive/mobile behavior and newer React — worth considering react-pro-sidebar@1.x or a lighter custom drawer when we get to the mobile pass.


# Gaps / open questions in the algorithm (from Claude)
- Weekly tasks — the algo only covers frequency='daily'. Weekly tasks need the same temp-table population, but gated by day-of-week (so you'll want a day_of_week column, or a bitmask, on the base table).
- Multiple people per task — is person a single value, or can one task apply to several people at once (e.g. "brush teeth" for two kids)? That decides whether it's a plain column or a join table.
- Snooze semantics — snooze for how long? Does it re-notify after the snooze window and pop back toward the top, or just sit at the bottom until manually revisited?
- End-of-day ordering matters: you want "insert into daily_routine_log for unmarked tasks" to run before "delete from daily_routine_temp" — otherwise you lose the unmarked rows before logging them. Worth stating explicitly as step order in the nightly job.
- Skip reasons — fixed list (lazy, tired, office work, guest, outdoor, no reason) or should it be admin-editable later? Easy either way, just changes whether it's a hardcoded enum or a lookup table.
- Undo on swipe-delete — Apple's swipe-to-delete pattern usually pairs with a brief "Undo" toast before the row is actually gone, since done/skip decisions can be mis-tapped. Worth adding as a UX safety net.
- "Reminder tone/popup/notification when time is current" — this is the same PWA/Web Push territory we discussed for the whole site. In-app popups (tab open) are simple to build now; true background phone notifications require the installable-PWA + push setup. Good to decide which one v1 targets.
- "Announce" (TTS → Bluetooth) — agreed this is a placeholder for now; I'll stub it as a no-op function so the UI/DB shape is ready when you wire up Web Speech API later.


## Vibrant/catchy ideas (since that's a hard requirement)
- Streak counter per person ("Sandarbh: 5-day streak 🔥") to build habit stickiness.
- A satisfying micro-animation/checkmark burst on marking "done" rather than an instant disappear.
- Color-coded status chips (not just text) — e.g. amber for pending-and-due-soon, green for done, grey for skipped.
- Daily completion ring/progress bar at the top of the list, MUI + a simple SVG ring is enough, no extra library needed.
- A few of these change the actual code structure, so rather than guess and risk a rebuild, let me confirm three things:



# 2. Front-End Strategy (React)
a) Auth Context & State:
- Create an AuthContext (or use your existing React context setup) to hold the global state: user, isAuthenticated, token, and loading states.  

b) Login / Register Scenes:
- Build a login form scene with input fields for email/password using your existing MUI theme.  
- On submit, send credentials to /api/auth/login and store the returned token (ideally via HTTP-only cookies)

c) Protected Route Wrapper: (Pending)
- Create a <ProtectedRoute> component that wraps your application routes in App.js.  
- If isAuthenticated is false, redirect the user to /login.
- If isAuthenticated is true, render the requested page (/routine, /kids, etc.).  

d) API Request Interceptor / Helper:
- Update your api() fetch helper function to automatically include the Authorization header (e.g., Bearer <token>) on outgoing requests.  
- Handle 401 Unauthorized responses globally by clearing the session and redirecting the user to login.


3. UI/UX Integration
Navigation & Topbar Updates:
Add a user profile menu or Logout button in your Topbar or Sidebar.  

Conditional Sidebar Items:
Hide administrative menu items (like Routine Admin) unless the logged-in user has the appropriate role or permissions.
When you are ready to start coding, let me know whether you prefer JWT (JSON Web Tokens) or Session-based auth, and we can build it step-by-step!

=> Chose JWTOKEN for this recommended by Gemini.

Added first, last name, field in users table, below step is not done 

```
Step 4: Update AuthContext.js
Ensure your AuthContext stores the user object returned from the backend (including firstName and lastName) when logging in or checking session status:
JavaScript
// Example AuthContext login state setup
const [user, setUser] = useState(null); // e.g., { id: 1, email: '...', firstName: 'Sandarbh', lastName: '...' }

const login = async (email, password) => {
  const res = await fetch('/api/auth/login', { /* ... */ });
  const data = await res.json();
  if (res.ok) {
    setUser(data.user); // Contains firstName and lastName
    setIsAuthenticated(true);
  }
};
```
There are 12 errors reported on Developer Tool



renewals, events, appointments, routines, todo_task.

renewals - must be completed by hand 
todo_tasks - must be completed by hand 
events - no action needed for past days (keep buffer of 2 days to display on reminders card)
appointments - can be manually marked completed (show it for next 7 days and then remove from the view)
routines - must be completed by hand or skipped, if no action taken, it will disappear from reminders and will be populated again for next day (this functionality already built and working under src/scenes/routine/RoutineAdmin route)

can we have reminder_feed as a view (5 tables)
upsert/merge on reminder table 


future prospect => reminder + tasks from (school calender + US calender + India calender)




events - for birthday or other invitations need to take action to buy gift (haven't considered this scenario)
renewals - must be completed by hand (can open workflow type todo_list when passport/oci/h1/h4/drivers license is the category as they need several small steps)

- Add new sidebar menu using Dashboard section configuration

1. Database — new table DDL- home_dashboard_schema.sql
2. Backend — db/sectionConfig.js
```
  home_maintenance: {
  tableName: 'home_maintenance',
  columns: [
    'title', 'area', 'service_provider', 'last_serviced_date',
    'next_due_date', 'frequency', 'amount', 'notes',
    'family_member_id', 'status',
  ],
  requiredColumns: ['title', 'next_due_date'],
  select: 'home_maintenance.*, family_members.first_name AS family_member_name',
  joins: 'LEFT JOIN family_members ON family_members.id = home_maintenance.family_member_id',
  orderBy: '(next_due_date IS NULL) ASC, next_due_date ASC',
},
```
No changes needed to routes/section.js or db/sectionRepository.js — they already work off this config.

3. Frontend — config/sectionFields.js
Add a matching home_maintenance entry with fields (quick-add), optional detailFields (View All extras, following the todo_list pattern), an icon, and mapRowToItem:

```
home_maintenance: {
  tableName: 'home_maintenance',
  label: 'Home Maintenance',
  icon: <BuildOutlinedIcon />,
  viewAllLink: '/homeMaintenance',
  emptyMessage: 'Nothing scheduled',
  fields: [
    { name: 'title', label: 'Task', type: 'text', required: true },
    { name: 'area', label: 'Area', type: 'select', required: false,
      options: [
        { value: 'hvac', label: 'HVAC' },
        { value: 'plumbing', label: 'Plumbing' },
        { value: 'roof', label: 'Roof' },
        { value: 'appliance', label: 'Appliance' },
        { value: 'other', label: 'Other' },
      ]},
    { name: 'next_due_date', label: 'Next Due', type: 'date', required: true },
    { name: 'family_member_id', label: 'Assigned To', type: 'asyncSelect', source: 'familyMembers', required: false },
  ],
  detailFields: [
    { name: 'service_provider', label: 'Provider', type: 'text', required: false },
    { name: 'last_serviced_date', label: 'Last Serviced', type: 'date', required: false },
    { name: 'frequency', label: 'Frequency', type: 'select', required: false,
      options: ['monthly','quarterly','6_months','yearly','custom']},
    { name: 'amount', label: 'Cost', type: 'number', required: false },
    { name: 'status', label: 'Status', type: 'select', required: false,
      options: [{value:'pending',label:'Pending'},{value:'done',label:'Done'}]},
    { name: 'notes', label: 'Notes', type: 'textarea', required: false },
  ],
  mapRowToItem: (row) => ({
    id: row.id,
    primary: row.title,
    secondary: row.area,
    meta: row.next_due_date ? fmtDate(row.next_due_date) : undefined,
  }),
},
```

SectionForm and SectionDetailView are entirely driven by this config — no changes needed there either.


4. Wire it into the dashboard grid
Wherever sectionFields entries currently get rendered as <DashboardSection> cards (looks like scenes/dashboard/index.jsx, which wasn't in your upload — worth checking), add home_maintenance to that list the same way todo_list etc. are rendered. Since you didn't attach that file, I can't confirm the exact loop, but based on this pattern it's almost certainly something like:

{Object.keys(sectionFields).map(key => (
  <DashboardSection key={key} {...sectionFields[key]} items={...} />
))}


5. Sidebar + route

Two small additions, neither reuses "section" logic since they're just navigation:

Sidebar.jsx (not uploaded): add a nav item pointing to /homeMaintenance, probably nested under "Home".
App.js: add a route using the generic detail view:

```
<Route path="/homeMaintenance" element={<SectionDetailView sectionKey="home_maintenance" />} />
```
