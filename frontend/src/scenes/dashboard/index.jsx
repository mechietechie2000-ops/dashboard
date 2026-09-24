import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Drawer,
  IconButton,
  MenuItem,
  Modal,
  Select,
  Snackbar,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { tokens } from '../../theme';
import Header from '../../components/Header';
import DashboardSection from '../../components/DashboardSection';
import ReminderCard from '../../components/ReminderCard';
import SectionForm from '../../components/SectionForm';
import sectionFields from '../../config/sectionFields';
import {
  listRecords,
  insertRecord,
  updateRecord,
  deleteRecord,
} from '../../data/sectionRepository';
import {
  runDailyResetManual,
  listTodayRoutineTasks,
  markRoutineDone,
  markRoutineSkipped,
  toggleRoutineMute,
} from '../../data/routineRepository';
// import {SKIP_REASONS} from '../routine'

//SKIP_REASONS = ['lazy', 'tired', 'office work', 'guest', 'outdoor', 'no reason'];

const SECTION_KEYS = [
  'routine',
  'todo_list',
  //'reminders',
  'goals',
  'events',
  'appointments',
  'renewals',
  'bills',
  // 'recipe',
  //  "extracurricular",
  //  "library",
];

const UNDO_WINDOW_MS = 4500;

const DATE_RANGE_OPTIONS = [
  { value: 7, label: 'Next 7 days' },
  { value: 30, label: 'Next 30 days' },
  { value: 90, label: 'Next 90 days' },
  { value: 0, label: 'All' },
];

const getFilterableFields = (config) =>
  [...(config.fields || []), ...(config.detailFields || [])].filter((f) => f.dashboardFilterable);

const withinRangeDays = (dateStr, rangeDays) => {
  if (!rangeDays) return true;
  if (!dateStr) return true;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + rangeDays);
  return target >= today && target <= end;
};

const parseFamilyMemberNames = () => {
  const raw = process.env.REACT_APP_FAMILY_MEMBER_NAMES || '';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
};
const FAMILY_MEMBER_NAMES = parseFamilyMemberNames();

const isFamilyMember = (personName) =>
  FAMILY_MEMBER_NAMES.includes((personName || '').trim().toLowerCase());

const getMonthDay = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return { month: d.getMonth(), day: d.getDate() };
};

const daysBetween = (a, b) => Math.round((b - a) / 86400000);

// Custom filter for events: MM/DD-only recurrence, asymmetric windows for
// family vs non-family, and a 2-day "belated" grace period on past dates.
const filterEvents = (items) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();

  return items.filter((item) => {
    const dateStr = item.raw?.event_date;
    const md = dateStr ? getMonthDay(dateStr) : null;
    if (!md) return true; // no usable date — don't hide it

    const thisYear = new Date(year, md.month, md.day);
    const nextYear = new Date(year + 1, md.month, md.day);
    const lastYear = new Date(year - 1, md.month, md.day);

    // Nearest upcoming occurrence (>= 0 days away)
    const futureCandidates = [thisYear, nextYear]
      .map((occ) => daysBetween(today, occ))
      .filter((diff) => diff >= 0);
    const futureDiff = futureCandidates.length ? Math.min(...futureCandidates) : Infinity;

    // Nearest past occurrence (<= 0 days away, closest to today)
    const pastCandidates = [thisYear, lastYear]
      .map((occ) => daysBetween(today, occ))
      .filter((diff) => diff <= 0);
    const pastDiff = pastCandidates.length ? Math.max(...pastCandidates) : -Infinity;

    const windowDays = isFamilyMember(item.raw?.person_name) ? 90 : 30;
    const withinFutureWindow = futureDiff <= windowDays;
    const withinBelatedWindow = pastDiff >= -2; // up to 2 days ago, any person

    return withinFutureWindow || withinBelatedWindow;
  });
};

