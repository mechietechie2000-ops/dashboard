import { useEffect, useState, useCallback } from "react";
import { Box, Button, IconButton, Modal, Snackbar, useTheme } from "@mui/material";
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
];

const UNDO_WINDOW_MS = 4500;

const HomeDashboard = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [itemsBySection, setItemsBySection] = useState({});
  const [activeSection, setActiveSection] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // raw row being edited, or null when adding
  const [pendingUndo, setPendingUndo] = useState(null); // { sectionKey, item, timeoutId }
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

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
          return (
            <Box key={sectionKey} position="relative"sx={{ minWidth: 0, // CRITICAL: Prevents CSS Grid item from stretching beyond screen width 
              }}
            >
              <DashboardSection
                title={config.label}
                icon={config.icon}
                items={itemsBySection[sectionKey] || []}
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
