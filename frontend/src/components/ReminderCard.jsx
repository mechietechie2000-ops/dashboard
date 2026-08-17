import { useEffect, useMemo, useState, useCallback } from 'react';
import { Box, Button, Chip, IconButton, Typography, useTheme } from '@mui/material';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { tokens } from '../theme';
import { bucketReminders, BUCKET_LABELS } from '../utils/reminderBuckets';
import { getReminderCard, completeReminder } from '../data/reminderCardRepository';

// fmtDate/fmtDateTime match the helpers already used across
// config/sectionFields.js — kept local here since this card isn't driven
// by that config (it aggregates 6 tables, not one).
const fmtDate = (value) => {
  if (!value) return '';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const fmtDateTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const BUCKET_PRESETS = [
  { value: null, label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this_week', label: 'This Week' },
  { value: 'next_week', label: 'Next Week' },
];

// Every reminder source, in display order. `goal` is the one the user
// said might get disabled later if it clutters the card — the toggle
// below flips it out of the `sources` param without any code change on
// the backend (see reminderSources.js / remindersRepository.getReminderCard).
const ALL_SOURCE_TYPES = ['event', 'goal', 'renewal', 'appointment', 'todo_task', 'routine'];

const SOURCE_LABELS = {
  event: 'Event',
  goal: 'Goal',
  renewal: 'Renewal',
  appointment: 'Appointment',
  todo_task: 'To-do',
  routine: 'Routine',
};

const priorityColor = (colors, priority) => {
  if (priority === 'high') return colors.redAccent[400];
  if (priority === 'medium') return colors.blueAccent[400];
  return colors.grey[400];
};

const ReminderCard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bucketFilter, setBucketFilter] = useState(null); // one of BUCKET_PRESETS values, or 'custom'
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [includeGoals, setIncludeGoals] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const sources = useMemo(
    () => (includeGoals ? ALL_SOURCE_TYPES : ALL_SOURCE_TYPES.filter((s) => s !== 'goal')),
    [includeGoals]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { sources };
      if (bucketFilter === 'custom') {
        if (customFrom) params.from = customFrom;
        if (customTo) params.to = customTo;
      } else if (bucketFilter) {
        params.bucket = bucketFilter;
      }
      const data = await getReminderCard(params);
      setReminders(data);
    } catch (err) {
      console.error('Failed to load reminder card:', err);
      setError(err.message || 'Failed to load reminders');
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, [sources, bucketFilter, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  // Only bucket into Today/Tomorrow/etc for the "All" view — once a preset
  // or custom range is applied, the list is already scoped, so a flat,
  // priority-sorted list reads more naturally than sub-buckets of one range.
  const grouped = useMemo(() => {
    if (bucketFilter) return null;
    return bucketReminders(reminders);
  }, [reminders, bucketFilter]);

  const sortByPriority = (list) =>
    [...list].sort(
      (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
    );

  const handleComplete = async (reminder) => {
    setActioningId(reminder.id);
    try {
      await completeReminder(reminder.source_type, reminder.source_id);
      setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
    } catch (err) {
      console.error('Failed to complete reminder:', err);
      setError(err.message || 'Failed to complete');
    } finally {
      setActioningId(null);
    }
  };

  const renderRow = (reminder) => (
    <Box
      key={reminder.id}
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap="10px"
      py="8px"
      px="2px"
      sx={{ borderBottom: `1px solid ${colors.primary[500]}` }}
    >
      <Box display="flex" alignItems="center" gap="8px" minWidth={0} flex={1}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            flexShrink: 0,
            backgroundColor: priorityColor(colors, reminder.priority),
          }}
        />
        <Box minWidth={0}>
          <Typography
            variant="body2"
            sx={{
              color: colors.grey[100],
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: { xs: '1.25rem', sm: '0.875rem' } //sx for mobile, sm for web
            }}
          >
            {reminder.title}
          </Typography>
          <Box display="flex" alignItems="center" gap="6px">
            {/*  controls css for source type on reminder card (event,appointment, renewals, goals, routine) */}
            {/* [stale] source-type Chip removed here (was `SOURCE_LABELS[reminder.source_type]`) — replaced with time-only display per user feedback, see below */}
            {/* label={SOURCE_LABELS[reminder.source_type] ? fmtDateTime(reminder.due_date):fmtDate(reminder.due_date)} */}
            <Typography
              variant="caption"
              sx={{ color: colors.grey[300], fontWeight: 500, fontSize: { xs: '0.9rem', sm: '0.75rem' }, }}
            >
              {reminder.source_type === 'appointment'
                ? fmtDateTime(reminder.due_date)
                : fmtDate(reminder.due_date)}
            </Typography>
          </Box>
        </Box>
      </Box>

      <IconButton
        size="small"
        aria-label={`Complete ${reminder.title}`}
        disabled={actioningId === reminder.id}
        onClick={() => handleComplete(reminder)}
        title={reminder.source_type === 'routine' ? 'Mark done' : 'Mark complete'}
      >
        <CheckCircleOutlineIcon
          fontSize="small"
          sx={{
            color: actioningId === reminder.id ? colors.grey[600] : colors.greenAccent[500],
          }}
        />
      </IconButton>
    </Box>
  );

  const bucketOrder = ['today', 'tomorrow', 'thisWeek', 'nextWeek', 'thisMonth', 'nextMonth', 'thisYear', 'later'];

  return (
    <Box
      display="flex"
      flexDirection="column"
      sx={{
        minWidth: 0,
        backgroundColor: colors.primary[400],
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: 1,
        position: 'relative',
      }}
    >
      {/* <Box display="flex" alignItems="center" justifyContent="space-between" px="15px" pt="22px"> */}
      <Box display="flex" alignItems="center" justifyContent="space-between" px="15px" py="10px">
        <Box display="flex" alignItems="center" gap="8px">
          <NotificationsActiveOutlinedIcon sx={{ color: colors.greenAccent[500] }} />
          <Typography variant="h5" fontWeight="600" sx={{ color: colors.grey[100] }}>
            Reminders
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={() => setIsCollapsed((c) => !c)}
          aria-label="Toggle collapse Reminders"
        >
          {isCollapsed ? (
            <ExpandMoreIcon sx={{ color: colors.grey[300] }} />
          ) : (
            <ExpandLessIcon sx={{ color: colors.grey[300] }} />
          )}
        </IconButton>
      </Box>

      {!isCollapsed && (
        <>
          <Box display="flex" flexWrap="wrap" gap="6px" px="15px" pt="8px">
            {BUCKET_PRESETS.map((preset) => (
              <Chip
                key={preset.label}
                label={preset.label}
                size="small"
                clickable
                onClick={() => setBucketFilter(preset.value)}
                sx={{
                  fontWeight: 600,
                  border: `1px solid ${bucketFilter === preset.value ? colors.blueAccent[400] : colors.grey[600]}`,
                  // backgroundColor:
                  //   bucketFilter === preset.value ? colors.blueAccent[500] : colors.primary[500],
                  backgroundColor:
                    bucketFilter === preset.value ? colors.blueAccent[500] : 'transparent',  
                  color: bucketFilter === preset.value ? '#fff' : colors.grey[200],
                  '&:hover': {
                    backgroundColor:
                      bucketFilter === preset.value ? colors.blueAccent[400] : colors.primary[600] || colors.primary[500],
                  },
                }}
              />
            ))}
            {/* this block controls the css for ['today', 'tomorrow', 'thisWeek', 'nextWeek', 'thisMonth', 'nextMonth', 'thisYear', 'later'] */}
            <Chip
              label="Custom"
              size="small"
              clickable
              onClick={() => setBucketFilter('custom')}
              sx={{
                fontWeight: 600,
                border: `1px solid ${bucketFilter === 'custom' ? colors.blueAccent[400] : colors.grey[600]}`,
                // backgroundColor: bucketFilter === 'custom' ? colors.blueAccent[500] : colors.primary[500],
                backgroundColor: bucketFilter === 'custom' ? colors.blueAccent[500] : 'transparent',
                color: bucketFilter === 'custom' ? '#fff' : colors.grey[200],
              }}
            />
            {/* this block controls the css for ['Goals: shown' : 'Goals: hidden'] */}
            <Chip
              label={includeGoals ? 'Goals: shown' : 'Goals: hidden'}
              size="small"
              clickable
              variant={includeGoals ? 'filled' : 'outlined'}
              onClick={() => setIncludeGoals((v) => !v)}
              sx={{
                ml: 'auto',
                fontFamily: '"Roboto Mono", monospace',
                fontWeight: 600,
                letterSpacing: '0.02em',
                border: `1px solid ${includeGoals ? colors.greenAccent[500] : colors.grey[500]}`,
                backgroundColor: includeGoals ? colors.greenAccent[700] || colors.greenAccent[600] : 'transparent',
                color: includeGoals ? '#fff' : colors.grey[300],
                '&:hover': {
                  backgroundColor: includeGoals
                    ? colors.greenAccent[600]
                    : colors.primary[600] || colors.primary[500],
                },
              }}
            />
          </Box>

          {bucketFilter === 'custom' && (
            <Box display="flex" gap="8px" px="15px" pt="8px">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{
                  background: 'transparent',
                  color: colors.grey[100],
                  border: `1px solid ${colors.grey[600]}`,
                  borderRadius: 4,
                  padding: '4px 6px',
                }}
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{
                  background: 'transparent',
                  color: colors.grey[100],
                  border: `1px solid ${colors.grey[600]}`,
                  borderRadius: 8,
                  padding: '4px 6px',
                }}
              />
            </Box>
          )}

          {/* <Box px="15px" pb="12px" pt="8px" sx={{ maxHeight: 320, overflowY: 'auto' }}> */}
          <Box
            px="15px"
            pb="12px"
            pt="8px"
            sx={{
              maxHeight: { xs: 'none', sm: 320 },
              overflowY: { xs: 'visible', sm: 'auto' },
              scrollbarWidth: 'thin', // Firefox (desktop only, see below)
              scrollbarColor: `${colors.grey[700]} transparent`,
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: colors.grey[700],
                borderRadius: '4px',
              },
              '@media (max-width: 600px)': {
                maxHeight: 'none',
                overflowY: 'visible',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
              },
            }}
          >
            {loading && (
              <Typography variant="body2" sx={{ color: colors.grey[400] }}>
                Loading…
              </Typography>
            )}
            {!loading && error && (
              <Typography variant="body2" sx={{ color: colors.redAccent[400] }}>
                {error}
              </Typography>
            )}
            {!loading && !error && reminders.length === 0 && (
              <Typography variant="body2" sx={{ color: colors.grey[400] }}>
                Nothing upcoming.
              </Typography>
            )}

            {!loading &&
              !error &&
              reminders.length > 0 &&
              (grouped ? (
                bucketOrder
                  .filter((key) => grouped[key] && grouped[key].length > 0)
                  .map((key) => (
                    <Box key={key} mb="10px">
                      <Typography
                        variant="caption"
                        sx={{ color: colors.grey[400], fontWeight: 600, textTransform: 'uppercase' }}
                      >
                        {BUCKET_LABELS[key]}
                      </Typography>
                      {sortByPriority(grouped[key]).map(renderRow)}
                    </Box>
                  ))
              ) : (
                sortByPriority(reminders).map(renderRow)
              ))}
          </Box>
        </>
      )}
    </Box>
  );
};

export default ReminderCard;
