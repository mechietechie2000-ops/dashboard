// Groups a flat reminders list (from GET /api/reminders) into the named
// buckets a UI would show: Today, Tomorrow, This Week, Next Week,
// This Month, Next Month, Later. Pure function — no fetch, no state —
// so it's easy to unit test and easy to reuse (Home tile today, a full
// Reminders page later, etc.) without duplicating this logic.
//
// A reminder can appear in exactly one bucket: the earliest bucket its
// [window_start, due_date] range overlaps, working from Today outward.
// That's the "already nagging you" behavior — a renewal with a 30-day
// lead time that opened 25 days ago shows up under Today, not buried
// under some future bucket matching its actual due_date.

const toDate = (isoString) => new Date(`${isoString}T00:00:00`);
const addDays = (date, n) => new Date(date.getTime() + n * 24 * 60 * 60 * 1000);
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

function endOfWeek(date) {
  // Week ends Saturday, matching a Sun–Sat week. Adjust here if your
  // calendar elsewhere assumes Mon–Sun.
  const day = date.getDay(); // 0 = Sunday
  return addDays(date, 6 - day);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function bucketReminders(reminders, today = new Date()) {
  const day0 = startOfDay(today);
  const day1 = addDays(day0, 1); // tomorrow
  const weekEnd = endOfWeek(day0);
  const nextWeekEnd = addDays(weekEnd, 7);
  const monthEnd = endOfMonth(day0);
  const nextMonthEnd = endOfMonth(addDays(monthEnd, 1));
  const yearEnd = new Date(day0.getFullYear(), 11, 31);

  const buckets = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    nextWeek: [],
    thisMonth: [],
    nextMonth: [],
    thisYear: [],
    later: [],
  };

  // [label, rangeEnd] in order — first range whose end is >= the
  // reminder's earliest relevant day wins.
  const ranges = [
    ["today", day0],
    ["tomorrow", day1],
    ["thisWeek", weekEnd],
    ["nextWeek", nextWeekEnd],
    ["thisMonth", monthEnd],
    ["nextMonth", nextMonthEnd],
    ["thisYear", yearEnd],
  ];

  for (const reminder of reminders) {
    const windowStart = toDate(reminder.window_start);
    const dueDate = toDate(reminder.due_date);
    // Already-open items (window_start in the past) should surface under
    // Today, not their literal window_start date.
    const earliestRelevantDay = windowStart < day0 ? day0 : windowStart;

    const match = ranges.find(([, rangeEnd]) => earliestRelevantDay <= rangeEnd);
    const bucketKey = match ? match[0] : "later";
    buckets[bucketKey].push(reminder);

    // Suppress unused var lint noise; dueDate reserved for future
    // "overdue" styling without changing this function's signature.
    void dueDate;
  }

  return buckets;
}

export const BUCKET_LABELS = {
  today: "Today",
  tomorrow: "Tomorrow",
  thisWeek: "This Week",
  nextWeek: "Next Week",
  thisMonth: "This Month",
  nextMonth: "Next Month",
  thisYear: "This Year",
  later: "Later",
};
