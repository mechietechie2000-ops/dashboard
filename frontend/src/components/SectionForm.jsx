import { useState, useEffect } from "react";
import { Box, Button, Checkbox, FormControlLabel, MenuItem, TextField } from "@mui/material";
import sectionFields from "../config/sectionFields";

// Fetch source registry for "asyncSelect" fields — keyed by field.source.
// Mirrors the fetch pattern already used in scenes/digiLocker/digiLocker.jsx
// for the same /api/family-members endpoint.
const ASYNC_OPTION_SOURCES = {
  familyMembers: () =>
    fetch("/api/family-members", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load family members"))))
      .then((rows) =>
        (rows || []).map((m) => ({
          value: String(m.id),
          label: [m.first_name, m.last_name].filter(Boolean).join(" "),
        }))
      ),
};

// A field can depend on other field(s) being set to a particular value —
// used to show/hide category-specific inputs (e.g. only show "License Plate"
// when category === "insurance" && subcategory === "auto"). `dependsOn` can
// be a single condition or an array of conditions (all must match).
// Condition shape: { field: "category", value: "insurance" } or
// { field: "category", in: ["insurance", "subscription"] }.
const isFieldVisible = (field, values) => {
  if (!field.dependsOn) return true;
  const conditions = Array.isArray(field.dependsOn) ? field.dependsOn : [field.dependsOn];
  return conditions.every((cond) => {
    const current = values[cond.field];
    if (cond.in) return cond.in.includes(current);
    return current === cond.value;
  });
};

// `options` on a select field can be a static array or a function of the
// current form values (e.g. subcategory options that depend on category).
const resolveOptions = (field, values) =>
  typeof field.options === "function" ? field.options(values) || [] : field.options || [];

/**
 * One reusable form for every Home Dashboard section. Which inputs render,
 * which are required, and where the data ends up are all driven by
 * config/sectionFields.js — this component has no per-section logic.
 *
 * Two config options beyond the basics support category-driven sections
 * like Renewals: `dependsOn` (conditionally show a field) and `packInto`
 * (group a set of fields into one nested JSON object on submit, e.g. all
 * category-specific fields collapse into `attributes`).
 */
const SectionForm = ({ sectionKey, onSubmit, onCancel }) => {
  const config = sectionFields[sectionKey];
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [asyncOptions, setAsyncOptions] = useState({});
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!config) return;
    config.fields
      .filter((field) => field.type === "asyncSelect" && field.source)
      .forEach((field) => {
        const load = ASYNC_OPTION_SOURCES[field.source];
        if (!load) return;
        load()
          .then((opts) => setAsyncOptions((prev) => ({ ...prev, [field.name]: opts })))
          .catch(() => setAsyncOptions((prev) => ({ ...prev, [field.name]: [] })));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey]);

  if (!config) return null;

  const handleChange = (name) => (e) => {
    setValues((prev) => ({ ...prev, [name]: e.target.value }));
  };

  const handleCheckboxChange = (name) => (e) => {
    setValues((prev) => ({ ...prev, [name]: e.target.checked ? 1 : 0 }));
  };

  const validate = () => {
    const nextErrors = {};
    for (const field of config.fields) {
      if (!isFieldVisible(field, values)) continue;
      if (field.required && !values[field.name]) {
        nextErrors[field.name] = `${field.label} is required`;
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Fields with `packInto: "attributes"` collapse into a single nested
  // object under that key (only currently-visible ones), everything else
  // is sent flat. Hidden fields (e.g. attribute inputs for a category the
  // user didn't pick) are dropped entirely rather than sent as stale values.
  const buildPayload = () => {
    const payload = {};
    for (const field of config.fields) {
      if (!isFieldVisible(field, values)) continue;
      const value = values[field.name];
      if (value === undefined || value === "") continue;
      if (field.packInto) {
        payload[field.packInto] = { ...(payload[field.packInto] || {}), [field.name]: value };
      } else {
        payload[field.name] = value;
      }
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(sectionKey, buildPayload());
      setValues({});
    } catch (err) {
      setSubmitError(err.message || "Something went wrong saving this — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap="16px">
      {config.fields.map((field) => {
        if (!isFieldVisible(field, values)) return null;

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
              {resolveOptions(field, values).map((opt) => {
                const optValue = typeof opt === "object" ? opt.value : opt;
                const optLabel = typeof opt === "object" ? opt.label : opt;
                return (
                  <MenuItem key={optValue} value={optValue}>
                    {optLabel}
                  </MenuItem>
                );
              })}
            </TextField>
          );
        }

        if (field.type === "asyncSelect") {
          const opts = asyncOptions[field.name] || [];
          return (
            <TextField {...common} select disabled={opts.length === 0}>
              {opts.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          );
        }

        if (field.type === "checkbox") {
          return (
            <FormControlLabel
              key={field.name}
              control={
                <Checkbox
                  checked={Boolean(values[field.name])}
                  onChange={handleCheckboxChange(field.name)}
                />
              }
              label={field.label}
            />
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

      {submitError && (
        <Box sx={{ color: "error.main", fontSize: "0.85rem" }}>{submitError}</Box>
      )}

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
