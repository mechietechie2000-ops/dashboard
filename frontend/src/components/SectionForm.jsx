import { useState } from "react";
import { Box, Button, MenuItem, TextField } from "@mui/material";
import sectionFields from "../config/sectionFields";

/**
 * One reusable form for every Home Dashboard section. Which inputs render,
 * which are required, and where the data ends up are all driven by
 * config/sectionFields.js — this component has no per-section logic.
 */
const SectionForm = ({ sectionKey, onSubmit, onCancel }) => {
  const config = sectionFields[sectionKey];
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!config) return null;

  const handleChange = (name) => (e) => {
    setValues((prev) => ({ ...prev, [name]: e.target.value }));
  };

  const validate = () => {
    const nextErrors = {};
    for (const field of config.fields) {
      if (field.required && !values[field.name]) {
        nextErrors[field.name] = `${field.label} is required`;
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(sectionKey, values);
      setValues({});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap="16px">
      {config.fields.map((field) => {
        const common = {
          key: field.name,
          label: field.label,
          value: values[field.name] ?? "",
          onChange: handleChange(field.name),
          error: Boolean(errors[field.name]),
          helperText: errors[field.name],
          fullWidth: true,
        };

        if (field.type === "select") {
          return (
            <TextField {...common} select>
              {(field.options || []).map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          );
        }

        if (field.type === "textarea") {
          return <TextField {...common} multiline minRows={3} />;
        }

        if (field.type === "date") {
          return <TextField {...common} type="date" InputLabelProps={{ shrink: true }} />;
        }

        if (field.type === "datetime") {
          return (
            <TextField
              {...common}
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
            />
          );
        }

        if (field.type === "number") {
          return <TextField {...common} type="number" />;
        }

        return <TextField {...common} type="text" />;
      })}

      <Box display="flex" gap="10px" justifyContent="flex-end">
        {onCancel && (
          <Button onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? "Saving..." : "Save"}
        </Button>
      </Box>
    </Box>
  );
};

export default SectionForm;
