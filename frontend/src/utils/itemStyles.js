// Central place for per-field text styling (color/weight) shown in each
// dashboard item row: primary, secondary, badge, meta.
//
// sectionFields.js stays purely about shaping data (primary/secondary/badge
// text, dateLabelColor, etc.) — it should not need theme/colors. This file
// owns the "how it looks" decisions and is imported only by
// DashboardSection.jsx (or any other renderer), keeping the data layer and
// the presentation layer separate.
//
// Usage:
//   import { getItemStyles } from '../utils/itemStyles';
//   const styles = getItemStyles(item, sectionKey, colors);
//   <Typography color={styles.primaryColor} fontWeight={styles.primaryWeight}>

const fontWeightBySection = {
  events: 600,
  appointments: 600,
  routine: 600,
  todo_list: 400,
};

const secondaryFontWeightBySection = {
  events: 500,
  appointments: 400,
  routine: 400,
  todo_list: 400,
};

const badgeFontWeightBySection = {
  events: 500,
  appointments: 500,
  routine: 400,
  todo_list: 400,
};

// Section-level default colors, used when an item doesn't carry its own
// per-row color (e.g. dateLabelColor from a date-based section).
const secondaryColorBySection = (colors) => ({
  events: colors.grey[300],
  appointments: colors.grey[300],
  routine: colors.grey[400],
  todo_list: colors.grey[400],
});

const badgeColorBySection = (colors) => ({
  events: colors.grey[300],
  appointments: colors.grey[300],
  routine: colors.grey[400],
  todo_list: colors.grey[400],
});

// Shared urgency-color logic, used for meta (and available for badge/
// secondary too, since any of the three could carry a date keyword
// depending on the section's mapRowToItem).
const getUrgencyColor = (item, colors) => {
  if (item.dateLabelColor) return item.dateLabelColor; // already set upstream

  if (!item.meta) return colors.greenAccent[500]; // fallback, no date info

  if (item.meta === 'Today') return '#4caf50';
  if (item.meta === 'Tomorrow') return '#42a5f5';
  if (item.meta === 'Past') return '#ef5350';

  // "N days to go" — extract the number and scale urgency
  const match = item.meta.match(/^(\d+) days? to go$/);
  if (match) {
    const days = parseInt(match[1], 10);
    if (days <= 3) return '#ff9800'; // orange — coming up soon
    if (days <= 7) return '#42a5f5'; // blue — this week
    return colors.grey[300]; // default — further out
  }

  return colors.greenAccent[500];
};

// item: the mapped row ({ primary, secondary, badge, meta, dateLabelColor, ... })
// sectionKey: e.g. 'events', 'appointments', 'todo_list'
// colors: the `tokens(theme.palette.mode)` object from the component
export const getItemStyles = (item, sectionKey, colors) => ({
  primaryColor: colors.grey[100],
  primaryWeight: fontWeightBySection[sectionKey] || 600,

  secondaryColor:
    item.dateLabelColor || secondaryColorBySection(colors)[sectionKey] || colors.grey[300],
  secondaryWeight: secondaryFontWeightBySection[sectionKey] || 400,

  badgeColor:
    item.dateLabelColor || badgeColorBySection(colors)[sectionKey] || colors.grey[300],
  badgeWeight: badgeFontWeightBySection[sectionKey] || 400,

  metaColor: getUrgencyColor(item, colors),
});