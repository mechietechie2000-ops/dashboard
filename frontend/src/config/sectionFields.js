import QueryBuilderIcon from "@mui/icons-material/QueryBuilder";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import SportsHandballRoundedIcon from "@mui/icons-material/SportsHandballRounded";
import LocalLibraryOutlinedIcon from "@mui/icons-material/LocalLibraryOutlined";

const fmtDate = (value) => {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const fmtDateTime = (value) => {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

// sectionKey -> UI config. `fields` drives the generic form (SectionForm);
// `mapRowToItem` turns a raw DB row (from listRecords) into the
// { id, primary, secondary, meta } shape DashboardSection expects.
const sectionFields = {
  routine: {
    tableName: "daily_routine",
    label: "Routine",
    icon: <QueryBuilderIcon />,
    viewAllLink: "/routine",
    emptyMessage: "No routine items today",
    fields: [
      { name: "task_name", label: "Task", type: "text", required: true },
      { name: "person", label: "Person", type: "text", required: true },
      {
        name: "frequency",
        label: "Frequency",
        type: "select",
        required: true,
        options: ["daily", "weekly"],
      },
      { name: "day_of_week", label: "Day of week", type: "text", required: false },
      { name: "task_time", label: "Time (HH:MM)", type: "text", required: true },
    ],
    mapRowToItem: (row) => ({
      id: row.routine_id,
      primary: row.task_name,
      secondary: row.person,
      meta: row.task_time,
    }),
  },

  reminders: {
    tableName: "reminders",
    label: "Reminders",
    icon: <NotificationsActiveOutlinedIcon />,
    emptyMessage: "No reminders",
    fields: [
      { name: "title", label: "Reminder", type: "text", required: true },
      { name: "notes", label: "Notes", type: "textarea", required: false },
      { name: "due_date", label: "Due date", type: "date", required: true },
      {
        name: "priority",
        label: "Priority",
        type: "select",
        required: false,
        options: ["low", "medium", "high"],
      },
      {
        name: "family_member_id",
        label: "For",
        type: "asyncSelect",
        source: "familyMembers",
        required: false,
      },
      { name: "is_completed", label: "Completed", type: "checkbox", required: false },
    ],
    mapRowToItem: (row) => ({
      id: row.reminder_id,
      primary: row.title,
      secondary: row.note,
      meta: fmtDate(row.due_date),
    }),
  },

  goals: {
    tableName: "goals",
    label: "Goals",
    icon: <EmojiEventsOutlinedIcon />,
    emptyMessage: "No goals set yet",
    fields: [
      { name: "title", label: "Goal", type: "text", required: true },
      { name: "description", label: "Description", type: "text", required: false },
      { name: "target_date", label: "Target date", type: "date", required: false },
      { name: "target_value", label: "Current amount", type: "number", required: false },
    ],
    mapRowToItem: (row) => ({
      id: row.goal_id,
      primary: row.title,
      secondary: row.progress_note,
      meta: row.target_date
        ? new Date(row.target_date).toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          })
        : undefined,
    }),
  },

  events: {
    tableName: "events",
    label: "Events (Birthdays, Anniversaries)",
    icon: <CakeOutlinedIcon />,
    viewAllLink: "/calendar",
    emptyMessage: "No upcoming birthdays or anniversaries",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      {
        name: "event_type",
        label: "Type",
        type: "select",
        required: true,
        options: ["birthday", "anniversary", "other"],
      },
      { name: "event_date", label: "Date", type: "date", required: true },
    ],
    mapRowToItem: (row) => ({
      id: row.event_id,
      primary: row.title,
      secondary: row.event_type
        ? row.event_type[0].toUpperCase() + row.event_type.slice(1)
        : undefined,
      meta: fmtDate(row.event_date),
    }),
  },

  appointments: {
    tableName: "appointments",
    label: "Appointments",
    icon: <LocalHospitalIcon />,
    viewAllLink: "/medical",
    emptyMessage: "No upcoming appointments",
    fields: [
      {
        name: "category",
        label: "Category",
        type: "select",
        required: false,
        options: ["Doctor", "Auto", "Other"],
      },
      { name: "patient_name", label: "Patient", type: "text", required: true },
      { name: "doctor_name", label: "Doctor", type: "text", required: true },
      { name: "appointment_date", label: "Date", type: "date", required: true },
      { name: "purpose", label: "Purpose", type: "text", required: false },
    ],
    mapRowToItem: (row) => ({
      id: row.appointment_id,
      primary: `${row.doctor_name}${row.doctor_special ? ` — ${row.doctor_special}` : ""}`,
      secondary: row.purpose || `${row.patient_name}'s appointment`,
      meta: fmtDate(row.appointment_date),
    }),
  },

  renewals: {
    tableName: "renewals",
    label: "Renewals",
    icon: <AutorenewOutlinedIcon />,
    emptyMessage: "Nothing due for renewal",
    fields: [
      {
        name: "category",
        label: "Category",
        type: "select",
        required: true,
        options: [
          { value: "insurance", label: "Insurance" },
          { value: "passport", label: "Passport" },
          { value: "license", label: "License" },
          { value: "subscription", label: "Subscription" },
          { value: "parking", label: "Parking Garage" },
          { value: "other", label: "Other" },
        ],
      },
      {
        name: "subcategory",
        label: "Subcategory",
        type: "select",
        required: false,
        dependsOn: { field: "category", in: ["insurance", "passport", "subscription"] },
        options: (values) => {
          if (values.category === "insurance") {
            return ["Auto", "Home", "Medical", "Dental", "Vision"];
          }
          if (values.category === "passport") {
            return ["OCI", "Visa"];
          }
          if (values.category === "subscription") {
            return ["Costco", "Amazon", "Sam's Club", "BJ's", "Walmart", "Cable", "Other"];
          }
          return [];
        },
      },
      { name: "title", label: "Item", type: "text", required: true },
      {
        name: "family_member_id",
        label: "For",
        type: "asyncSelect",
        source: "familyMembers",
        required: false,
      },
      { name: "provider_name", label: "Provider", type: "text", required: false },
      { name: "start_date", label: "Start date", type: "date", required: false },
      { name: "expiry_date", label: "Expiration date", type: "date", required: true },
      { name: "amount", label: "Amount", type: "number", required: false },
      { name: "auto_renew", label: "Auto-renews", type: "checkbox", required: false },
      {
        name: "lead_time_days",
        label: "Remind me this many days before (e.g. insurance ~30, license ~90, passport ~180)",
        type: "number",
        required: false,
      },
      {
        name: "address",
        label: "Address",
        type: "text",
        required: false,
        dependsOn: { field: "category", in: ["passport", "license"] },
      },

      // Category-specific fields — collapse into the `attributes` JSON
      // column instead of their own DB columns, so adding a new one later
      // never requires a schema change.
      {
        name: "license_plate",
        label: "License Plate",
        type: "text",
        required: false,
        packInto: "attributes",
        dependsOn: { field: "category", value: "insurance" },
      },
      {
        name: "policy_number",
        label: "Policy Number",
        type: "text",
        required: false,
        packInto: "attributes",
        dependsOn: { field: "category", value: "insurance" },
      },
      {
        name: "passport_number",
        label: "Passport Number",
        type: "text",
        required: false,
        packInto: "attributes",
        dependsOn: { field: "category", value: "passport" },
      },
      {
        name: "license_number",
        label: "License Number",
        type: "text",
        required: false,
        packInto: "attributes",
        dependsOn: { field: "category", value: "license" },
      },
      {
        name: "state",
        label: "State",
        type: "text",
        required: false,
        packInto: "attributes",
        dependsOn: { field: "category", value: "license" },
      },
      {
        name: "membership_number",
        label: "Membership Number",
        type: "text",
        required: false,
        packInto: "attributes",
        dependsOn: { field: "category", value: "subscription" },
      },
      {
        name: "spot_number",
        label: "Spot / Unit Number",
        type: "text",
        required: false,
        packInto: "attributes",
        dependsOn: { field: "category", value: "parking" },
      },

      { name: "notes", label: "Notes", type: "textarea", required: false },
    ],
    mapRowToItem: (row) => ({
      id: row.renewal_id,
      primary: row.title,
      secondary: row.subcategory ? `${row.category} — ${row.subcategory}` : row.category,
      meta: fmtDate(row.expiry_date),
    }),
  },

  bills: {
    tableName: "bills",
    label: "Upcoming Payments / Bills",
    icon: <PaymentsOutlinedIcon />,
    emptyMessage: "No upcoming bills",
    fields: [
      { name: "title", label: "Bill", type: "text", required: true },
      { name: "provider", label: "Provider", type: "text", required: false },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "due_date", label: "Due date", type: "date", required: true },
    ],
    mapRowToItem: (row) => ({
      id: row.bill_id,
      primary: row.title,
      secondary: row.provider,
      meta: row.amount != null ? `$${Number(row.amount).toFixed(2)}` : undefined,
    }),
  },

  extracurricular: {
    tableName: "activity",
    label: "Extra Curriculum Registrations",
    icon: <SportsHandballRoundedIcon />,
    viewAllLink: "/sports",
    emptyMessage: "No open registrations",
    fields: [
      { name: "ACTIVITY_NAME", label: "Activity", type: "text", required: true },
      { name: "ACTIVITY_FOR", label: "For", type: "text", required: true },
      { name: "START_DATE", label: "Start date", type: "date", required: true },
      { name: "FACILITY_NAME", label: "Facility", type: "text", required: false },
    ],
    mapRowToItem: (row) => ({
      id: row.ACTIVITY_CODE,
      primary: row.ACTIVITY_NAME,
      secondary: row.ACTIVITY_FOR,
      meta: fmtDate(row.START_DATE),
    }),
  },

  library: {
    tableName: "library_loans",
    label: "Library Return Day",
    icon: <LocalLibraryOutlinedIcon />,
    emptyMessage: "No books currently borrowed",
    fields: [
      { name: "book_title", label: "Book title", type: "text", required: true },
      { name: "borrower", label: "Borrower", type: "text", required: false },
      { name: "due_date", label: "Due date", type: "date", required: true },
    ],
    mapRowToItem: (row) => ({
      id: row.loan_id,
      primary: row.book_title,
      secondary: row.borrower,
      meta: fmtDate(row.due_date),
    }),
  },
};

export default sectionFields;
