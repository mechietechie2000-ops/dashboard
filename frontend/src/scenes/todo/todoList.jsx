import React, { useState, useMemo } from "react";
import { insertRecord } from "../../data/sectionRepository";
import { mapTaskPayloadToRow } from "../../utils/addTaskPayloadMapper";

const CATEGORIES = [
  { key: "birthday", label: "Birthday" },
  { key: "anniversary", label: "Anniversary" },
  { key: "appointment", label: "Appointment" },
  { key: "homeMaintenance", label: "Home Maintenance" },
  { key: "kids", label: "Kids" },
  { key: "banking", label: "Banking" },
  { key: "investment", label: "Investment" },
  { key: "learning", label: "Learning" },
  { key: "vacation", label: "Vacation" },
];

const REPEAT_OPTIONS = ["none", "daily", "weekly", "monthly", "yearly"];
const REMINDER_UNITS = ["minutes", "hours", "days", "weeks"];
const ANNIVERSARY_TYPES = ["Wedding", "Work", "Personal", "Other"];
const HOME_AREAS = ["HVAC", "Plumbing", "Electrical", "Roof", "Garden", "General"];
const KIDS_TYPES = ["School", "Activity", "Health", "Event", "Paperwork", "Other"];
const INVESTMENT_ACTIONS = ["Review", "Research", "Buy", "Sell", "Contribute", "Rebalance"];

const emptyDetailsByCategory = {
  birthday: { relatedPerson: "", repeatFrequency: "yearly" },
  anniversary: { anniversaryType: "Wedding", repeatFrequency: "yearly" },
  appointment: { provider: "", locationOrUrl: "", durationMinutes: "" },
  homeMaintenance: { area: "HVAC", serviceProvider: "", repeatFrequency: "none" },
  kids: { childName: "", type: "School", location: "" },
  banking: { institution: "", accountNickname: "", amount: "", repeatFrequency: "none" },
  investment: { institution: "", action: "Review", amount: "" },
  learning: { courseOrSubject: "", resourceUrl: "", estimatedDurationMinutes: "" },
  vacation: { destination: "", startDate: "", endDate: "" },
};

const initialCommon = {
  title: "",
  relatedPerson: "",
  date: "",
  time: "",
  description: "",
  reminderEnabled: false,
  reminderValue: "",
  reminderUnit: "minutes",
};

const styles = {
  wrapper: {
    maxWidth: 900,
    margin: "0 auto",
    padding: 24,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: "#1f2430",
    backgroundColor: "#ffffff",
    borderRadius: 12,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  fieldset: {
    border: "1px solid #dfe3ea",
    borderRadius: 10,
    padding: 20,
    margin: 0,
  },
  legend: {
    fontWeight: 600,
    fontSize: 16,
    padding: "0 8px",
  },
  categoryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
  },
  categoryGridSmall: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  },
  categoryOption: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #dfe3ea",
    cursor: "pointer",
    transition: "border-color 0.15s ease, background-color 0.15s ease",
  },
  categoryOptionSelected: {
    borderColor: "#4c6ef5",
    backgroundColor: "#eef1ff",
  },
  twoColGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  twoColGridSmall: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
  },
  input: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #c7cdd6",
    fontSize: 14,
    backgroundColor: "#ffffff",
    color: "#1f2430",
  },
  inputError: {
    borderColor: "#e03131",
  },
  select: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #c7cdd6",
    fontSize: 14,
    backgroundColor: "#fff",
    color: "#1f2430",
  },
  textarea: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #c7cdd6",
    fontSize: 14,
    minHeight: 80,
    resize: "vertical",
    backgroundColor: "#ffffff",
    color: "#1f2430",    
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    color: "#e03131",
    fontSize: 13,
    marginTop: 2,
  },
  helperText: {
    color: "#5c6370",
    fontSize: 13,
  },
  buttonRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  submitButton: {
    padding: "10px 20px",
    borderRadius: 6,
    border: "none",
    backgroundColor: "#4c6ef5",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  submitButtonDisabled: {
    backgroundColor: "#9fadf0",
    cursor: "not-allowed",
  },
  resetButton: {
    padding: "10px 20px",
    borderRadius: 6,
    border: "1px solid #c7cdd6",
    backgroundColor: "#fff",
    color: "#1f2430",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  reminderBox: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#f7f8fa",
    border: "1px solid #e5e8ee",
  },
  reminderRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 12,
    flexWrap: "wrap",
  },
  payloadBox: {
    marginTop: 8,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#0f1117",
    color: "#d7e0ff",
    fontFamily: "Menlo, Consolas, monospace",
    fontSize: 13,
    overflowX: "auto",
    whiteSpace: "pre",
  },
  formErrorsBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff5f5",
    border: "1px solid #ffc9c9",
    color: "#c92a2a",
    fontSize: 14,
  },
  submitErrorBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff5f5",
    border: "1px solid #ffc9c9",
    color: "#c92a2a",
    fontSize: 14,
  },
  submitSuccessBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ebfbee",
    border: "1px solid #b2f2bb",
    color: "#2b8a3e",
    fontSize: 14,
  },
};

