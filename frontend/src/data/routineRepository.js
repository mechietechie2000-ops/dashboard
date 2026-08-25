import { api } from "../services/api";

// Manual trigger for the dashboard "Reset" button. Requires the user to be
// logged in (normal JWT cookie auth) — this is separate from the
// launchd/node-cron paths, which use their own internal shared-secret auth
// (see backend/middleware/internalAuth.js) since they have no login session.
export async function runDailyResetManual() {
  const { data } = await api.post("/routine/daily-reset/manual");
  return data; // { skipped: true } | { skipped: false, tasksLoaded, unmarkedLogged }
}

// Newly added functions to bring the daily_routine_temp to UI card

export async function listTodayRoutineTasks() {
  const { data } = await api.get("/routine/today");
  return data;
}

export async function markRoutineDone(tempId) {
  const { data } = await api.post(`/routine/today/${tempId}/done`);
  return data;
}

export async function markRoutineSkipped(tempId, reason) {
  const { data } = await api.post(`/routine/today/${tempId}/skip`, { reason });
  return data;
}

export async function toggleRoutineMute(tempId) {
  const { data } = await api.post(`/routine/today/${tempId}/mute`);
  return data;
}