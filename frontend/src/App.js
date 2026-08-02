import { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Topbar from "./scenes/global/Topbar";
import Sidebar from "./scenes/global/Sidebar";
import Dashboard from "./scenes/home";
import HomeDashboard from "./scenes/home";
import KidsMenu from "./scenes/kids/KidsMenu";
import { CssBaseline, ThemeProvider, Box } from "@mui/material";
import { ColorModeContext, useMode } from "./theme";
import Calendar from "./scenes/calendar/calendar";
import Medical from "./scenes/medical/medical";
import Passport from "./scenes/passport/passport";
import Sports from "./scenes/kids/sports";
import Routine from "./scenes/routine";
import RoutineAdmin from "./scenes/routine/RoutineAdmin";
import DigiLocker from "./scenes/digiLocker/digiLocker";

// Auth imports
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./components/Login";
import { Register } from "./components/Register";

// Helper components for standalone Login / Register pages
const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // If user is already logged in, send them to dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Login
      onSwitchToRegister={() => navigate("/register")}
      onSuccess={() => navigate("/")}
    />
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Register
      onSwitchToLogin={() => navigate("/login")}
      onSuccess={() => navigate("/")}
    />
  );
};

// Main layout wrapper for authenticated routes
const ProtectedAppLayout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <Box display="flex" width="100vw" height="100vh" overflow="hidden">
      {/* SIDEBAR DOCKED ON THE LEFT */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* MAIN CONTENT AREA */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: "100%",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          minWidth: 0, // Prevents content from forcing horizontal scroll
        }}
      >
        <Topbar onMenuClick={() => setIsMobileSidebarOpen(true)} />
        <Box flex={1} p={2}>
          <Routes>
            <Route path="/" element={<HomeDashboard />} />
            <Route path="/reports/overview" element={<Dashboard />} />
            <Route path="/kids" element={<KidsMenu />} />
            <Route path="/medical" element={<Medical />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/passport" element={<Passport />} />
            <Route path="/sports" element={<Sports />} />
            <Route path="/routine" element={<Routine />} />
            <Route path="/routine/admin" element={<RoutineAdmin />} />
            <Route path="/digiLocker" element={<DigiLocker />} />
            {/* Catch-all fallback inside layout */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
};

function AppContent() {
  const [theme, colorMode] = useMode();

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes Guard */}
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<ProtectedAppLayout />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

// Wrap with AuthProvider at the root level
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;