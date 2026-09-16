import { useEffect, useMemo, useState, useCallback } from 'react';
import { Box, Button, Chip, IconButton, Typography, useTheme } from '@mui/material';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { tokens } from '../theme';
import { bucketReminders, BUCKET_LABELS, bucketToRange } from '../utils/reminderBuckets';
import { getReminderCard, completeReminder, syncReminders  } from '../data/reminderCardRepository';
import RefreshIcon from '@mui/icons-material/Refresh';

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

const isUpcomingEarly = (reminder) => {
  if (!reminder.due_date) return false;
  const due = new Date(`${String(reminder.due_date).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(due.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const dueTime = due.getTime();
  return dueTime !== today.getTime() && dueTime !== tomorrow.getTime();
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
  const [bucketFilter, setBucketFilter] = useState('this_week'); // one of BUCKET_PRESETS values, or 'custom'
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
        // params.bucket = bucketFilter;
        const { from, to } = bucketToRange(bucketFilter);
        params.from = from;
        params.to = to;
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

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await syncReminders();
    } catch (err) {
      console.error('Failed to sync reminders:', err);
      setError(err.message || 'Sync failed — showing last known data');
    }
    await load();
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

    // End-of-range boundary for each grouped-view bucket key, mirroring the
  // same ranges bucketReminders() computes internally. Used so a reminder
  // grouped under e.g. "today" (because its lead window opened) can still
  // be flagged as nagging-early when its actual due_date falls past that
  // bucket's own boundary.
/*   const groupedBucketBoundary = useMemo(() => {
    const day0 = new Date();
    day0.setHours(0, 0, 0, 0);
    const day1 = new Date(day0.getTime() + 24 * 60 * 60 * 1000);
    const dayOfWeek = day0.getDay();
    const weekEnd = new Date(day0.getTime() + (6 - dayOfWeek) * 24 * 60 * 60 * 1000);
    const nextWeekEnd = new Date(weekEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthEnd = new Date(day0.getFullYear(), day0.getMonth() + 1, 0);
    const nextMonthEnd = new Date(monthEnd.getFullYear(), monthEnd.getMonth() + 2, 0);
    const yearEnd = new Date(day0.getFullYear(), 11, 31);

    const toISO = (d) => d.toISOString().slice(0, 10);
    return {
      today: toISO(day0),
      tomorrow: toISO(day1),
      thisWeek: toISO(weekEnd),
      nextWeek: toISO(nextWeekEnd),
      thisMonth: toISO(monthEnd),
      nextMonth: toISO(nextMonthEnd),
      thisYear: toISO(yearEnd),
      later: null, // no upper bound — never flag "later" items as early
    };
  }, []); */
  const activeToBoundary = useMemo(() => {
    if (bucketFilter === 'custom') return customTo || null;
    if (bucketFilter) return bucketToRange(bucketFilter).to;
    return null;
  }, [bucketFilter, customTo]);

  const isDueWithinBoundary = (reminder, boundary) => {
    if (!boundary || !reminder.due_date) return true;
    return String(reminder.due_date).slice(0, 10) <= String(boundary).slice(0, 10);
  };

  // Splits the current preset's results into what's genuinely due in range
  // vs. what's only showing because its renewal lead window opened early.
  // The nagging split is only surfaced for Today/This Week — Tomorrow and
  // Next Week just hide early-window items outright, since they'll already
  // be visible (flagged) under Today/This Week.
  const { dueList, naggingList } = useMemo(() => {
    if (!bucketFilter || bucketFilter === 'custom') {
      return { dueList: reminders, naggingList: [] };
    }
    const boundary = activeToBoundary;
    const due = [];
    const nagging = [];
    for (const r of reminders) {
      (isDueWithinBoundary(r, boundary) ? due : nagging).push(r);
    }
    if (bucketFilter === 'today' || bucketFilter === 'this_week') {
      return { dueList: due, naggingList: nagging };
    }
    return { dueList: due, naggingList: [] };
  }, [reminders, bucketFilter, activeToBoundary]);

  // The end-of-range boundary currently in effect for the query, or null
  // for the "All" grouped view (which doesn't need this — bucketReminders
  // already places each item in exactly one correct bucket there).


  // True only when this reminder is showing up because its lead window
  // (window_start) opened early, not because its actual due_date falls
  // within the currently selected range.


const renderRow = (reminder, isNagging = false) => (
    <Box
      key={reminder.id}
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      gap="10px"
      py="8px"
      px="10px"
      sx={{
        borderBottom: `1px solid ${colors.primary[500]}33`,
        backgroundColor: isNagging ? `${colors.blueAccent[400]}1F` : 'transparent',
        borderLeft: isNagging ? `3px solid ${colors.blueAccent[400]}` : '3px solid transparent',
        pl: '7px'
      }}
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
            {isNagging && (
              <Box
                component="span"
                sx={{
                  fontSize: { xs: '0.7rem', sm: '0.62rem' },
                  fontWeight: 700,
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  color: colors.blueAccent[300],
                  backgroundColor: `${colors.blueAccent[400]}26`,
                  borderRadius: '4px',
                  px: '6px',
                  py: '1px',
                  lineHeight: 1.6,
                }}
              >
                Early
              </Box>
            )}
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
      {/* <Box display="flex" alignItems="center" justifyContent="space-between" px="15px" py="10px" sx={{ borderBottom: `2px solid ${colors.primary[500]}` }}> */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px="15px"
        pt="16px"
        mb={isCollapsed ? 0 : '10px'}
        pb={isCollapsed ? 0 : '10px'}
        borderBottom={isCollapsed ? 'none' : `2px solid ${colors.primary[500]}`}
        sx={{ transition: 'margin 0.25s ease, padding 0.25s ease' }}
      >
        <Box display="flex" alignItems="center" gap="8px">
          <NotificationsActiveOutlinedIcon sx={{ color: colors.greenAccent[500] }} />
          <Typography variant="h5" fontWeight="600" sx={{ color: colors.grey[100] }}>
            Reminders
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap="4px">
          <IconButton
            size="small"
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Refresh Reminders"
          >
            <RefreshIcon
              fontSize="small"
              sx={{
                color: colors.grey[300],
                animation: loading ? 'spin 0.8s linear infinite' : 'none',
                '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } },
              }}
            />
          </IconButton>
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
/*                   '&:hover': {
                    backgroundColor:
                      bucketFilter === preset.value ? colors.blueAccent[400] : colors.primary[600] || colors.primary[500],
                  }, */
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
                      {sortByPriority(grouped[key]).map((r) => renderRow(r))}
                    </Box>
                  ))
              ) : (
                <>
                  {sortByPriority(dueList).map((r) => renderRow(r))}
                  {naggingList.length > 0 && (
                    <Box
                      mt="12px"
                      sx={{
                        borderTop: `1px dashed ${colors.blueAccent[400]}55`,
                        pt: '10px',
                      }}
                    >
                      <Box display="flex" alignItems="center" gap="6px" mb="4px">
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: colors.blueAccent[400],
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            color: colors.blueAccent[300],
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            fontSize: '0.7rem',
                          }}
                        >
                          Coming up soon
                        </Typography>
                      </Box>
                      {sortByPriority(naggingList).map((r) => renderRow(r, true))}
                    </Box>
                  )}
                </>
              ))}
          </Box>
        </>
      )}
    </Box>
  );
};

export default ReminderCard;
