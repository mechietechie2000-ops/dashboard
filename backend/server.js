const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser"); // Added for cookie handling
const { createProxyMiddleware } = require("http-proxy-middleware");

dotenv.config();
const app = express();

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
app.use(require("./routes/events")); 
app.use(require("./routes/doctorAppointments")); 
app.use(require("./routes/sports")); 
app.use(require("./routes/upload")); 

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