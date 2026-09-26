import QueryBuilderIcon from '@mui/icons-material/QueryBuilder';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AutorenewOutlinedIcon from '@mui/icons-material/AutorenewOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import SportsHandballRoundedIcon from '@mui/icons-material/SportsHandballRounded';
import LocalLibraryOutlinedIcon from '@mui/icons-material/LocalLibraryOutlined';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// Consolidated status set shared by sections that support swipe-to-status
// (see DashboardSection's SectionItemRow). colorKey maps to a `colors`
// palette key resolved at render time (component has the theme, this file
// doesn't).
export const STATUS_OPTIONS = [
  {
    value: 'done',
    label: 'Done',
    icon: CheckCircleOutlineIcon,
    colorKey: 'greenAccent',
    color: '#1b5e20',
  },
  {
    value: 'not_started',
    label: 'Not Started',
    icon: RadioButtonUncheckedIcon,
    colorKey: 'grey',
    color: '#424242',
  },
  {
    value: 'backlog',
    label: 'Backlog',
    icon: InboxOutlinedIcon,
    colorKey: 'grey',
    color: '#424242',
  },
  {
    value: 'in_progress',
    label: 'WIP',
    icon: AutorenewOutlinedIcon,
    colorKey: 'blueAccent',
    color: '#0d47a1',
  },
  { value: 'blocked', label: 'Blocked', icon: BlockIcon, colorKey: 'redAccent', color: '#7f0000' },
];

export const ROUTINE_STATUS_OPTIONS = [
  {
    value: 'done',
    label: 'Done',
    icon: CheckCircleOutlineIcon,
    colorKey: 'greenAccent',
    color: '#1b5e20',
  },
  { value: 'skipped', label: 'Skip', icon: BlockIcon, colorKey: 'redAccent', color: '#7f0000' },
];

// Matches the appointments table's `status` column exactly:
// status TEXT NOT NULL DEFAULT 'scheduled' -- scheduled | completed | cancelled
// `scheduled` is included (even though it's the default) so the swipe panel
// can undo an accidental completed/cancelled tap. availableStatuses always
// filters out whatever item.status currently is, so it won't clutter the
// panel for a normal scheduled appointment.
export const APPOINTMENT_STATUS_OPTIONS = [
  {
    value: 'completed',
    label: 'Done',
    icon: CheckCircleOutlineIcon,
    colorKey: 'greenAccent',
    color: '#1b5e20',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    icon: BlockIcon,
    colorKey: 'redAccent',
    color: '#7f0000',
  },
  {
    value: 'scheduled',
    label: 'Scheduled',
    icon: RadioButtonUncheckedIcon,
    colorKey: 'grey',
    color: '#424242',
  },
];

