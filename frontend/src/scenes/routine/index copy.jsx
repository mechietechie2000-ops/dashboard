import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Snackbar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  useTheme,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import VolumeOffOutlinedIcon from "@mui/icons-material/VolumeOffOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import SnoozeOutlinedIcon from "@mui/icons-material/SnoozeOutlined";
import RecordVoiceOverOutlinedIcon from "@mui/icons-material/RecordVoiceOverOutlined";
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import { tokens } from "../../theme";

const SKIP_REASONS = ["lazy", "tired", "office work", "guest", "outdoor", "no reason"];
const UNDO_WINDOW_MS = 4500;
const SWIPE_THRESHOLD = 90;

// TODO: wire this up to the Web Speech API + a Bluetooth output target once
// the announce feature moves past placeholder status.
function announceTask(taskName) {
  console.log(`[announce placeholder] would speak: "${taskName}"`);
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json();
}

const RoutineTaskRow = ({ task, onDone, onSkipRequest, onToggleMute, onToggleAnnounce, onSnooze, colors }) => {
  const [dragX, setDragX] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);

  const onPointerDown = (e) => {
    dragging.current = true;
    startX.current = (e.touches ? e.touches[0].clientX : e.clientX);
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    setDragX(x - startX.current);
  };
  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragX > SWIPE_THRESHOLD) {
      onDone(task);
    } else if (dragX < -SWIPE_THRESHOLD) {
      onSkipRequest(task);
    }
    setDragX(0);
  };

  const sunk = task.mute || task.isSnoozed;

  return (
    <Box sx={{ position: "relative", mb: "10px", overflow: "hidden", borderRadius: "10px" }}>
      {/* Swipe backgrounds */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: dragX > 0 ? "flex-start" : "flex-end",
          alignItems: "center",
          px: 3,
          backgroundColor: dragX > 0 ? colors.greenAccent[600] : colors.redAccent[500],
          opacity: Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1),
        }}
      >
        {dragX > 0 ? <CheckCircleIcon /> : <CloseIcon />}
      </Box>

      <Box
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
        sx={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          p: "14px 16px",
          borderRadius: "10px",
          backgroundColor: colors.primary[400],
          transform: `translateX(${dragX}px)`,
          transition: dragging.current ? "none" : "transform 0.2s ease",
          opacity: sunk ? 0.55 : 1,
          cursor: "grab",
          userSelect: "none",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: "50%",
              backgroundColor: colors.blueAccent[600],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              color: "#fff",
            }}
          >
            {task.person?.[0]?.toUpperCase() || "?"}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" fontWeight="600" noWrap>
              {task.task_name}
            </Typography>
            <Typography variant="body2" color={colors.grey[300]}>
              {task.task_time} &middot; {task.person}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0 }}>
          <IconButton size="small" onClick={() => onToggleAnnounce(task)} title="Announce (TTS)">
            <RecordVoiceOverOutlinedIcon
              fontSize="small"
              sx={{ color: task.announce ? colors.blueAccent[400] : colors.grey[500] }}
            />
          </IconButton>
          <IconButton size="small" onClick={() => onSnooze(task)} title="Snooze 10 min">
            <SnoozeOutlinedIcon
              fontSize="small"
              sx={{ color: task.isSnoozed ? colors.blueAccent[400] : colors.grey[500] }}
            />
          </IconButton>
          <IconButton size="small" onClick={() => onToggleMute(task)} title="Mute">
            {task.mute ? (
              <VolumeOffOutlinedIcon fontSize="small" sx={{ color: colors.redAccent[400] }} />
            ) : (
              <VolumeUpOutlinedIcon fontSize="small" sx={{ color: colors.grey[500] }} />
            )}
          </IconButton>
          <IconButton size="small" onClick={() => onDone(task)} title="Mark done">
            <CheckCircleOutlineIcon fontSize="small" sx={{ color: colors.greenAccent[400] }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

const RoutineModule = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [tasks, setTasks] = useState([]);
  const [totalToday, setTotalToday] = useState(null);
  const [doneCount, setDoneCount] = useState(0);
  const [streaks, setStreaks] = useState({});
  const [skipTarget, setSkipTarget] = useState(null);
  const [skipReason, setSkipReason] = useState("");
  const [pendingUndo, setPendingUndo] = useState(null); // { task, action, timeoutId }

  const loadTasks = async () => {
    const rows = await api("/api/routine/today");
    setTasks(rows);
    setTotalToday((prev) => (prev === null ? rows.length : prev));

    const people = [...new Set(rows.map((r) => r.person))];
    const entries = await Promise.all(
      people.map(async (p) => [p, (await api(`/api/routine/streak/${encodeURIComponent(p)}`)).streak])
    );
    setStreaks(Object.fromEntries(entries));
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const commitPending = (pending) => {
    const { task, action } = pending;
    const call =
      action === "done"
        ? api(`/api/routine/today/${task.temp_id}/done`, { method: "POST" })
        : api(`/api/routine/today/${task.temp_id}/skip`, {
            method: "POST",
            body: JSON.stringify({ reason: pending.reason }),
          });
    call.catch(() => loadTasks()); // resync on failure
  };

  const queueRemoval = (task, action, reason) => {
    setTasks((prev) => prev.filter((t) => t.temp_id !== task.temp_id));
    if (action === "done") setDoneCount((c) => c + 1);

    const timeoutId = setTimeout(() => {
      commitPending({ task, action, reason });
      setPendingUndo((cur) => (cur && cur.task.temp_id === task.temp_id ? null : cur));
    }, UNDO_WINDOW_MS);

    setPendingUndo({ task, action, reason, timeoutId });
  };

  const handleDone = (task) => queueRemoval(task, "done");

  const handleSkipRequest = (task) => {
    setSkipTarget(task);
    setSkipReason("");
  };
  const confirmSkip = () => {
    if (!skipReason) return;
    queueRemoval(skipTarget, "skipped", skipReason);
    setSkipTarget(null);
  };

  const handleUndo = () => {
    if (!pendingUndo) return;
    clearTimeout(pendingUndo.timeoutId);
    setTasks((prev) => [...prev, pendingUndo.task].sort((a, b) => a.task_time.localeCompare(b.task_time)));
    if (pendingUndo.action === "done") setDoneCount((c) => Math.max(0, c - 1));
    setPendingUndo(null);
  };

  const handleToggleMute = async (task) => {
    await api(`/api/routine/today/${task.temp_id}/mute`, { method: "POST" });
    loadTasks();
  };
  const handleToggleAnnounce = async (task) => {
    if (!task.announce) announceTask(task.task_name);
    await api(`/api/routine/today/${task.temp_id}/announce`, { method: "POST" });
    loadTasks();
  };
  const handleSnooze = async (task) => {
    await api(`/api/routine/today/${task.temp_id}/snooze`, {
      method: "POST",
      body: JSON.stringify({ minutes: 10 }),
    });
    loadTasks();
  };

  const progressPct = totalToday ? Math.round((doneCount / totalToday) * 100) : 0;

  return (
    <Box m="20px">
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb="20px">
        <Box>
          <Typography variant="h2" fontWeight="bold">
            Today's Routine
          </Typography>
          <Typography variant="body1" color={colors.grey[300]}>
            {doneCount} of {totalToday ?? tasks.length} done &middot; {progressPct}%
          </Typography>
        </Box>

        <Box display="flex" gap="10px" flexWrap="wrap">
          {Object.entries(streaks).map(([person, streak]) => (
            <Chip
              key={person}
              icon={<LocalFireDepartmentOutlinedIcon sx={{ color: colors.redAccent[400] + " !important" }} />}
              label={`${person}: ${streak}d`}
              sx={{ backgroundColor: colors.primary[400], color: colors.grey[100], fontWeight: 600 }}
            />
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.primary[400],
          overflow: "hidden",
          mb: "24px",
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${progressPct}%`,
            backgroundColor: colors.greenAccent[500],
            transition: "width 0.4s ease",
          }}
        />
      </Box>

      {tasks.length === 0 && (
        <Typography color={colors.grey[300]}>
          Nothing left for today. Run the daily reset, or check back tomorrow.
        </Typography>
      )}

      {tasks.map((task) => (
        <RoutineTaskRow
          key={task.temp_id}
          task={task}
          colors={colors}
          onDone={handleDone}
          onSkipRequest={handleSkipRequest}
          onToggleMute={handleToggleMute}
          onToggleAnnounce={handleToggleAnnounce}
          onSnooze={handleSnooze}
        />
      ))}

      {/* Skip reason dialog */}
      <Dialog open={!!skipTarget} onClose={() => setSkipTarget(null)}>
        <DialogTitle>Why skip "{skipTarget?.task_name}"?</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1, minWidth: 260 }}>
            <InputLabel id="skip-reason-label">Reason</InputLabel>
            <Select
              labelId="skip-reason-label"
              value={skipReason}
              label="Reason"
              onChange={(e) => setSkipReason(e.target.value)}
            >
              {SKIP_REASONS.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSkipTarget(null)}>Cancel</Button>
          <Button variant="contained" color="error" disabled={!skipReason} onClick={confirmSkip}>
            Skip
          </Button>
        </DialogActions>
      </Dialog>

      {/* Undo snackbar */}
      <Snackbar
        open={!!pendingUndo}
        message={pendingUndo ? `${pendingUndo.task.task_name} marked ${pendingUndo.action}` : ""}
        action={
          <Button color="secondary" size="small" onClick={handleUndo}>
            Undo
          </Button>
        }
        autoHideDuration={UNDO_WINDOW_MS}
      />
    </Box>
  );
};

export default RoutineModule;
