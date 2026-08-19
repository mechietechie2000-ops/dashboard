const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser"); // Added for cookie handling
const { createProxyMiddleware } = require("http-proxy-middleware");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const { runDailyReset, hasResetRunToday } = require("./db/routineRepository");
const { syncAllReminders } = require("./db/remindersRepository");
const { ALLOWED_ORIGINS } = require("./config.js");

dotenv.config();
const app = express();

// Ensure the uploads directory exists at boot. Lives outside any
// statically-served/public path — see backend/routes/upload.js.
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`[server] created uploads directory: ${UPLOADS_DIR}`);
}

// Updated CORS options to allow credentials (cookies) securely
const corsOptions = {
  origin: (origin, callback) => {
    // Allows requests from any origin while supporting credentials
    callback(null, origin || true);
  },
  methods: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  allowedHeaders: "X-Requested-With, content-type, Authorization",
  credentials: true, // Required for HTTP-only cookies
};

/*
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl, mobile apps, Postman) only if you need to
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["X-Requested-With", "Content-Type", "Authorization"],
  credentials: true,
};
*/

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser()); // Enables parsing req.cookies

app.get("/api", (req, res) => {
  res.send("API is running..");
});

// Authentication Routes
app.use("/api/auth", require("./routes/auth"));

// Application Routes
app.use(require("./routes/routine")); 
// app.use(require("./routes/notes")); 
// app.use(require("./routes/meals"));
// app.use(require("./routes/recipe"));
// app.use(require("./routes/appointments")); // still used by scenes/medical (table renamed from doctor_appointment)
// app.use(require("./routes/sports")); // still used by scenes/kids/sports
app.use(require("./routes/upload"));
app.use(require("./routes/sections")); // generic CRUD for Home Dashboard sections
app.use(require("./routes/reminders")); // computed feed across events/goals/renewals/appointments
app.use(require("./routes/family")); // GET /api/family-members, used by DigiLocker's person dropdown
app.use(require("./routes/calendar")); // GET /api/calendar

app.use("/api/push", require("./routes/push").router);

// Development Proxy (Keep at the end after API routes)
app.use(
  "/",
  createProxyMiddleware({
    target: "http://localhost:3000",
    changeOrigin: true,
    ws: true, 
  })
);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

// ---- Daily routine reset: in-process backup layer ----
// Primary trigger is launchd (see backend/scripts/daily-reset.plist), which
// runs independently of this Node process and survives crashes/restarts.
// This node-cron job is a same-process backup in case launchd isn't set up
// or misses a run. runDailyReset() is idempotent (checked against app_state),
// so having both firing is harmless — worst case it's a no-op second call.
cron.schedule("5 0 * * *", () => {
  runDailyReset()
    .then((result) => console.log("[daily-reset:cron]", result))
    .catch((err) => console.error("[daily-reset:cron] failed:", err.message));
});

// Startup catch-up: if the server was offline through 00:05 (crash, deploy,
// laptop asleep) and boots up later still missing today's reset, run it once
// immediately rather than waiting for either scheduler to hit its next slot.
hasResetRunToday()
  .then((ranToday) => {
    if (!ranToday) {
      return runDailyReset().then((result) =>
        console.log("[daily-reset:startup-catchup]", result)
      );
    }
  })
  .catch((err) => console.error("[daily-reset:startup-catchup] failed:", err.message));

// ---- Reminder table nightly safety net ----
// syncReminder() runs on every source-row write, so this is purely a
// backup in case a write-path call was ever missed (crash mid-request, a
// future code path that forgets to call it, etc). Runs a few minutes after
// the daily routine reset so a fresh day's routine reminders are in place
// before the bulk resync walks every source table.
cron.schedule("15 0 * * *", () => {
  syncAllReminders()
    .then((result) => console.log("[reminders:sync-cron]", result))
    .catch((err) => console.error("[reminders:sync-cron] failed:", err.message));
});

// Also run once at boot, so a server that was down through 00:15 doesn't
// wait a full day before its first backup sync.
syncAllReminders()
  .then((result) => console.log("[reminders:sync-startup]", result))
  .catch((err) => console.error("[reminders:sync-startup] failed:", err.message));