function useIsSmallScreen() {
  const [isSmall, setIsSmall] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );

  React.useEffect(() => {
    const handleResize = () => setIsSmall(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isSmall;
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <span style={styles.errorText} role="alert">
      {message}
    </span>
  );
}

export default function TodoList({ onSubmit }) {
  const [category, setCategory] = useState("");
  const [common, setCommon] = useState(initialCommon);
  const [details, setDetails] = useState({});
  const [errors, setErrors] = useState({});
  const [payload, setPayload] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const isSmall = useIsSmallScreen();

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    setDetails(emptyDetailsByCategory[newCategory] || {});
    setErrors({});
    setPayload(null);
    setSubmitError("");
    setSubmitSuccess(false);
    // Vacation has no "time" field; clear it so stale values are not carried over
    if (newCategory === "vacation") {
      setCommon((prev) => ({ ...prev, time: "" }));
    }
  };

  const updateCommon = (field, value) => {
    setCommon((prev) => ({ ...prev, [field]: value }));
  };

  const updateDetail = (field, value) => {
    setDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setCategory("");
    setCommon(initialCommon);
    setDetails({});
    setErrors({});
    setPayload(null);
    setSubmitError("");
    setSubmitSuccess(false);
  };

  const isPositiveNumber = (value) => {
    if (value === "" || value === null || value === undefined) return false;
    const num = Number(value);
    return Number.isFinite(num) && num > 0;
  };

  const validate = useMemo(() => {
    return () => {
      const newErrors = {};

      if (!category) {
        newErrors.category = "Please select a task category.";
      }

      if (!common.title || !common.title.trim()) {
        newErrors.title = "Task title is required.";
      }

      if (common.reminderEnabled) {
        if (!isPositiveNumber(common.reminderValue)) {
          newErrors.reminderValue = "Reminder value must be a positive number.";
        }
      }

      if (category === "vacation") {
        if (details.startDate && details.endDate) {
          if (new Date(details.endDate) < new Date(details.startDate)) {
            newErrors.endDate = "End date cannot be earlier than the start date.";
          }
        }
      }

      if (category === "appointment") {
        if (
          details.durationMinutes !== "" &&
          details.durationMinutes !== undefined &&
          !isPositiveNumber(details.durationMinutes)
        ) {
          newErrors.durationMinutes = "Duration must be a positive number.";
        }
      }

      if (category === "learning") {
        if (
          details.estimatedDurationMinutes !== "" &&
          details.estimatedDurationMinutes !== undefined &&
          !isPositiveNumber(details.estimatedDurationMinutes)
        ) {
          newErrors.estimatedDurationMinutes =
            "Estimated duration must be a positive number.";
        }
      }

      return newErrors;
    };
  }, [category, common, details]);

  const buildPayload = () => {
    const base = {
      category,
      title: common.title.trim(),
    };

    if (common.date) base.date = common.date;
    if (category !== "vacation" && common.time) base.time = common.time;
    if (common.relatedPerson) base.relatedPerson = common.relatedPerson;
    if (common.description) base.description = common.description;

    if (common.reminderEnabled) {
      base.reminder = {
        value: Number(common.reminderValue),
        unit: common.reminderUnit,
      };
    }

    const categoryDetails = { ...details };

    // Normalize numeric fields inside details
    if (categoryDetails.durationMinutes !== undefined && categoryDetails.durationMinutes !== "") {
      categoryDetails.durationMinutes = Number(categoryDetails.durationMinutes);
    }
    if (
      categoryDetails.estimatedDurationMinutes !== undefined &&
      categoryDetails.estimatedDurationMinutes !== ""
    ) {
      categoryDetails.estimatedDurationMinutes = Number(
        categoryDetails.estimatedDurationMinutes
      );
    }
    if (categoryDetails.amount !== undefined && categoryDetails.amount !== "") {
      categoryDetails.amount = Number(categoryDetails.amount);
    }

    if (Object.keys(categoryDetails).length > 0) {
      base.details = categoryDetails;
    }

    return base;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    setSubmitError("");
    setSubmitSuccess(false);

    if (Object.keys(validationErrors).length > 0) {
      setPayload(null);
      return;
    }

    const newPayload = buildPayload();
    setPayload(newPayload);
    // eslint-disable-next-line no-console
    console.log("AddTaskForm payload:", newPayload);

    setIsSubmitting(true);
    try {
      // POST /api/sections/:category — category doubles as the sectionKey
      // (see backend/db/sectionConfig.js), so no extra mapping is needed
      // beyond flattening the payload into that table's columns.
      const row = mapTaskPayloadToRow(newPayload);
      await insertRecord(category, row);
      setSubmitSuccess(true);

      if (typeof onSubmit === "function") {
        onSubmit(newPayload);
      }
    } catch (err) {
      setSubmitError(err.message || "Failed to save the task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCategoryFields = () => {
    switch (category) {
      case "birthday":
        return (
          <div style={isSmall ? styles.twoColGridSmall : styles.twoColGrid}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="relatedPerson">
                Related person
              </label>
              <input
                id="relatedPerson"
                type="text"
                style={styles.input}
                value={details.relatedPerson || ""}
                onChange={(e) => updateDetail("relatedPerson", e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="repeatFrequency">
                Repeat frequency
              </label>
              <select
                id="repeatFrequency"
                style={styles.select}
                value={details.repeatFrequency || "yearly"}
                onChange={(e) => updateDetail("repeatFrequency", e.target.value)}
              >
                {REPEAT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case "anniversary":
        return (
          <div style={isSmall ? styles.twoColGridSmall : styles.twoColGrid}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="anniversaryType">
                Anniversary type
              </label>
              <select
                id="anniversaryType"
                style={styles.select}
                value={details.anniversaryType || "Wedding"}
                onChange={(e) => updateDetail("anniversaryType", e.target.value)}
              >
                {ANNIVERSARY_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="repeatFrequency">
                Repeat frequency
              </label>
              <select
                id="repeatFrequency"
                style={styles.select}
                value={details.repeatFrequency || "yearly"}
                onChange={(e) => updateDetail("repeatFrequency", e.target.value)}
              >
                {REPEAT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case "appointment":
        return (
          <div style={isSmall ? styles.twoColGridSmall : styles.twoColGrid}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="provider">
                Provider
              </label>
              <input
                id="provider"
                type="text"
                style={styles.input}
                value={details.provider || ""}
                onChange={(e) => updateDetail("provider", e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="locationOrUrl">
                Location or meeting URL
              </label>
              <input
                id="locationOrUrl"
                type="text"
                style={styles.input}
                value={details.locationOrUrl || ""}
                onChange={(e) => updateDetail("locationOrUrl", e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="durationMinutes">
                Duration (minutes)
              </label>
              <input
                id="durationMinutes"
                type="number"
                min="1"
                style={{
                  ...styles.input,
                  ...(errors.durationMinutes ? styles.inputError : {}),
                }}
                value={details.durationMinutes || ""}
                onChange={(e) => updateDetail("durationMinutes", e.target.value)}
              />
              <FieldError message={errors.durationMinutes} />
            </div>
          </div>
        );

      case "homeMaintenance":
        return (
          <div style={isSmall ? styles.twoColGridSmall : styles.twoColGrid}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="area">
                Area or appliance
              </label>
              <select
                id="area"
                style={styles.select}
                value={details.area || "HVAC"}
                onChange={(e) => updateDetail("area", e.target.value)}
              >
                {HOME_AREAS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="serviceProvider">
                Service provider
              </label>
              <input
                id="serviceProvider"
                type="text"
                style={styles.input}
                value={details.serviceProvider || ""}
                onChange={(e) => updateDetail("serviceProvider", e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="repeatFrequency">
                Repeat frequency
              </label>
              <select
                id="repeatFrequency"
                style={styles.select}
                value={details.repeatFrequency || "none"}
                onChange={(e) => updateDetail("repeatFrequency", e.target.value)}
              >
                {REPEAT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case "kids":
        return (
          <div style={isSmall ? styles.twoColGridSmall : styles.twoColGrid}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="childName">
                Child name
              </label>
              <input
                id="childName"
                type="text"
                style={styles.input}
                value={details.childName || ""}
                onChange={(e) => updateDetail("childName", e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="kidsType">
                Type
              </label>
              <select
                id="kidsType"
                style={styles.select}
                value={details.type || "School"}
                onChange={(e) => updateDetail("type", e.target.value)}
              >
                {KIDS_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="kidsLocation">
                Location
              </label>
              <input
                id="kidsLocation"
                type="text"
                style={styles.input}
                value={details.location || ""}
                onChange={(e) => updateDetail("location", e.target.value)}
              />
            </div>
          </div>
        );

      case "banking":
        return (
          <div style={isSmall ? styles.twoColGridSmall : styles.twoColGrid}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="institution">
                Institution
              </label>
              <input
                id="institution"
                type="text"
                style={styles.input}
                value={details.institution || ""}
                onChange={(e) => updateDetail("institution", e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="accountNickname">
                Account nickname
              </label>
              <input
                id="accountNickname"
                type="text"
                style={styles.input}
                value={details.accountNickname || ""}
                onChange={(e) => updateDetail("accountNickname", e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="bankingAmount">
                Amount
              </label>
              <input
                id="bankingAmount"
                type="number"
                style={styles.input}
                value={details.amount || ""}
                onChange={(e) => updateDetail("amount", e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="repeatFrequency">
                Repeat frequency
              </label>
              <select
                id="repeatFrequency"
                style={styles.select}
                value={details.repeatFrequency || "none"}
                onChange={(e) => updateDetail("repeatFrequency", e.target.value)}
              >
                {REPEAT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case "investment":
        return (
          <div style={isSmall ? styles.twoColGridSmall : styles.twoColGrid}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="investmentInstitution">
                Institution or platform
              </label>
              <input
                id="investmentInstitution"
                type="text"
                style={styles.input}
                value={details.institution || ""}
                onChange={(e) => updateDetail("institution", e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="investmentAction">
                Action
              </label>
              <select
                id="investmentAction"
                style={styles.select}
                value={details.action || "Review"}
                onChange={(e) => updateDetail("action", e.target.value)}
              >
                {INVESTMENT_ACTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="investmentAmount">
                Amount
              </label>
              <input
                id="investmentAmount"
                type="number"
                style={styles.input}
                value={details.amount || ""}
                onChange={(e) => updateDetail("amount", e.target.value)}
              />
            </div>
          </div>
        );

      case "learning":
        return (
          <div style={isSmall ? styles.twoColGridSmall : styles.twoColGrid}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="courseOrSubject">
                Course or subject
              </label>
              <input
                id="courseOrSubject"
                type="text"
                style={styles.input}
                value={details.courseOrSubject || ""}
                onChange={(e) => updateDetail("courseOrSubject", e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="resourceUrl">
                Resource URL
              </label>
              <input
                id="resourceUrl"
                type="text"
                style={styles.input}
                value={details.resourceUrl || ""}
                onChange={(e) => updateDetail("resourceUrl", e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="estimatedDurationMinutes">
                Estimated duration (minutes)
              </label>
              <input
                id="estimatedDurationMinutes"
                type="number"
                min="1"
                style={{
                  ...styles.input,
                  ...(errors.estimatedDurationMinutes ? styles.inputError : {}),
                }}
                value={details.estimatedDurationMinutes || ""}
                onChange={(e) =>
                  updateDetail("estimatedDurationMinutes", e.target.value)
                }
              />
              <FieldError message={errors.estimatedDurationMinutes} />
            </div>
          </div>
        );

      case "vacation":
        return (
          <div style={isSmall ? styles.twoColGridSmall : styles.twoColGrid}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="destination">
                Destination
              </label>
              <input
                id="destination"
                type="text"
                style={styles.input}
                value={details.destination || ""}
                onChange={(e) => updateDetail("destination", e.target.value)}
              />
            </div>
            <div />
            <div style={styles.field}>
              <label style={styles.label} htmlFor="startDate">
                Start date
              </label>
              <input
                id="startDate"
                type="date"
                style={styles.input}
                value={details.startDate || ""}
                onChange={(e) => updateDetail("startDate", e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="endDate">
                End date
              </label>
              <input
                id="endDate"
                type="date"
                style={{
                  ...styles.input,
                  ...(errors.endDate ? styles.inputError : {}),
                }}
                value={details.endDate || ""}
                onChange={(e) => updateDetail("endDate", e.target.value)}
              />
              <FieldError message={errors.endDate} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.wrapper}>
      <form style={styles.form} onSubmit={handleSubmit} noValidate>
        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>Task category</legend>
          <div style={isSmall ? styles.categoryGridSmall : styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const selected = category === cat.key;
              return (
                <label
                  key={cat.key}
                  htmlFor={`category-${cat.key}`}
                  style={{
                    ...styles.categoryOption,
                    ...(selected ? styles.categoryOptionSelected : {}),
                  }}
                >
                  <input
                    id={`category-${cat.key}`}
                    type="radio"
                    name="category"
                    value={cat.key}
                    checked={selected}
                    onChange={() => handleCategoryChange(cat.key)}
                  />
                  {cat.label}
                </label>
              );
            })}
          </div>
          <FieldError message={errors.category} />
        </fieldset>

        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>Task details</legend>
          <div style={isSmall ? styles.twoColGridSmall : styles.twoColGrid}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="title">
                Task title
              </label>
              <input
                id="title"
                type="text"
                style={{ ...styles.input, ...(errors.title ? styles.inputError : {}) }}
                value={common.title}
                onChange={(e) => updateCommon("title", e.target.value)}
                required
              />
              <FieldError message={errors.title} />
            </div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="relatedPersonCommon">
                Related person (optional)
              </label>
              <input
                id="relatedPersonCommon"
                type="text"
                style={styles.input}
                value={common.relatedPerson}
                onChange={(e) => updateCommon("relatedPerson", e.target.value)}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="date">
                Date (optional)
              </label>
              <input
                id="date"
                type="date"
                style={styles.input}
                value={common.date}
                onChange={(e) => updateCommon("date", e.target.value)}
              />
            </div>

            {category !== "vacation" && (
              <div style={styles.field}>
                <label style={styles.label} htmlFor="time">
                  Time (optional)
                </label>
                <input
                  id="time"
                  type="time"
                  style={styles.input}
                  value={common.time}
                  onChange={(e) => updateCommon("time", e.target.value)}
                />
              </div>
            )}

            <div style={{ ...styles.field, gridColumn: isSmall ? "auto" : "1 / -1" }}>
              <label style={styles.label} htmlFor="description">
                Description (optional)
              </label>
              <textarea
                id="description"
                style={styles.textarea}
                value={common.description}
                onChange={(e) => updateCommon("description", e.target.value)}
              />
            </div>
          </div>
        </fieldset>

        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>Reminder</legend>
          <div style={styles.checkboxRow}>
            <input
              id="reminderEnabled"
              type="checkbox"
              checked={common.reminderEnabled}
              onChange={(e) => updateCommon("reminderEnabled", e.target.checked)}
            />
            <label style={styles.label} htmlFor="reminderEnabled">
              Remind me before this task
            </label>
          </div>

          {common.reminderEnabled && (
            <div style={{ ...styles.reminderBox, marginTop: 12 }}>
              <div style={styles.reminderRow}>
                <div style={styles.field}>
                  <label style={styles.label} htmlFor="reminderValue">
                    Reminder value
                  </label>
                  <input
                    id="reminderValue"
                    type="number"
                    min="1"
                    style={{
                      ...styles.input,
                      ...(errors.reminderValue ? styles.inputError : {}),
                    }}
                    value={common.reminderValue}
                    onChange={(e) => updateCommon("reminderValue", e.target.value)}
                  />
                  <FieldError message={errors.reminderValue} />
                </div>

                <div style={styles.field}>
                  <label style={styles.label} htmlFor="reminderUnit">
                    Unit
                  </label>
                  <select
                    id="reminderUnit"
                    style={styles.select}
                    value={common.reminderUnit}
                    onChange={(e) => updateCommon("reminderUnit", e.target.value)}
                  >
                    {REMINDER_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>

                <span style={styles.helperText}>before the task date or time</span>
              </div>
            </div>
          )}
        </fieldset>

        {category && (
          <fieldset style={styles.fieldset}>
            <legend style={styles.legend}>
              {CATEGORIES.find((c) => c.key === category)?.label} details
            </legend>
            {renderCategoryFields()}
          </fieldset>
        )}

        {Object.keys(errors).length > 0 && (
          <div style={styles.formErrorsBox} role="alert">
            Please fix the highlighted errors above before submitting.
          </div>
        )}

        {submitError && (
          <div style={styles.submitErrorBox} role="alert">
            {submitError}
          </div>
        )}

        {submitSuccess && (
          <div style={styles.submitSuccessBox} role="status">
            Task saved successfully.
          </div>
        )}

        <div style={styles.buttonRow}>
          <button
            type="submit"
            style={{
              ...styles.submitButton,
              ...(isSubmitting ? styles.submitButtonDisabled : {}),
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Add Task"}
          </button>
          <button
            type="button"
            style={styles.resetButton}
            onClick={handleReset}
            disabled={isSubmitting}
          >
            Reset
          </button>
        </div>
      </form>

      {payload && (
        <div>
          <h3>Generated payload</h3>
          <pre style={styles.payloadBox}>{JSON.stringify(payload, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
