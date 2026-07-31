# Project Status

## Reviewed (existing code)
- Frontend: CRA + MUI dashboard template (Topbar, Sidebar, theme, routing)
- Backend: Express + SQLite (server.js), meal/event/doctor/activity endpoints
- Found bugs: broken `updateEvent`/`deleteEvent` SQL, no auth on any route, CRA proxy port mismatch (5000 vs 5001), Sidebar duplicate/stale links

## Decisions made
- Daily reset (temp table repopulate) triggers from app/web server — confirmed feasible
- Notifications: full installable-PWA push (works when phone closed) — chosen for v1
- DB: SQLite now, abstracted via a repository/driver pattern so MySQL can be swapped in later
- Process reliability: PM2 (auto-restart + boot-start via launchd) planned for server; `brew services` planned for MySQL later
- HTTPS: Tailscale already installed — unblocks PWA push testing

## Built: Routine module (backend)
- `backend/db/schema.sql` — `daily_routine`, `daily_routine_temp`, `daily_routine_log`, `app_state` tables
- `backend/db/connection.js` — picks DB driver via `DB_ENGINE` env var
- `backend/db/drivers/sqliteDriver.js` — active driver
- `backend/db/drivers/mysqlDriver.js` — stub, ready for later migration
- `backend/db/routineRepository.js` — all business logic: daily reset (idempotent), done/skip/mute/snooze/announce, streak calculation, routine CRUD
- `backend/routes/routine.js` — REST endpoints, mounted in `server.js` via `app.use(require("./routes/routine"))`

## Built: Routine module (frontend)
- `frontend/src/scenes/routine/index.jsx` — today's task list
- Swipe right = done, swipe left = skip (with reason dialog)
- Mute / snooze / announce icon toggles per task
- Muted/snoozed tasks sink to bottom
- 4.5s undo window before action is committed to backend
- Streak chips per person, daily progress bar
- Wired into `App.js` route `/routine` and Sidebar link — **confirmed working in browser**
- Admin UI to add/edit/delete routine templates (backend CRUD endpoints exist, no form yet) - "task name" fading still exists
- The Skipped action popup dropdown form is ugly, need better colors and large fontsize
- Backend: Express + sqlite3 + multer + cors, 
- No auth on any backend route — flagged as a pre-launch requirement given Passport/Insurance/Logins modules planned

## Known gaps / not yet built

- PWA push (manifest, service worker, VAPID keys, subscription storage) developed, but not tested
- HTTPS: Tailscale already installed — unblocks PWA push testing
- cors: origin: '*' — fine for local dev, should be locked down before any external exposure.
- Logged out on refresh
- Prod ready (npm build prod + npm serve?)
- Calendar save functionality 
- Mobile alignment fixing/overlapping, not clean layout

- `announce` (TTS → Bluetooth) is a console.log placeholder only
- No PM2 config / launchd service files yet for crash recovery + boot-start
- Daily reset not yet scheduled automatically (no launchd plist / node-cron wired up — currently must be called manually via `POST /api/routine/daily-reset`)

- CRA proxy port mismatch bug — confirm `.env` has `PORT=5000` or proxy updated to 5001 (guess this is done)
- Frontend: CRA (react-scripts 5) + MUI v5 + react-pro-sidebar v0.7 + react-router-dom v6 + FullCalendar + Nivo/Chart.js (two charting libs installed — Nivo and Chart.js, worth consolidating later).


- Review Sidebar Menu, It doesn't look great my requirement is
- Daily Routines (better and catchy name)
- Routine, Reminders, Goals, Events(Birthdays,Anniversaries), Appointments, Renewals, Payments, Fees, Registrations

- Routine, if scrolled down, then next section should be Reminders and Goals (today's, tomorrow's, this week, this month, next month, this year)
- Reminder can be pulled from Renewals (Driving License, Passports, others), from Appointments (DR, Auto, other )
- Goals (Personal, Professional, Investment, Retimement, Kids Goals)

- better icons, DigiLocker for documents (placeholder)
- Work on resetting routines
- pull / consolidate oncall schedule, hindi calendar, english calendar, school calender
- Vacation Planned/Past including steps to do that? early bird catches the worm

