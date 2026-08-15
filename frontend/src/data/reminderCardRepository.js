import { api } from '../services/api';

// Thin client for the physical reminder table (see backend/routes/reminders.js
// GET /api/reminders/card). NOT the same as the legacy GET /api/reminders
// live-union endpoint — that one backs the old prototype and the nightly sync.

export async function getReminderCard({ from, to, bucket, sources } = {}) {
  const params = new URLSearchParams();
  if (bucket) params.set('bucket', bucket);
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
