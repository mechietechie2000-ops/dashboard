import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VolumeOffOutlinedIcon from "@mui/icons-material/VolumeOffOutlined";
import VolumeUpOutlinedIcon from "@mui/icons-material/VolumeUpOutlined";
import RecordVoiceOverOutlinedIcon from "@mui/icons-material/RecordVoiceOverOutlined";
import { tokens } from "../../theme";

const INITIAL_FORM = {
  task_name: "",
  person: "",
  frequency: "daily",
  day_of_week: "Monday",
  task_time: "08:00",
  mute: false,
  announce: false,
};

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`Request failed: ${path}`);
  return res.json();
}

const RoutineAdmin = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [routines, setRoutines] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const loadRoutines = async () => {
    try {
      const data = await api("/api/routine");
      setRoutines(data);
    } catch (err) {
      console.error("Failed to fetch routines", err);
    }
  };

  useEffect(() => {
    loadRoutines();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setOpenDialog(true);
  };

  const handleOpenEdit = (routine) => {
    setEditingId(routine.id);
    setFormData({
      task_name: routine.task_name || "",
      person: routine.person || "",
      frequency: routine.frequency || "daily",
      day_of_week: routine.day_of_week || "Monday",
      task_time: routine.task_time || "08:00",
      mute: Boolean(routine.mute),
      announce: Boolean(routine.announce),
    });
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
  };

  const handleSave = async () => {
    if (!formData.task_name || !formData.person) return;

    if (editingId) {
      await api(`/api/routine/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
    } else {
      await api("/api/routine", {
        method: "POST",
        body: JSON.stringify(formData),
      });
    }

    setOpenDialog(false);
    loadRoutines();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      await api(`/api/routine/${id}`, { method: "DELETE" });
      loadRoutines();
    }
  };

  return (
    <Box m="20px">
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb="20px">
        <Box>
          <Typography variant="h2" fontWeight="bold" color={colors.grey[100]}>
            Admin Routine Page
          </Typography>
          <Typography variant="h5" color={colors.greenAccent[500]}>
            Manage routine master templates
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{
            backgroundColor: colors.blueAccent[600],
            color: "#fff",
            fontWeight: "bold",
            "&:hover": { backgroundColor: colors.blueAccent[700] },
          }}
        >
          Add
        </Button>
      </Box>

      {/* TABLE */}
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: colors.primary[400],
          backgroundImage: "none",
          borderRadius: "10px",
          boxShadow: "none",
        }}
      >
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ backgroundColor: colors.blueAccent[700] }}>
            <TableRow>
              <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Task Name</TableCell>
              <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Person</TableCell>
              <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Frequency</TableCell>
              <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Day of Week</TableCell>
              <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Time</TableCell>
              <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Mute</TableCell>
              <TableCell sx={{ color: colors.grey[100], fontWeight: "bold" }}>Announce</TableCell>
              <TableCell align="right" sx={{ color: colors.grey[100], fontWeight: "bold" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {routines.map((row) => (
              <TableRow
                key={row.id}
                sx={{
                  "&:last-child td, &:last-child th": { border: 0 },
                  borderColor: colors.primary[500],
                }}
              >
                <TableCell sx={{ color: colors.grey[100], fontWeight: "600" }}>{row.task_name}</TableCell>
                <TableCell sx={{ color: colors.grey[200] }}>{row.person}</TableCell>
                <TableCell sx={{ color: colors.grey[200], textTransform: "capitalize" }}>{row.frequency}</TableCell>
                <TableCell sx={{ color: colors.grey[200] }}>
                  {row.frequency === "weekly" ? row.day_of_week : "—"}
                </TableCell>
                <TableCell sx={{ color: colors.grey[200] }}>{row.task_time}</TableCell>
                <TableCell>
                  {row.mute ? (
                    <VolumeOffOutlinedIcon fontSize="small" sx={{ color: colors.redAccent[400] }} />
                  ) : (
                    <VolumeUpOutlinedIcon fontSize="small" sx={{ color: colors.grey[500] }} />
                  )}
                </TableCell>
                <TableCell>
                  <RecordVoiceOverOutlinedIcon
                    fontSize="small"
                    sx={{ color: row.announce ? colors.blueAccent[400] : colors.grey[500] }}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenEdit(row)} title="Edit">
                    <EditIcon fontSize="small" sx={{ color: colors.blueAccent[400] }} />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(row.id)} title="Delete">
                    <DeleteIcon fontSize="small" sx={{ color: colors.redAccent[400] }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {routines.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ color: colors.grey[300], py: 4 }}>
                  No routine templates found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ADD / EDIT DIALOG */}
      <Dialog
        open={openDialog}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            backgroundColor: colors.primary[400],
            color: colors.grey[100],
            backgroundImage: "none",
            borderRadius: "10px",
          },
        }}
      >
        <DialogTitle variant="h3" fontWeight="bold" sx={{ color: colors.grey[100] }}>
          {editingId ? "Edit Task" : "Add Task"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
          <TextField
            label="Task Name"
            variant="outlined"
            fullWidth
            required
            value={formData.task_name}
            onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
            sx={{
                // 1. Unfocused / Default state for regular & required fields
                "& .MuiInputLabel-root": { 
                    //color: `${colors.grey[300]} !important` 
                    color: `#ffffff !important` 
                },
                // 2. Focused / Shrunken floating label state (forces green text & primary background)
                "& .MuiInputLabel-root.MuiInputLabel-shrink": {
                    color: `${colors.greenAccent[400]} !important`,
                    backgroundColor: colors.primary[400],
                    transform: "translate(12px, -12px) scale(0.70) !important",
                    px: "6px",
                    zIndex: 1,
                },
                // 3. Make sure the asterisk (*) matches the label color
                "& .MuiInputLabel-asterisk": {
                    color: `${colors.greenAccent[400]} !important`,
                },
                // 4. Input border & typed text styles
                "& .MuiOutlinedInput-root": {
                    color: colors.grey[100],                         // Text color while typing inside input
                    "& fieldset": { borderColor: colors.grey[500] },
                    "&:hover fieldset": { borderColor: colors.greenAccent[500] },
                    "&.Mui-focused fieldset": { borderColor: colors.greenAccent[500] },
                },
            }}
         />

          <TextField
            label="Person"
            variant="outlined"
            fullWidth
            required
            value={formData.person}
            onChange={(e) => setFormData({ ...formData, person: e.target.value })}
            sx={{
                "& .MuiInputLabel-root": { color: colors.grey[300] },
                // TARGET BOTH SHRINK AND FOCUSED STATES:
                "& .MuiInputLabel-root.MuiInputLabel-shrink, & .MuiInputLabel-root.Mui-focused": {
                    //color: `${colors.greenAccent[300]} !important`, // Bright readable color
                    color: `${colors.blueAccent[300]} !important`,
                    backgroundColor: colors.primary[400],           // Solid background behind label
                    transform: "translate(12px, -12px) scale(0.70) !important", // Preset 3 positioning
                    px: "6px",
                    zIndex: 1,                                      // Keeps text above input container
                },
                "& .MuiOutlinedInput-root": {
                    color: colors.grey[100],                         // Text color while typing inside input
                    "& fieldset": { borderColor: colors.grey[500] },
                    "&:hover fieldset": { borderColor: colors.greenAccent[500] },
                    "&.Mui-focused fieldset": { borderColor: colors.greenAccent[500] },
                },
            }}
          />

          <Box display="flex" gap={2} flexWrap="wrap">
            <FormControl component="fieldset">
              <FormLabel sx={{ color: colors.grey[300], fontSize: "0.85rem", mb: 0.5 }}>Frequency</FormLabel>
              <RadioGroup
                row
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              >
                <FormControlLabel value="daily" control={<Radio color="secondary" />} label="Daily" />
                <FormControlLabel value="weekly" control={<Radio color="secondary" />} label="Weekly" />
              </RadioGroup>
            </FormControl>

            <TextField
              label="Time"
              type="time"
              value={formData.task_time}
              onChange={(e) => setFormData({ ...formData, task_time: e.target.value })}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 300 }}
              sx={{
                width: 140,
                "& .MuiInputLabel-root": { color: colors.grey[300] },
                "& .MuiOutlinedInput-root": {
                  color: colors.grey[100],
                  "& fieldset": { borderColor: colors.grey[500] },
                },
              }}
            />
          </Box>

          {formData.frequency === "weekly" && (
            <FormControl fullWidth>
              <InputLabel id="day-of-week-label" sx={{ color: colors.grey[300] }}>
                Day of Week
              </InputLabel>
              <Select
                labelId="day-of-week-label"
                value={formData.day_of_week}
                label="Day of Week"
                onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                sx={{
                  color: colors.grey[100],
                  "& .MuiOutlinedInput-notchedOutline": { borderColor: colors.grey[500] },
                }}
              >
                {DAYS_OF_WEEK.map((day) => (
                  <MenuItem key={day} value={day}>
                    {day}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box display="flex" gap={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.mute}
                  onChange={(e) => setFormData({ ...formData, mute: e.target.checked })}
                  color="error"
                />
              }
              label="Mute"
              sx={{ color: colors.grey[200] }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.announce}
                  onChange={(e) => setFormData({ ...formData, announce: e.target.checked })}
                  color="secondary"
                />
              }
              label="Announce (TTS)"
              sx={{ color: colors.grey[200] }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleClose} sx={{ color: colors.grey[300] }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              backgroundColor: colors.greenAccent[600],
              color: colors.grey[100],
              fontWeight: "bold",
              "&:hover": { backgroundColor: colors.greenAccent[700] },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoutineAdmin;