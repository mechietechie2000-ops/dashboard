import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Modal,
  Select,
  Snackbar,
  useTheme,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import DashboardSection from "../../components/DashboardSection";
import SectionForm from "../../components/SectionForm";
import sectionFields from "../../config/sectionFields";
import { listRecords, insertRecord, updateRecord, deleteRecord } from "../../data/sectionRepository";
import { runDailyResetManual } from "../../data/routineRepository";

const SECTION_KEYS = [
  "routine",
  "reminders",
  "goals",
  "events",
  "appointments",
  "renewals",
  "bills",
  "extracurricular",
  "library",
  "todo_task",
];

const UNDO_WINDOW_MS = 4500;

const DATE_RANGE_OPTIONS = [
  { value: 7, label: "Next 7 days" },
  { value: 30, label: "Next 30 days" },
  { value: 90, label: "Next 90 days" },
  { value: 0, label: "All" },
];

// Any field (quick-add `fields` or `detailFields`) marked
// `dashboardFilterable: true` becomes a dropdown filter here automatically
// — this isn't specific to Todo Task, any section with `dashboardFilter`
// set in sectionFields.js gets the same widget for free.
const getFilterableFields = (config) => [
  ...(config.fields || []),
  ...(config.detailFields || []),
].filter((f) => f.dashboardFilterable);

const withinRangeDays = (dateStr, rangeDays) => {
  if (!rangeDays) return true; // 0/undefined = "All"
  if (!dateStr) return true; // don't hide undated items behind a date filter
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + rangeDays);
  return target >= today && target <= end;
};

