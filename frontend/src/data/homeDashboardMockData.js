// Placeholder data for the Home Dashboard.
// Each array will eventually be replaced by data fetched from your
// tables/API — the shape ({ id, primary, secondary, meta }) is designed
// to match what DashboardSection expects, so swapping in real data later
// is just a matter of replacing these arrays with fetched results.

export const routineItems = [
  {
    id: 1,
    primary: "Morning routine",
    secondary: "Wake up, brush teeth, breakfast",
    meta: "7:00 AM",
  },
  {
    id: 2,
    primary: "Evening routine",
    secondary: "Bath, story time, bed",
    meta: "8:00 PM",
  },
];

export const reminderItems = [
  {
    id: 1,
    primary: "Pay electricity bill",
    secondary: "Due soon",
    meta: "Aug 2",
  },
  {
    id: 2,
    primary: "Call plumber",
    secondary: "Follow up on repair",
    meta: "Aug 4",
  },
];

export const goalItems = [
  {
    id: 1,
    primary: "Save $5,000 for vacation",
    secondary: "60% complete",
    meta: "Dec 2026",
  },
];

export const eventItems = [
  { id: 1, primary: "Mom's Birthday", secondary: "Birthday", meta: "Aug 12" },
  {
    id: 2,
    primary: "Wedding Anniversary",
    secondary: "Anniversary",
    meta: "Sep 5",
  },
];

export const appointmentItems = [
  {
    id: 1,
    primary: "Dentist — Dr. Smith",
    secondary: "Emma's checkup",
    meta: "Aug 3, 10:00 AM",
  },
];

export const renewalItems = [
  { id: 1, primary: "Auto Insurance", secondary: "Policy renewal", meta: "Aug 20" },
  { id: 2, primary: "Passport", secondary: "Expires soon", meta: "Nov 2026" },
];

export const billItems = [
  { id: 1, primary: "Electricity Bill", secondary: "ConEd", meta: "$142.50" },
  { id: 2, primary: "Internet Bill", secondary: "Xfinity", meta: "$79.99" },
];

export const extraCurriculumItems = [
  {
    id: 1,
    primary: "Swimming Lessons",
    secondary: "Registration closes soon",
    meta: "Aug 15",
  },
];

// Left empty on purpose so you can see how the empty-state looks —
// fill in or fetch real data whenever you wire this section up.
export const libraryItems = [];