/* const applyDashboardFilters = (items, config, filterState) => {
  if (!config.dashboardFilter) return items;
  const { dateField, defaultRangeDays } = config.dashboardFilter;
  const rangeDays = filterState.rangeDays ?? defaultRangeDays ?? 0;
  const statusFilterActive = Boolean(filterState.status);
  return items.filter((item) => {
    // Backlog/Done are hidden from the default view to reduce clutter;
    // explicitly selecting that status in the filter sheet still shows it.
    if (!statusFilterActive && (item.status === 'backlog' || item.status === 'done')) {
      return false;
    }
    // in_progress is always visible regardless of date range.
    if (item.status !== 'in_progress') {
      if (dateField && !withinRangeDays(item.raw?.[dateField], rangeDays)) return false;
    }
    for (const field of getFilterableFields(config)) {
      const selected = filterState[field.name];
      if (selected && String(item.raw?.[field.name]) !== String(selected)) return false;
    }
    return true;
  });
}; */

const applyDashboardFilters = (items, config, filterState) => {
  if (!config.dashboardFilter) return items;
  const { dateField, defaultRangeDays } = config.dashboardFilter;
  const rangeDays = filterState.rangeDays ?? defaultRangeDays ?? 0;
  const statusFilterActive = Boolean(filterState.status);
  const hiddenStatuses = config.dashboardFilter?.hiddenStatuses || [];

  return items.filter((item) => {
    if (!statusFilterActive && hiddenStatuses.includes(item.status)) {
      return false;
    }
    if (filterState.rangeDays !== undefined && dateField) {
      if (!withinRangeDays(item.raw?.[dateField], rangeDays)) return false;
    }
    for (const field of getFilterableFields(config)) {
      const selected = filterState[field.name];
      if (selected && String(item.raw?.[field.name]) !== String(selected)) return false;
    }
    return true;
  });
};

const HomeDashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [itemsBySection, setItemsBySection] = useState({});
  const [activeSection, setActiveSection] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [pendingUndo, setPendingUndo] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [filtersBySection, setFiltersBySection] = useState({});
  const [filterSheetFor, setFilterSheetFor] = useState(null);
  const [routineSkipTarget, setRoutineSkipTarget] = useState(null);
  const [routineSkipReason, setRoutineSkipReason] = useState('');

  // Track collapsed state per section
  const [collapsedSections, setCollapsedSections] = useState({});
  const SKIP_REASONS = ['lazy', 'tired', 'office work', 'guest', 'outdoor', 'no reason'];

  const toggleCollapse = (sectionKey) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const setSectionFilter = (sectionKey, key, value) => {
    setFiltersBySection((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [key]: value },
    }));
  };

  const resetSectionFilters = (sectionKey) => {
    setFiltersBySection((prev) => ({ ...prev, [sectionKey]: {} }));
  };

  const displayItemsBySection = useMemo(() => {
    const result = {};
    for (const sectionKey of SECTION_KEYS) {
      const config = sectionFields[sectionKey];
      const items = itemsBySection[sectionKey] || [];
      if (sectionKey === 'events') {
        result[sectionKey] = filterEvents(items);
      } else {
        result[sectionKey] = config?.dashboardFilter
          ? applyDashboardFilters(items, config, filtersBySection[sectionKey] || {})
          : items;
      }
    }
    return result;
  }, [itemsBySection, filtersBySection]);

  /* const loadSection = useCallback(async (sectionKey) => {
    try {
      const items = await listRecords(sectionKey);
      setItemsBySection((prev) => ({ ...prev, [sectionKey]: items }));
    } catch (err) {
      console.error(`Failed to load ${sectionKey}:`, err);
      setItemsBySection((prev) => ({ ...prev, [sectionKey]: [] }));
    }
  }, []); */

  const loadSection = useCallback(async (sectionKey) => {
    try {
      const items =
        sectionKey === 'routine'
          ? (await listTodayRoutineTasks()).map((row) => ({
              ...sectionFields.routine.mapRowToItem(row),
              raw: row,
            }))
          : await listRecords(sectionKey);
      setItemsBySection((prev) => ({ ...prev, [sectionKey]: items }));
    } catch (err) {
      console.error(`Failed to load ${sectionKey}:`, err);
      setItemsBySection((prev) => ({ ...prev, [sectionKey]: [] }));
    }
  }, []);

  useEffect(() => {
    SECTION_KEYS.forEach(loadSection);
  }, [loadSection]);

  const openAdd = (sectionKey, initialValues = null) => {
    setEditingItem(initialValues); // If cloning, prepopulates with old record values
    setActiveSection(sectionKey);
  };

  const openEdit = (sectionKey, item) => {
    setEditingItem(item.raw);
    setActiveSection(sectionKey);
  };

  const handleClone = (sectionKey, item) => {
    // Strip ID and timestamps so it creates a fresh clone
    const { id, created_at, updated_at, ...clonedData } = item.raw || {};
    openAdd(sectionKey, clonedData);
  };

  const closeForm = () => {
    setActiveSection(null);
    setEditingItem(null);
  };

  const handleSubmit = async (sectionKey, values) => {
    // If editingItem has an ID, it's an update. Otherwise, it's a new record (or cloned record).
    if (editingItem && editingItem.id) {
      await updateRecord(sectionKey, editingItem.id, values);
    } else {
      await insertRecord(sectionKey, values);
    }
    await loadSection(sectionKey);
    closeForm();
  };

  const queueDelete = (sectionKey, item) => {
    setItemsBySection((prev) => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter((i) => i.id !== item.id),
    }));

    const timeoutId = setTimeout(async () => {
      try {
        await deleteRecord(sectionKey, item.id);
      } catch (err) {
        console.error(`Failed to delete ${sectionKey} item ${item.id}:`, err);
        loadSection(sectionKey);
      }
      setPendingUndo((cur) => (cur && cur.item.id === item.id ? null : cur));
    }, UNDO_WINDOW_MS);

    setPendingUndo({ sectionKey, item, timeoutId });
  };

  /*   const handleStatusChange = async (sectionKey, item, newStatus) => {
    const prevStatus = item.status;

    setItemsBySection((prev) => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).map((i) =>
        i.id === item.id ? { ...i, status: newStatus } : i
      ),
    }));

    try {
      await updateRecord(sectionKey, item.id, { status: newStatus });
    } catch (err) {
      console.error(`Failed to update status for ${sectionKey} item ${item.id}:`, err);
      setItemsBySection((prev) => ({
        ...prev,
        [sectionKey]: (prev[sectionKey] || []).map((i) =>
          i.id === item.id ? { ...i, status: prevStatus } : i
        ),
      }));
    }
  }; */

  const handleStatusChange = async (sectionKey, item, newStatus) => {
    if (sectionKey === 'routine') {
      /*       if (newStatus === 'done') {
        // Optimistic remove — markDone deletes the temp row server-side,
        // it doesn't set a status we can patch in place like other sections.
        const prevItems = itemsBySection.routine || [];
        setItemsBySection((prev) => ({
          ...prev,
          routine: (prev.routine || []).filter((i) => i.id !== item.id),
        }));
        try {
          await markRoutineDone(item.id);
        } catch (err) {
          console.error(`Failed to mark routine ${item.id} done:`, err);
          setItemsBySection((prev) => ({ ...prev, routine: prevItems }));
        }
        return;
      }

      if (newStatus === 'skipped') {
        // Skip needs a reason first — defer the actual call/removal until
        // confirmRoutineSkip() runs from the dialog.
        setRoutineSkipTarget(item);
        setRoutineSkipReason('');
        return;
      } */
      if (newStatus === 'done') {
        queueRoutineAction(item, 'done');
        return;
      }
      if (newStatus === 'skipped') {
        setRoutineSkipTarget(item);
        setRoutineSkipReason('');
        return;
      }
      return;
    }

    // ---- existing generic path for all other sections ----
    const prevStatus = item.status;

    setItemsBySection((prev) => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).map((i) =>
        i.id === item.id ? { ...i, status: newStatus } : i
      ),
    }));

    try {
      await updateRecord(sectionKey, item.id, { status: newStatus });
    } catch (err) {
      console.error(`Failed to update status for ${sectionKey} item ${item.id}:`, err);
      setItemsBySection((prev) => ({
        ...prev,
        [sectionKey]: (prev[sectionKey] || []).map((i) =>
          i.id === item.id ? { ...i, status: prevStatus } : i
        ),
      }));
    }
  };

  /*   const confirmRoutineSkip = async () => {
    if (!routineSkipReason || !routineSkipTarget) return;
    const target = routineSkipTarget;
    const prevItems = itemsBySection.routine || [];

    setItemsBySection((prev) => ({
      ...prev,
      routine: (prev.routine || []).filter((i) => i.id !== target.id),
    }));
    setRoutineSkipTarget(null);

    try {
      await markRoutineSkipped(target.id, routineSkipReason);
    } catch (err) {
      console.error(`Failed to skip routine ${target.id}:`, err);
      setItemsBySection((prev) => ({ ...prev, routine: prevItems }));
    }
  }; */
  const confirmRoutineSkip = () => {
    if (!routineSkipReason || !routineSkipTarget) return;
    queueRoutineAction(routineSkipTarget, 'skipped', routineSkipReason);
    setRoutineSkipTarget(null);
  };

  const handleUndoDelete = () => {
    if (!pendingUndo) return;
    clearTimeout(pendingUndo.timeoutId);
    setItemsBySection((prev) => ({
      ...prev,
      [pendingUndo.sectionKey]: [...(prev[pendingUndo.sectionKey] || []), pendingUndo.item],
    }));
    setPendingUndo(null);
  };

  const handleDailyReset = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      const result = await runDailyResetManual();
      setResetMessage(
        result.skipped
          ? 'Already reset for today.'
          : `Reset complete — ${result.tasksLoaded} task(s) loaded for today.`
      );
      await loadSection('routine');
    } catch (err) {
      setResetMessage(err.message || 'Reset failed — please try again.');
    } finally {
      setResetting(false);
    }
  };

  const queueRoutineAction = (item, action, reason) => {
    const prevItems = itemsBySection.routine || [];

    setItemsBySection((prev) => ({
      ...prev,
      routine: (prev.routine || []).filter((i) => i.id !== item.id),
    }));

    const timeoutId = setTimeout(async () => {
      try {
        if (action === 'done') {
          await markRoutineDone(item.id);
        } else {
          await markRoutineSkipped(item.id, reason);
        }
      } catch (err) {
        console.error(`Failed to ${action} routine ${item.id}:`, err);
        setItemsBySection((prev) => ({ ...prev, routine: prevItems }));
      }
      setPendingUndo((cur) => (cur && cur.item.id === item.id ? null : cur));
    }, UNDO_WINDOW_MS);

    setPendingUndo({ sectionKey: 'routine', item, action, reason, timeoutId, prevItems });
  };

  return (
    <Box m={{ xs: '0px', sm: '20px' }}>
      {/* <Header title="HOME" subtitle="Welcome back!" /> */}
      <Header title="Dashboard" />

      <Box
        display={{ xs: 'block', sm: 'grid' }}
        gridTemplateColumns={{ sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
        gridAutoRows={{ sm: 'minmax(240px, auto)' }}
        gap={{ sm: '20px' }}
        mt="10px"
        sx={{
          '& > *': {
            marginBottom: { xs: '20px', sm: 0 },
          },
        }}
      >
        <ReminderCard />
        {SECTION_KEYS.map((sectionKey) => {
          const config = sectionFields[sectionKey];
          const hasFilter = Boolean(config.dashboardFilter);
          const filterState = filtersBySection[sectionKey] || {};
          const activeFilterCount = hasFilter
            ? Object.values(filterState).filter((v) => v !== undefined && v !== '').length
            : 0;
          const isCollapsed = Boolean(collapsedSections[sectionKey]);
          // Icons stack right-to-left: View all, Add, Filter, (Reset for routine).
          // Add always sits in the same slot right after "View all"; Filter (when
          // present) sits one slot further left so the two never overlap.
          const addRight = config.viewAllLink ? 90 : 12;
          const filterRight = addRight + 40;
          return (
            <Box
              key={sectionKey}
              display="flex"
              flexDirection="column"
              sx={{
                minWidth: 0,
                // backgroundColor: colors.primary[400], // Matched color palette
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: 1,
                alignSelf: isCollapsed ? 'start' : 'stretch',
              }}
            >
              <Box position="relative" flex={1} minHeight={0}>
                {/* Top Right Action Button Row: [Reset] [Filter] [+] [ ^ ] */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    zIndex: 2,
                  }}
                >
                  {sectionKey === 'routine' && (
                    <IconButton
                      onClick={handleDailyReset}
                      disabled={resetting}
                      size="small"
                      aria-label="Reset today's routine"
                      title="Reset today's routine"
                    >
                      <RestartAltIcon
                        sx={{ color: colors.grey[300], opacity: resetting ? 0.4 : 1 }}
                      />
                    </IconButton>
                  )}

                  {hasFilter && (
                    <IconButton
                      onClick={() => setFilterSheetFor(sectionKey)}
                      size="small"
                      aria-label={`Filter ${config.label}`}
                    >
                      <FilterListIcon
                        sx={{
                          color: activeFilterCount ? colors.blueAccent[400] : colors.grey[300],
                        }}
                      />
                    </IconButton>
                  )}

                  <IconButton
                    onClick={() => openAdd(sectionKey)}
                    size="small"
                    aria-label={`Add ${config.label}`}
                  >
                    <AddCircleOutlineIcon sx={{ color: colors.greenAccent[500] }} />
                  </IconButton>

                  <IconButton
                    onClick={() => toggleCollapse(sectionKey)}
                    size="small"
                    aria-label={`Toggle collapse ${config.label}`}
                  >
                    {isCollapsed ? (
                      <ExpandMoreIcon sx={{ color: colors.grey[300] }} />
                    ) : (
                      <ExpandLessIcon sx={{ color: colors.grey[300] }} />
                    )}
                  </IconButton>
                </Box>

                <DashboardSection
                  title={config.label}
                  icon={config.icon}
                  items={displayItemsBySection[sectionKey] || []}
                  emptyMessage={config.emptyMessage}
                  viewAllLink={config.viewAllLink}
                  isCollapsed={isCollapsed}
                  // onEditRequest={(item) => openEdit(sectionKey, item)}
                  // onDeleteRequest={(item) => queueDelete(sectionKey, item)}
                  onEditRequest={
                    sectionKey === 'routine' ? undefined : (item) => openEdit(sectionKey, item)
                  }
                  onDeleteRequest={
                    sectionKey === 'routine' ? undefined : (item) => queueDelete(sectionKey, item)
                  }
                  onCloneRequest={(item) => handleClone(sectionKey, item)}
                  statusOptions={config.statusOptions}
                  onStatusChange={(item, newStatus) =>
                    handleStatusChange(sectionKey, item, newStatus)
                  }
                  sectionKey={sectionKey}
                />
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Filter Sheet */}
      <Drawer
        anchor="bottom"
        open={Boolean(filterSheetFor)}
        onClose={() => setFilterSheetFor(null)}
        PaperProps={{
          sx: {
            backgroundColor: colors.primary[400],
            borderRadius: '16px 16px 0 0',
            p: '16px 20px',
            maxHeight: '70vh',
            // Full-width bottom sheet on mobile; on wider screens it's an
            // awkward edge-to-edge strip, so cap the width and center it
            // above the fold instead.
            width: { xs: '100%', sm: 480 },
            maxWidth: '100vw',
            left: { xs: 0, sm: '50%' },
            right: { xs: 0, sm: 'auto' },
            transform: { sm: 'translateX(-50%)' },
          },
        }}
      >
        {filterSheetFor &&
          (() => {
            const config = sectionFields[filterSheetFor];
            const filterState = filtersBySection[filterSheetFor] || {};
            const filterableFields = getFilterableFields(config);
            return (
              <Box display="flex" flexDirection="column" gap="14px">
                <Box sx={{ fontWeight: 'bold', color: colors.grey[100] }}>
                  Filter {config.label}
                </Box>
                <Box display="flex" flexDirection="column" gap="10px">
                  <Select
                    size="small"
                    fullWidth
                    value={filterState.rangeDays ?? config.dashboardFilter?.defaultRangeDays ?? 0}
                    onChange={(e) =>
                      setSectionFilter(filterSheetFor, 'rangeDays', Number(e.target.value))
                    }
                    sx={{ color: colors.grey[100] }}
                  >
                    {DATE_RANGE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {filterableFields.map((field) => (
                    <Select
                      key={field.name}
                      size="small"
                      fullWidth
                      displayEmpty
                      value={filterState[field.name] || ''}
                      onChange={(e) => setSectionFilter(filterSheetFor, field.name, e.target.value)}
                      sx={{ color: colors.grey[100] }}
                    >
                      <MenuItem value="">All {field.label}</MenuItem>
                      {(typeof field.options === 'function'
                        ? field.options({})
                        : field.options || []
                      ).map((opt) => {
                        const optValue = typeof opt === 'object' ? opt.value : opt;
                        const optLabel = typeof opt === 'object' ? opt.label : opt;
                        return (
                          <MenuItem key={optValue} value={optValue}>
                            {optLabel}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  ))}
                </Box>
                <Box display="flex" gap="10px" mt="4px" mb="8px">
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => resetSectionFilters(filterSheetFor)}
                  >
                    Reset
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => setFilterSheetFor(null)}
                    sx={{
                      backgroundColor: colors.blueAccent[600],
                      '&:hover': { backgroundColor: colors.blueAccent[700] },
                    }}
                  >
                    Apply
                  </Button>
                </Box>
              </Box>
            );
          })()}
      </Drawer>

      <Dialog open={!!routineSkipTarget} onClose={() => setRoutineSkipTarget(null)}>
        <DialogTitle>Why skip "{routineSkipTarget?.primary}"?</DialogTitle>
        <DialogContent>
          <Select
            fullWidth
            value={routineSkipReason}
            onChange={(e) => setRoutineSkipReason(e.target.value)}
          >
            {SKIP_REASONS.map((r) => (
              <MenuItem key={r} value={r}>
                {r}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoutineSkipTarget(null)}>Cancel</Button>
          <Button disabled={!routineSkipReason} onClick={confirmRoutineSkip}>
            Skip
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit/Add Modal */}
      <Modal
        open={Boolean(activeSection)}
        onClose={closeForm}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 420,
            bgcolor: colors.primary[400], // Matched palette with main card screens
            backgroundImage: 'none',
            borderRadius: '16px',
            p: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
            outline: 'none',
          }}
        >
          {activeSection && (
            <SectionForm
              sectionKey={activeSection}
              initialValues={editingItem}
              onSubmit={handleSubmit}
              onCancel={closeForm}
            />
          )}
        </Box>
      </Modal>

      <Snackbar
        open={!!resetMessage}
        message={resetMessage}
        autoHideDuration={4000}
        onClose={() => setResetMessage('')}
      />

      <Snackbar
        open={!!pendingUndo}
        message={pendingUndo ? `${pendingUndo.item.primary || 'Item'} deleted` : ''}
        autoHideDuration={UNDO_WINDOW_MS}
        action={
          <Button color="secondary" size="small" onClick={handleUndoDelete}>
            Undo
          </Button>
        }
      />
    </Box>
  );
};

export default HomeDashboard;
