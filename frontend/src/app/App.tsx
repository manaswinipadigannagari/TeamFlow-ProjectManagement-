import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "../stores/authStore";
import { usePresenceStore } from "../stores/presenceStore";
import { ToastProvider } from "../components/Toast";

import Login from "../features/auth/Login";
import Register from "../features/auth/Register";
import ForgotPassword from "../features/auth/ForgotPassword";
import ResetPassword from "../features/auth/ResetPassword";
import WorkspaceList from "../features/workspaces/WorkspaceList";
import ProjectList from "../features/projects/ProjectList";
import KanbanBoard from "../features/board/KanbanBoard";
import SprintBacklog from "../features/sprints/SprintBacklog";
import AnalyticsDashboard from "../features/analytics/AnalyticsDashboard";
import SettingsPage from "../features/settings/SettingsPage";
import DashboardLayout from "../layouts/DashboardLayout";

// Initialize TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route Guard Component
const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// LayoutWrapper removed, using DashboardLayout instead

export default function App() {
  const { user, isAuthenticated } = useAuthStore();
  const { connectSocket, disconnectSocket } = usePresenceStore();

  // Socket Connection Synchronization Lifecycle
  useEffect(() => {
    if (isAuthenticated && user) {
      connectSocket(user._id);
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user, connectSocket, disconnectSocket]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              {/* Workspace Selection List (no sidebar) */}
              <Route path="/" element={<WorkspaceList />} />
              <Route path="/workspaces" element={<WorkspaceList />} />

              {/* Dashboard workspace layout */}
              <Route path="/workspaces/:wsSlug" element={<DashboardLayout />}>
                {/* Projects List */}
                <Route path="projects" element={<ProjectList />} />

                {/* Project Kanban Board */}
                <Route path="projects/:projectId/board" element={<KanbanBoard />} />

                {/* Project Backlog & Sprints */}
                <Route path="projects/:projectId/backlog" element={<SprintBacklog />} />

                {/* Project Analytics */}
                <Route path="projects/:projectId/analytics" element={<AnalyticsDashboard />} />

                {/* Settings */}
                <Route path="settings" element={<SettingsPage />} />
                <Route path="projects/:projectId/settings" element={<SettingsPage />} />
              </Route>

              {/* Profile Settings */}
              <Route path="/settings/profile" element={<SettingsPage />} />
            </Route>

            {/* Fallback Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
