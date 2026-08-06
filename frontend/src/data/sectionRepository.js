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
  return rows.map(config.mapRowToItem);
}

export async function insertRecord(sectionKey, values) {
  const { data } = await api.post(`/sections/${sectionKey}`, values);
  return data;
}