const fmtDate = (value) => {
  if (!value) return undefined;
  // const d = new Date(value);
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const fmtDateTime = (value) => {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const fmtDateOnly = (value) => {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
/* 
const fmtTime12 = (value) => {
  if (!value) return undefined;

  // Handle time-only strings (e.g., "14:30" or "14:30:00")
  if (typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const [hours, minutes] = value.split(':');
    const d = new Date();
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Handle standard Date objects or ISO strings
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

 */

const fmtTime12 = (value) => {
  if (!value) return undefined;

  // Handle time-only strings (e.g., "14:30" or "14:30:00")
  if (typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    const [hours, minutes] = value.split(':');
    const d = new Date();
    d.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return d
      .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
      .replace(':00 ', ' ');
  }

  // Handle standard Date objects or ISO strings
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return d
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(':00 ', ' ');
};
const currentYear = new Date().getFullYear();

// This file has no access to the theme (colors are resolved at render time
// in components), so hardcode the three accent colors here directly rather
// than pulling from `tokens`/`colors`.
const getDateKeyword = (dateStr) => {
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);

  if (diffDays === 0) return { label: 'Today', color: '#4caf50' };
  if (diffDays === 1) return { label: 'Tomorrow', color: '#42a5f5' };
  if (diffDays > 1) return { label: `${diffDays} days to go`, color: '#4caf50' };
  if (diffDays < 0) return { label: 'Past', color: '#ef5350' };
  return null;
};

const getRecurringDateKeyword = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();

  const thisYear = new Date(year, target.getMonth(), target.getDate());
  const diffDaysThisYear = Math.round((thisYear - today) / 86400000);
  const nextYear = new Date(year + 1, target.getMonth(), target.getDate());
  const diffDays =
    diffDaysThisYear < 0 ? Math.round((nextYear - today) / 86400000) : diffDaysThisYear;

  if (diffDaysThisYear === 0) return { label: 'Today', color: '#4caf50' };
  if (diffDaysThisYear === 1) return { label: 'Tomorrow', color: '#42a5f5' };
  if (diffDaysThisYear < 0 && diffDaysThisYear >= -2) return { label: 'Past', color: '#ef5350' };
  return { label: `${diffDays} days to go`, color: '#4caf50' };
};

// sectionKey -> UI config. `fields` drives the generic form (SectionForm);
// `mapRowToItem` turns a raw DB row (from listRecords) into the
// { id, primary, secondary, meta } shape DashboardSection expects.
const sectionFields = {
  routine: {
    tableName: 'daily_routine',
    label: 'Routine',
    icon: <QueryBuilderIcon />,
    viewAllLink: '/routine',
    emptyMessage: 'No routine items today',
    statusOptions: ROUTINE_STATUS_OPTIONS,
    fields: [
      { name: 'title', label: 'Task', type: 'text', required: true },
      {
        name: 'family_member_id',
        label: 'For',
        type: 'asyncSelect',
        source: 'familyMembers',
        required: false,
      },
      {
        name: 'frequency',
        label: 'Frequency',
        type: 'select',
        required: true,
        options: [
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
        ],
      },
      {
        name: 'day_of_week',
        label: 'Day of week',
        type: 'select',
        required: false,
        options: [
          { value: 'Monday', label: 'Monday' },
          { value: 'Tuesday', label: 'Tuesday' },
          { value: 'Wednesday', label: 'Wednesday' },
          { value: 'Thursday', label: 'Thursday' },
          { value: 'Friday', label: 'Friday' },
          { value: 'Saturday', label: 'Saturday' },
          { value: 'Sunday', label: 'Sunday' },
        ],
      },
      { name: 'scheduled_time', label: 'Time (HH:MM)', type: 'time', required: true },
      { name: 'mute', label: 'Mute', type: 'checkbox', required: false },
      { name: 'announce', label: 'Announce', type: 'checkbox', required: false },
      /* {
        name: 'announce',
        label: 'Notification Setting',
        type: 'radio',
        required: false,
        options: [
          { label: 'Mute', value: 1 },
          { label: 'Announce', value: 1 }
        ]
      }, */
      { name: 'description', label: 'Description', type: 'text', required: false },
    ],
    mapRowToItem: (row) => ({
      id: row.id,
      primary: [fmtTime12(row.scheduled_time), '', row.title].filter(Boolean).join(' • '),
      secondary: row.family_member_name,
      //meta: row.scheduled_time,
      status: row.status,
    }),
  },

  goals: {
    tableName: 'goals',
    label: 'Goals',
    icon: <EmojiEventsOutlinedIcon />,
    emptyMessage: 'No goals set yet',
    fields: [
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        options: [
          { value: 'financial', label: 'Financial' },
          { value: 'retirement', label: 'Retirement' },
          { value: 'health', label: 'Health' },
          { value: 'personal', label: 'Personal' },
          { value: 'professional', label: 'Professional' },
          { value: 'home', label: 'Home' },
          { value: 'education', label: 'Education' },
          { value: 'other', label: 'Other' },
        ],
      },
      { name: 'title', label: 'Goal', type: 'text', required: true },
      {
        name: 'family_member_id',
        label: 'For',
        type: 'asyncSelect',
        source: 'familyMembers',
        required: false,
      },
      {
        name: 'goal_type',
        label: 'Vision',
        type: 'select',
        required: true,
        options: [
          { value: 'short_term', label: 'Short Term' },
          { value: 'long_term', label: 'Long Term' },
        ],
      },
      {
        name: 'target_year',
        label: 'Target Year',
        type: 'select',
        required: true,
        options: Array.from({ length: 10 }, (_, index) => {
          const year = currentYear + index;
          return { value: year, label: String(year) };
        }),
      },
      {
        name: 'target_quarter',
        label: 'Target Quarter',
        type: 'select',
        required: false,
        options: [
          { value: 'Q1', label: 'Q1' },
          { value: 'Q2', label: 'Q2' },
          { value: 'Q3', label: 'Q3' },
          { value: 'Q4', label: 'Q4' },
        ],
      },
    ],
    mapRowToItem: (row) => ({
      id: row.id,
      primary: row.title,
      secondary: row.category[0].toUpperCase() + row.category.slice(1),
      meta: [
        row.goal_type === 'short_term' ? 'Short Term' : 'Long Term',
        row.target_quarter && row.target_year
          ? `${row.target_quarter} ${row.target_year}`
          : row.target_year,
      ]
        .filter(Boolean)
        .join(' • '),
    }),
  },

  events: {
    tableName: 'events',
    label: 'Events (Birthdays, Anniversaries)',
    icon: <CakeOutlinedIcon />,
    viewAllLink: '/section/events', // check if the route exist yet
    emptyMessage: 'No upcoming birthdays or anniversaries',
    fields: [
      { name: 'person_name', label: 'Person Name', type: 'text', required: true },
      {
        name: 'event_type',
        label: 'Type',
        type: 'select',
        required: true,
        options: [
          { value: 'birthday', label: 'Birthday' },
          { value: 'wedding', label: 'Wedding Anniversary' },
          { value: 'work', label: 'Work Anniversary' },
          { value: 'other', label: 'Other' },
        ],
      },
      { name: 'event_date', label: 'Date', type: 'date', required: true },
    ],
    /*     mapRowToItem: (row) => ({
      id: row.id,
      primary: row.person_name,
      secondary: row.event_type
        ? row.event_type[0].toUpperCase() + row.event_type.slice(1)
        : undefined,
      meta: fmtDate(row.event_date),
    }), */
    mapRowToItem: (row) => {
      // const dateKeyword = getDateKeyword(row.event_date);
      const dateKeyword = getRecurringDateKeyword(row.event_date);
      return {
        id: row.id,
        // primary: row.person_name,
        // primary: `${fmtDate(row.event_date)}   -  ${row.person_name}`,
        // primary: [fmtDate(row.event_date), row.person_name].filter(Boolean).join('    •    '),
        primary: `${fmtDate(row.event_date)}${
          row.person_name
            ? `  •  ${row.person_name}'s ${row.event_type || 'other'}`
            : '  •  some event'
        }`,
        meta: dateKeyword?.label,
        dateLabelColor: dateKeyword?.color,
        /*      meta: row.event_type
        ? row.event_type[0].toUpperCase() + row.event_type.slice(1)
        : undefined,
      // meta: fmtDate(row.event_date),
      status: 'N/A', */
      };
    },
  },

  appointments: {
    tableName: 'appointments',
    label: 'Appointments',
    icon: <LocalHospitalIcon />,
    viewAllLink: '/section/appointments',
    emptyMessage: 'No upcoming appointments',
    statusOptions: APPOINTMENT_STATUS_OPTIONS,
    // Upcoming 180 days, scheduled only by default; completed/cancelled
    // hidden unless explicitly selected in the filter sheet. NOTE: the
    // hiddenStatuses key is only honored once applyDashboardFilters in
    // index.jsx is generalized past its current hardcoded backlog/done
    // check — flagging so this doesn't look "wired" before that lands.
    dashboardFilter: {
      dateField: 'appointment_datetime',
      defaultRangeDays: 180,
      hiddenStatuses: ['completed', 'cancelled'],
    },
    fields: [
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: false,
        options: ['Doctor', 'Auto', 'Other'],
      },
      {
        name: 'family_member_id',
        label: 'For',
        type: 'asyncSelect',
        source: 'familyMembers',
        required: true,
      },
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'provider_name', label: 'Provider Name', type: 'text', required: true },
      {
        name: 'appointment_datetime',
        label: 'Appointment Date & Time',
        type: 'datetime',
        required: true,
      },
    ],
    mapRowToItem: (row) => {
      const dateKeyword = getDateKeyword(row.appointment_datetime);
      const datePart = fmtDateOnly(row.appointment_datetime);
      const timePart = fmtTime12(row.appointment_datetime);
      const label = row.category === 'Doctor' ? `Dr. Appt. ${row.family_member_name}` : row.title;

      return {
        id: row.id,
        primary: `${datePart} - ${label} @${timePart}`,
        // secondary: `${row.family_member_name}'s appointment`,
        badge: dateKeyword?.label,
        dateLabelColor: dateKeyword?.color,
        status: row.status,
      };
    },
  },

  /**
    mapRowToItem: (row) => {
      const dateKeyword = getDateKeyword(row.event_date);
      return {
      id: row.id,
      primary: `${fmtDate(row.event_date)}${
        row.person_name
          ? `  •  ${row.person_name}'s ${row.event_type || 'other'}`
          : '  •  some event'
      }`,
      meta: dateKeyword?.label,
      dateLabelColor: dateKeyword?.color,
   * 
   */
  renewals: {
    tableName: 'renewals',
    label: 'Renewals',
    icon: <AutorenewOutlinedIcon />,
    viewAllLink: '/section/renewals', // check if the route exist yet
    emptyMessage: 'Nothing due for renewal',
    fields: [
      {
        name: 'renewal_type',
        label: 'Type',
        type: 'select',
        required: true,
        options: [
          { value: 'subscription', label: 'Subscription' },
          { value: 'insurance', label: 'Insurance' },
          { value: 'document', label: 'Document' },
          { value: 'registration', label: 'Registration' },
          { value: 'inspection', label: 'Inspection' },
          { value: 'maintenance', label: 'Maintenance' },
          { value: 'membership', label: 'Membership' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        options: (values) => {
          switch (values.renewal_type) {
            case 'subscription':
              return [
                { value: 'youtube', label: 'Youtube' },
                { value: 'cable', label: 'Cable' },
                { value: 'others', label: 'Others' },
              ];
            case 'insurance':
              return [
                { value: 'auto', label: 'Auto' },
                { value: 'home', label: 'Home' },
                { value: 'life', label: 'Life' },
                { value: 'travel', label: 'Travel' },
                { value: 'appliance', label: 'Appliance' },
                { value: 'others', label: 'Others' },
              ];
            case 'document':
              return [
                { value: 'personal', label: 'Personal' },
                { value: 'professional', label: 'Professional' },
                { value: 'educational', label: 'Educational' },
                { value: 'travel', label: 'Travel' },
                { value: 'appliance', label: 'Appliance' },
                { value: 'others', label: 'Others' },
              ];
            case 'registration':
              return [
                { value: 'auto', label: 'Auto' },
                { value: 'home', label: 'Home' },
                { value: 'life', label: 'Life' },
                { value: 'travel', label: 'Travel' },
                { value: 'appliance', label: 'Appliance' },
                { value: 'others', label: 'Others' },
              ];
            case 'inspection':
              return [
                { value: 'auto', label: 'Auto' },
                { value: 'home', label: 'Home' },
                { value: 'others', label: 'Others' },
              ];
            case 'maintenance':
              return [
                { value: 'auto', label: 'Auto' },
                { value: 'home', label: 'Home' },
                { value: 'appliance', label: 'Appliance' },
                { value: 'others', label: 'Others' },
              ];
            case 'membership':
              return [
                { value: 'costco', label: 'Costco' },
                { value: 'amazon', label: 'Amazon' },
                { value: 'sixflags', label: 'SixFlags' },
                { value: 'education', label: 'Education' },
                { value: 'others', label: 'Others' },
              ];
            case 'others':
              return [
                { value: 'auto', label: 'Auto' },
                { value: 'home', label: 'Home' },
                { value: 'life', label: 'Life' },
                { value: 'travel', label: 'Travel' },
                { value: 'appliance', label: 'Appliance' },
                { value: 'others', label: 'Others' },
              ];
            default:
              return [];
          }
        },
        /*         options: [
          { value: 'Vehicle', label: 'Vehicle' },
          { value: 'personal', label: 'Personal' },
          { value: 'professional', label: 'Professional' },
          { value: 'extra_curriculam', label: 'Extra Curriculam' },
        ], */
      },
      {
        name: 'subcategory',
        label: 'Subcategory',
        type: 'select',
        required: false,
        options: (values) => {
          switch (values.category) {
            case 'personal':
              return [
                { value: 'passport', label: 'Passport' },
                { value: 'oci', label: 'OCI' },
                { value: 'driver_license', label: 'Driver License' },
                { value: 'h1b', label: 'H1' },
                { value: 'h4', label: 'H4' },
              ];
            case 'extra_curriculam':
              return [
                { value: 'swimming', label: 'Swimming' },
                { value: 'karate', label: 'Karate' },
                { value: 'gymnastics', label: 'Gymnastics' },
                { value: 'music', label: 'Music' },
              ];
            case 'auto':
              return [
                { value: 'honda_accord', label: 'Honda Accord' },
                { value: 'kia_carnival', label: 'Kia Carnival' },
              ];
            case 'registration':
              return [
                { value: 'car_registration', label: 'Car Registration' },
                { value: 'auto_insurance', label: 'Auto Insurance' },
              ];
            case 'home':
              return [
                { value: 'fire_alarm', label: 'Fire Alarm' },
                { value: 'dryer', label: 'Dryer' },
              ];
            default:
              return [];
          }
        },
      },
      {
        name: 'title',
        label: 'Item',
        type: 'text',
        required: false,
      },
      {
        name: 'family_member_id',
        label: 'For',
        type: 'asyncSelect',
        source: 'familyMembers',
        required: false,
      },
      {
        name: 'provider_name',
        label: 'Provider',
        type: 'text',
        required: false,
      },
      {
        name: 'start_date',
        label: 'Start Date',
        type: 'date',
        required: false,
      },
      {
        name: 'expiry_date',
        label: 'Expiration Date',
        type: 'date',
        required: true,
      },
      {
        name: 'renewal_frequency',
        label: 'Frequency',
        type: 'select',
        required: false,
        options: [
          { value: 'monthly', label: 'Monthly' },
          { value: 'quarterly', label: 'Quarterly' },
          { value: '6_months', label: 'Every 6 Months' },
          { value: 'yearly', label: 'Yearly' },
          { value: '2_years', label: 'Every 2 Years' },
          { value: '5_years', label: 'Every 5 Years' },
          { value: '10_years', label: 'Every 10 Years' },
          { value: 'one_time', label: 'One Time' },
          { value: 'custom', label: 'Custom' },
        ],
      },
      {
        name: 'amount',
        label: 'Amount',
        type: 'number',
        required: false,
      },
      {
        name: 'auto_renew',
        label: 'Auto-Renews',
        type: 'checkbox',
        required: false,
      },
      {
        name: 'reminder_days_before',
        label: 'Remind Me Before (Days)',
        type: 'number',
        required: false,
      },
      {
        name: 'notes',
        label: 'Notes',
        type: 'textarea',
        required: false,
      },
    ],
    /*     mapRowToItem: (row) => ({
      id: row.id,
      // primary: `${row.category} ${row.renewal_type}`,
      primary: `${row.title}`,
      secondary: row.subcategory,
      //secondary: [row.category, row.subcategory, row.renewal_type].filter(Boolean).join(' — '),
      meta: row.expiry_date ? fmtDate(row.expiry_date) : undefined, */

    mapRowToItem: (row) => {
      const dateKeyword = getDateKeyword(row.expiry_date);
      return {
        id: row.id,
        primary: `${fmtDate(row.expiry_date)}  •  ${row.title}`,
        meta: dateKeyword?.label,
        dateLabelColor: dateKeyword?.color,
      };
    },
  },

  bills: {
    tableName: 'bills',
    label: 'Upcoming Payments / Bills',
    icon: <PaymentsOutlinedIcon />,
    emptyMessage: 'No upcoming bills',
    fields: [
      { name: 'title', label: 'Bill', type: 'text', required: true },
      { name: 'provider', label: 'Provider', type: 'text', required: false },
      { name: 'amount', label: 'Amount', type: 'number', required: true },
      { name: 'due_date', label: 'Due date', type: 'date', required: true },
    ],
    mapRowToItem: (row) => ({
      id: row.bill_id,
      primary: row.title,
      secondary: row.provider,
      meta: row.amount != null ? `$${Number(row.amount).toFixed(2)}` : undefined,
    }),
  },

  extracurricular: {
    tableName: 'activity',
    label: 'Extra Curriculum Registrations',
    icon: <SportsHandballRoundedIcon />,
    viewAllLink: '/sports',
    emptyMessage: 'No open registrations',
    fields: [
      { name: 'ACTIVITY_NAME', label: 'Activity', type: 'text', required: true },
      { name: 'ACTIVITY_FOR', label: 'For', type: 'text', required: true },
      { name: 'START_DATE', label: 'Start date', type: 'date', required: true },
      { name: 'FACILITY_NAME', label: 'Facility', type: 'text', required: false },
    ],
    mapRowToItem: (row) => ({
      id: row.ACTIVITY_CODE,
      primary: row.ACTIVITY_NAME,
      secondary: row.ACTIVITY_FOR,
      meta: fmtDate(row.START_DATE),
    }),
  },

  library: {
    tableName: 'library_loans',
    label: 'Library Return Day',
    icon: <LocalLibraryOutlinedIcon />,
    emptyMessage: 'No books currently borrowed',
    fields: [
      { name: 'book_title', label: 'Book title', type: 'text', required: true },
      { name: 'borrower', label: 'Borrower', type: 'text', required: false },
      { name: 'due_date', label: 'Due date', type: 'date', required: true },
    ],
    mapRowToItem: (row) => ({
      id: row.loan_id,
      primary: row.book_title,
      secondary: row.borrower,
      meta: fmtDate(row.due_date),
    }),
  },

  recipe: {
    tableName: 'recipe',
    label: 'Recipe',
    icon: <LocalLibraryOutlinedIcon />,
    emptyMessage: 'No Recipe currently available, click + to add',
    fields: [
      { name: 'recipe_name', label: 'Recipe Name', type: 'text', required: true },
      { name: 'recipe_type', label: 'Veg/Non-Veg', type: 'text', required: true },
      { name: 'ingredients', label: 'Ingredients', type: 'text', required: false },
      { name: 'instructions', label: 'Instructions', type: 'text', required: false },
    ],
    mapRowToItem: (row) => ({
      id: row.id,
      primary: row.recipe_name,
      secondary: row.recipe_type,
      meta: fmtDate(row.recipe_name),
    }),
  },
  // 10th section. `fields` is the short quick-add set (dashboard card "+"
  // and /todo-task/new); `detailFields` is new — extra columns that only
  // show up in the View All detail table/form (see SectionDetailView.jsx).
  // Existing sections keep working unchanged since nothing reads
  // detailFields unless it's present.
  todo_list: {
    tableName: 'todo_task',
    label: 'Todo List',
    icon: <PlaylistAddCheckOutlinedIcon />,
    viewAllLink: '/section/todo_list',
    emptyMessage: 'No open tasks',
    // Drives the dashboard-widget filter row (see scenes/dashboard/index.jsx).
    // dateField is what "next N days" filters against; any field below
    // marked dashboardFilterable becomes a dropdown filter automatically.
    dashboardFilter: {
      dateField: 'target_date',
      defaultRangeDays: 30,
      hiddenStatuses: ['backlog', 'done'],
    },
    statusOptions: STATUS_OPTIONS,
    fields: [
      { name: 'title', label: 'Title', type: 'text', required: true },
      {
        name: 'priority',
        label: 'Priority',
        type: 'select',
        required: false,
        dashboardFilterable: true,
        options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ],
      },
      { name: 'description', label: 'Desc', type: 'textarea', required: false },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: false,
        dashboardFilterable: true,
        options: [
          { value: 'personal', label: 'Personal' },
          { value: 'home', label: 'Home' },
          { value: 'financial', label: 'Financial' },
          { value: 'health', label: 'Health' },
          { value: 'kids', label: 'Kids' },
          { value: 'auto', label: 'Auto' },
          { value: 'other', label: 'Other' },
        ],
      },
      { name: 'target_date', label: 'Target Date', type: 'date', required: false },
      {
        name: 'family_member_id',
        label: 'Person',
        type: 'asyncSelect',
        source: 'familyMembers',
        required: false,
      },
    ],
    // Only rendered on the View All page (SectionDetailView), appended to
    // `fields` there so editing still goes through the generic SectionForm.
    detailFields: [
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: false,
        dashboardFilterable: true,
        options: [
          { value: 'not_started', label: 'Not Started' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'blocked', label: 'Blocked' },
          { value: 'done', label: 'Done' },
        ],
      },
      { name: 'blocker', label: 'Blocker', type: 'text', required: false },
      { name: 'start_date', label: 'Start Date', type: 'date', required: false },
      { name: 'completion_date', label: 'Completion Date', type: 'date', required: false },
      { name: 'notes', label: 'Notes', type: 'textarea', required: false },
      { name: 'entry_date', label: 'Entry Date', type: 'text', required: false, readOnly: true },
    ],
    mapRowToItem: (row) => ({
      id: row.id,
      primary: row.title,
      secondary: [row.family_member_name, row.category].filter(Boolean).join(' • '),
      meta: row.target_date ? fmtDate(row.target_date) : undefined,
      status: row.status,
    }),
  },

  home_maintenance: {
    tableName: 'home_maintenance',
    label: 'Maintenance', // this is display on the page
    icon: <BuildOutlinedIcon />,
    viewAllLink: '/homeMaintenance',
    emptyMessage: 'No maintenance records yet',
    statusOptions: STATUS_OPTIONS,
    fields: [
      {
        name: 'address',
        label: 'Address',
        type: 'select',
        required: true,
        options: [
          { value: 'C16', label: 'C16' },
          { value: 'LR-D504', label: 'LR-D504' },
          { value: '53 Manohar', label: '53 Manohar' },
          { value: 'DB City', label: 'DB City' },
          { value: '218 Nathan', label: '218 Nathan' },
        ],
      },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        options: [
          'Plumbing',
          'Grouting',
          'AC',
          'Electricity',
          'Painting',
          'Cleaning',
          'Repair',
          'Gutter',
          'Roof',
        ],
      },
      {
        name: 'location',
        label: 'Location',
        type: 'text',
        required: true,
        // options: ['Plumbing', 'Grouting', 'AC', 'Electricity'],
      },
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        required: false,
      },
      { name: 'date_of_work', label: 'Date of Work', type: 'date', required: false },
      { name: 'details', label: 'Work Detail', type: 'textarea', required: false },
      { name: 'cost', label: 'Cost', type: 'number', required: false },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        dashboardFilterable: true,
        options: STATUS_OPTIONS.map(({ value, label }) => ({ value, label })),
      },
    ],
    // Extra columns — only shown on the View All page/table, appended to
    // `fields` there (same pattern as todo_list.detailFields).
    detailFields: [
      {
        name: 'currency',
        label: 'Currency',
        type: 'text',
        required: false,
        readOnly: true, // auto-computed, not user-editable — flip to false if you want it overridable
        derive: (values) => (values.address === '218 Nathan' ? 'USD' : 'INR'),
      },
      { name: 'receipt_saved', label: 'Receipt Saved', type: 'checkbox', required: false },
      {
        name: 'payment_method',
        label: 'Payment Method',
        type: 'select',
        required: false,
        options: [
          { value: 'cash', label: 'Cash' },
          { value: 'credit card', label: 'Credit Card' },
          { value: 'debit card', label: 'Debit Card' },
        ],
      },
      { name: 'account', label: 'Account', type: 'text', required: false },
      { name: 'paid_by', label: 'Paid By', type: 'text', required: false },
      { name: 'created_at', label: 'Created', type: 'text', required: false, readOnly: true },
      { name: 'updated_at', label: 'Updated', type: 'text', required: false, readOnly: true },
    ],

    mapRowToItem: (row) => ({
      id: row.id,
      secondary: [
        row.address,
        [row.category, row.location].filter(Boolean).join(' • '),
        row.date_of_work ? fmtDate(row.date_of_work) : null,
        row.cost != null ? `${row.currency || 'INR'} ${Number(row.cost).toLocaleString()}` : null,
        row.account,
        row.status,
      ]
        .filter(Boolean)
        .join(' | '),
      status: row.status,
    }),
  },
};

export default sectionFields;