const applyDashboardFilters = (items, config, filterState) => {
  if (!config.dashboardFilter) return items;
  const { dateField, defaultRangeDays } = config.dashboardFilter;
  const rangeDays = filterState.rangeDays ?? defaultRangeDays ?? 0;
  return items.filter((item) => {
    if (dateField && !withinRangeDays(item.raw?.[dateField], rangeDays)) return false;
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
  const [editingItem, setEditingItem] = useState(null); // raw row being edited, or null when adding
  const [pendingUndo, setPendingUndo] = useState(null); // { sectionKey, item, timeoutId }
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  // Keyed by sectionKey -> { rangeDays, [filterableFieldName]: value }.
  // Only sections with `dashboardFilter` in sectionFields.js ever read from
  // this; everything else ignores it, same as before.
  const [filtersBySection, setFiltersBySection] = useState({});

  const setSectionFilter = (sectionKey, key, value) => {
    setFiltersBySection((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [key]: value },
    }));
  };

  const displayItemsBySection = useMemo(() => {
    const result = {};
    for (const sectionKey of SECTION_KEYS) {
      const config = sectionFields[sectionKey];
      const items = itemsBySection[sectionKey] || [];
      result[sectionKey] = config?.dashboardFilter
        ? applyDashboardFilters(items, config, filtersBySection[sectionKey] || {})
        : items;
    }
    return result;
  }, [itemsBySection, filtersBySection]);

  const loadSection = useCallback(async (sectionKey) => {
    try {
      const items = await listRecords(sectionKey);
      setItemsBySection((prev) => ({ ...prev, [sectionKey]: items }));
    } catch (err) {
      console.error(`Failed to load ${sectionKey}:`, err);
      setItemsBySection((prev) => ({ ...prev, [sectionKey]: [] }));
    }
  }, []);

  useEffect(() => {
    SECTION_KEYS.forEach(loadSection);
  }, [loadSection]);

  const openAdd = (sectionKey) => {
    setEditingItem(null);
    setActiveSection(sectionKey);
  };

  const openEdit = (sectionKey, item) => {
    setEditingItem(item.raw);
    setActiveSection(sectionKey);
  };

  const closeForm = () => {
    setActiveSection(null);
    setEditingItem(null);
  };

  const handleSubmit = async (sectionKey, values) => {
    if (editingItem) {
      await updateRecord(sectionKey, editingItem.id, values);
    } else {
      await insertRecord(sectionKey, values);
    }
    await loadSection(sectionKey);
    closeForm();
  };

  // Optimistically remove the item and delay the actual API call so the
  // Snackbar's "Undo" can cancel it outright — mirrors the pattern already
  // used for routine tasks in scenes/routine/index.jsx.
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
        loadSection(sectionKey); // resync with the server if the delete failed
      }
      setPendingUndo((cur) => (cur && cur.item.id === item.id ? null : cur));
    }, UNDO_WINDOW_MS);

    setPendingUndo({ sectionKey, item, timeoutId });
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
          ? "Already reset for today."
          : `Reset complete — ${result.tasksLoaded} task(s) loaded for today.`
      );
      await loadSection("routine");
    } catch (err) {
      setResetMessage(err.message || "Reset failed — please try again.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <Box m={{ xs: "0px", sm: "20px" }}>
      <Header title="HOME" subtitle="Welcome back!" />

      <Box
        display="grid"
        gridTemplateColumns={{ xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }}
        gridAutoRows="minmax(240px, auto)"
        gap="20px"
        mt="10px"
      >
        {SECTION_KEYS.map((sectionKey) => {
          const config = sectionFields[sectionKey];
          const filterState = filtersBySection[sectionKey] || {};
          const filterableFields = config.dashboardFilter ? getFilterableFields(config) : [];
          return (
            <Box
              key={sectionKey}
              display="flex"
              flexDirection="column"
              sx={{ minWidth: 0 /* CRITICAL: prevents CSS grid item from stretching beyond screen width */ }}
            >
              {config.dashboardFilter && (
                <Box display="flex" flexWrap="wrap" gap="6px" mb="8px">
                  <Select
                    size="small"
                    value={filterState.rangeDays ?? config.dashboardFilter.defaultRangeDays ?? 0}
                    onChange={(e) => setSectionFilter(sectionKey, "rangeDays", Number(e.target.value))}
                    sx={{ minWidth: 130, fontSize: "0.8rem", color: colors.grey[100] }}
                  >
                    {DATE_RANGE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: "0.8rem" }}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {filterableFields.map((field) => (
                    <Select
                      key={field.name}
                      size="small"
                      displayEmpty
                      value={filterState[field.name] || ""}
                      onChange={(e) => setSectionFilter(sectionKey, field.name, e.target.value)}
                      sx={{ minWidth: 110, fontSize: "0.8rem", color: colors.grey[100] }}
                    >
                      <MenuItem value="" sx={{ fontSize: "0.8rem" }}>
                        All {field.label}
                      </MenuItem>
                      {(typeof field.options === "function" ? field.options({}) : field.options || []).map(
                        (opt) => {
                          const optValue = typeof opt === "object" ? opt.value : opt;
                          const optLabel = typeof opt === "object" ? opt.label : opt;
                          return (
                            <MenuItem key={optValue} value={optValue} sx={{ fontSize: "0.8rem" }}>
                              {optLabel}
                            </MenuItem>
                          );
                        }
                      )}
                    </Select>
                  ))}
                </Box>
              )}
              <Box position="relative" flex={1} minHeight={0}>
                <DashboardSection
                  title={config.label}
                  icon={config.icon}
                  items={displayItemsBySection[sectionKey] || []}
                  emptyMessage={config.emptyMessage}
                  viewAllLink={config.viewAllLink}
                  onEditRequest={(item) => openEdit(sectionKey, item)}
                  onDeleteRequest={(item) => queueDelete(sectionKey, item)}
                />
                <IconButton
                  onClick={() => openAdd(sectionKey)}
                  size="small"
                  sx={{ position: "absolute", top: 12, right: config.viewAllLink ? 90 : 12 }}
                  aria-label={`Add ${config.label}`}
                >
                  <AddCircleOutlineIcon sx={{ color: colors.greenAccent[500] }} />
                </IconButton>
                {sectionKey === "routine" && (
                  <IconButton
                    onClick={handleDailyReset}
                    disabled={resetting}
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 12,
                      right: (config.viewAllLink ? 90 : 12) + 40,
                    }}
                    aria-label="Reset today's routine"
                    title="Reset today's routine"
                  >
                    <RestartAltIcon sx={{ color: colors.grey[300], opacity: resetting ? 0.4 : 1 }} />
                  </IconButton>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Modal open={Boolean(activeSection)} onClose={closeForm}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: 420 },
            bgcolor: colors.primary[400],
            borderRadius: "4px",
            p: "24px",
            maxHeight: "90vh",
            overflowY: "auto",

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
        onClose={() => setResetMessage("")}
      />

      <Snackbar
        open={!!pendingUndo}
        message={pendingUndo ? `${pendingUndo.item.primary || "Item"} deleted` : ""}
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
