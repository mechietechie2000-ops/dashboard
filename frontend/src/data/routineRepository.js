import { api } from "../services/api";

// Manual trigger for the dashboard "Reset" button. Requires the user to be
// logged in (normal JWT cookie auth) — this is separate from the
// launchd/node-cron paths, which use their own internal shared-secret auth
// (see backend/middleware/internalAuth.js) since they have no login session.
export async function runDailyResetManual() {
  const { data } = await api.post("/routine/daily-reset/manual");
  return data; // { skipped: true } | { skipped: false, tasksLoaded, unmarkedLogged }
}
