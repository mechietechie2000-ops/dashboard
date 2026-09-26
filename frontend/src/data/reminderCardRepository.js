import { api } from '../services/api';

// Thin client for the physical reminder table (see backend/routes/reminders.js
// GET /api/reminders/card). NOT the same as the legacy GET /api/reminders
// live-union endpoint — that one backs the old prototype and the nightly sync.

export async function getReminderCard({ from, to, sources } = {}) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (sources && sources.length) params.set('sources', sources.join(','));
  const qs = params.toString();
  const { data } = await api.get(`/reminders/card${qs ? `?${qs}` : ''}`);
  return data || [];
}

export async function completeReminder(sourceType, sourceId) {
  const { data } = await api.patch(`/reminders/${sourceType}/${sourceId}/complete`);
  return data;
}

// Forces the physical `reminder` table to resync from every source table
// (see remindersRepository.syncAllReminders) instead of waiting for the
// nightly job — used by the reminder card's manual refresh button so a
// sync-on-write gap can be caught same-day instead of a day later.
export async function syncReminders() {
  const { data } = await api.post('/reminders/sync');
  return data; // { synced, orphansRemoved }
}
