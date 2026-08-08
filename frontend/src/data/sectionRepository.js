import { api } from "../services/api";
import sectionFields from "../config/sectionFields";

// Thin client-side counterpart to backend/db/sectionRepository.js.
// The backend decides which table a sectionKey maps to; this just calls
// the generic /api/sections/:sectionKey endpoint and, on read, maps raw
// rows into the { id, primary, secondary, meta } shape DashboardSection
// expects, via each section's mapRowToItem in config/sectionFields.js.

export async function listRecords(sectionKey, { limit } = {}) {
  const config = sectionFields[sectionKey];
  const query = limit ? `?limit=${limit}` : "";
  const { data } = await api.get(`/sections/${sectionKey}${query}`);
  const rows = data || [];
  // `raw` keeps the untransformed row alongside the display shape so an
  // edit form can be prefilled with actual column values (mapRowToItem's
  // { id, primary, secondary, meta } output is lossy by design).
  return rows.map((row) => ({ ...config.mapRowToItem(row), raw: row }));
}

export async function insertRecord(sectionKey, values) {
  const { data } = await api.post(`/sections/${sectionKey}`, values);
  return data;
}

export async function updateRecord(sectionKey, id, values) {
  const { data } = await api.put(`/sections/${sectionKey}/${id}`, values);
  return data;
}

export async function deleteRecord(sectionKey, id) {
  const { data } = await api.delete(`/sections/${sectionKey}/${id}`);
  return data;
}
