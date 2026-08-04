const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser"); // Added for cookie handling
const { createProxyMiddleware } = require("http-proxy-middleware");
const fs = require("fs");
const path = require("path");

dotenv.config();
const app = express();

// Ensure the uploads directory exists at boot. Lives outside any
// statically-served/public path — see backend/routes/upload.js.
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`[server] created uploads directory: ${UPLOADS_DIR}`);
}

const allowedOrigins = [
  "http://localhost:3000",
  "http://18mm.tail146023.ts.net:3000",
  "http://18mm.tail146023.ts.net",

  // "100.121.15.14:3000"
  // add your production frontend domain here later, e.g.:
  // "https://myapp.com",
];


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
app.use(require("./routes/notes")); 
// app.use("/api", require("./routes/meals"));
app.use(require("./routes/doctorAppointments")); // still used by scenes/medical
app.use(require("./routes/sports")); // still used by scenes/kids/sports
app.use(require("./routes/upload"));
app.use(require("./routes/sections")); // generic CRUD for Home Dashboard sections
app.use(require("./routes/family")); // GET /api/family-members, used by DigiLocker's person dropdown

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