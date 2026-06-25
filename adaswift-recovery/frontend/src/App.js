import "@/App.css";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";

// Lazy load pages for better performance
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Clients = lazy(() => import("@/pages/Clients"));
const ClientDetail = lazy(() => import("@/pages/ClientDetail"));
const EmbedCodePage = lazy(() => import("@/pages/EmbedCodePage"));
const Settings = lazy(() => import("@/pages/Settings"));
const PersonalWebsites = lazy(() => import("@/pages/PersonalWebsites"));
const PersonalWebsiteDetail = lazy(() => import("@/pages/PersonalWebsiteDetail"));
const WidgetRequests = lazy(() => import("@/pages/WidgetRequests"));
const Profile = lazy(() => import("@/pages/Profile"));
const PlanSettings = lazy(() => import("@/pages/PlanSettings"));
const AutomationDashboard = lazy(() => import("@/pages/AutomationDashboard"));
const ScanReports = lazy(() => import("@/pages/ScanReports"));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-400 text-sm">Loading ADASwift...</p>
    </div>
  </div>
);

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected routes */}
              <Route element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="/" element={<Dashboard />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ClientDetail />} />
                <Route path="/personal-websites" element={<PersonalWebsites />} />
                <Route path="/personal-websites/:id" element={<PersonalWebsiteDetail />} />
                <Route path="/widget-requests" element={<WidgetRequests />} />
                <Route path="/embed" element={<EmbedCodePage />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/plan-settings" element={<PlanSettings />} />
<Route path="/automation" element={<AutomationDashboard />} />
<Route path="/scan-reports" element={<ScanReports />} />
              </Route>
              
              {/* Redirect unknown routes to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
