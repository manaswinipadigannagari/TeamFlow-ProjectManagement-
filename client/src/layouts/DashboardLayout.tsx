import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams, Outlet, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useWorkspaceStore } from "../stores/workspaceStore";
import { usePresenceStore } from "../stores/presenceStore";
import {
  Briefcase,
  ChevronDown,
  LayoutDashboard,
  Layers,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  FolderOpen,
  Plus,
  Loader2,
  Users,
  Compass,
  CheckCircle,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import { Workspace, Project, Notification as INotification } from "../types";

export default function DashboardLayout() {
  const { wsSlug, projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const currentUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.clearCredentials);

  const {
    workspaces,
    currentWorkspace,
    projects,
    currentProject,
    setWorkspaces,
    setCurrentWorkspace,
    setProjects,
    setCurrentProject,
  } = useWorkspaceStore();

  const { presenceUserIds, joinProjectRoom, leaveProjectRoom } = usePresenceStore();

  // Local state
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Create Project inputs
  const [pName, setPName] = useState("");
  const [pKey, setPKey] = useState("");
  const [pColor, setPColor] = useState("#4865f5");
  const [pError, setPError] = useState<string | null>(null);

  // Toggle dark mode
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Handle socket rooms based on active project routes
  useEffect(() => {
    if (!projectId || !currentUser) return;

    joinProjectRoom(projectId, currentUser._id);
    return () => {
      leaveProjectRoom(projectId, currentUser._id);
    };
  }, [projectId, currentUser, joinProjectRoom, leaveProjectRoom]);

  // Fetch workspaces if empty
  useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await api.get("/workspaces");
      const list = res.data.data as Workspace[];
      setWorkspaces(list);
      // Auto select if slug is in URL
      if (wsSlug && !currentWorkspace) {
        const found = list.find((w) => w.slug === wsSlug);
        if (found) setCurrentWorkspace(found);
      }
      return list;
    },
    enabled: workspaces.length === 0,
  });

  // Fetch projects inside selected workspace
  const { isLoading: isProjectsLoading } = useQuery({
    queryKey: ["projects", currentWorkspace?._id],
    queryFn: async () => {
      if (!currentWorkspace?._id) return [];
      const res = await api.get(`/workspaces/${currentWorkspace._id}/projects`);
      const list = res.data.data as Project[];
      setProjects(list);

      // Auto select current project
      if (projectId) {
        const found = list.find((p) => p._id === projectId);
        if (found) setCurrentProject(found);
      }
      return list;
    },
    enabled: !!currentWorkspace?._id,
  });

  // Fetch unread notifications
  const { data: notificationsData, refetch: refetchNotifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications");
      return res.data.data.items as INotification[];
    },
    refetchInterval: 15000, // Poll every 15 seconds as a fallback
  });

  const unreadCount = notificationsData?.filter((n) => !n.isRead).length || 0;

  // Mark notification read mutation
  const markReadMutation = useMutation({
    mutationFn: async (notifId: string) => {
      await api.patch(`/notifications/${notifId}/read`);
    },
    onSuccess: () => {
      refetchNotifications();
    },
  });

  // Create Project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; key: string; color: string }) => {
      const res = await api.post(`/workspaces/${currentWorkspace?._id}/projects`, data);
      return res.data.data as Project;
    },
    onSuccess: (newProj) => {
      queryClient.invalidateQueries({ queryKey: ["projects", currentWorkspace?._id] });
      setIsCreateProjectOpen(false);
      setPName("");
      setPKey("");
      setPColor("#4865f5");
      setCurrentProject(newProj);
      navigate(`/workspaces/${wsSlug}/projects/${newProj._id}/board`);
    },
    onError: (err: any) => {
      setPError(err.response?.data?.error?.message || "Failed to create project.");
    },
  });

  const handleSelectWorkspace = (ws: Workspace) => {
    setCurrentWorkspace(ws);
    setIsWsDropdownOpen(false);
    navigate(`/workspaces/${ws.slug}/projects`);
  };

  const handleCreateProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim() || !pKey.trim()) return;
    setPError(null);
    createProjectMutation.mutate({ name: pName, key: pKey, color: pColor });
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      // ignore
    } finally {
      logout();
      navigate("/login");
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-100 flex-row overflow-hidden font-sans">
      {/* 1. SIDEBAR */}
      <aside className="hidden md:flex w-64 border-r border-slate-800 bg-slate-950 flex-col justify-between shrink-0">
        <div>
          {/* Workspace switcher dropdown */}
          <div className="relative p-4 border-b border-slate-800/80">
            <button
              onClick={() => setIsWsDropdownOpen(!isWsDropdownOpen)}
              className="flex w-full items-center justify-between rounded-xl bg-slate-900/60 p-3 hover:bg-slate-900 border border-slate-800 transition duration-200"
            >
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold shrink-0">
                  <Briefcase className="h-4 w-4" />
                </div>
                <span className="truncate text-sm font-bold text-white">
                  {currentWorkspace?.name || "Workspace"}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
            </button>

            {isWsDropdownOpen && (
              <div className="absolute left-4 right-4 mt-2 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-2xl z-20">
                {workspaces.map((ws) => (
                  <button
                    key={ws._id}
                    onClick={() => handleSelectWorkspace(ws)}
                    className="flex w-full items-center space-x-2 rounded-lg p-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    <Briefcase className="h-4 w-4 text-brand-500" />
                    <span className="truncate">{ws.name}</span>
                  </button>
                ))}
                <div className="border-t border-slate-800 mt-2 pt-2">
                  <button
                    onClick={() => navigate("/workspaces")}
                    className="flex w-full items-center space-x-2 rounded-lg p-2 text-xs font-semibold text-brand-400 hover:bg-slate-800 hover:text-brand-300 transition"
                  >
                    <Compass className="h-3.5 w-3.5" />
                    <span>All Workspaces</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 border-b border-slate-800/80">
            <Link
              to={`/workspaces/${wsSlug}/projects`}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                location.pathname.endsWith("/projects")
                  ? "bg-slate-800/80 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Projects Dashboard</span>
            </Link>
            <Link
              to={`/workspaces/${wsSlug}/settings`}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                location.pathname.includes("/settings") && !projectId
                  ? "bg-slate-800/80 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Workspace Settings</span>
            </Link>
          </nav>

          {/* Projects expandable accordion list */}
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-3 text-slate-500 font-semibold text-xs uppercase tracking-wider">
              <span>Active Projects</span>
              <button
                onClick={() => setIsCreateProjectOpen(true)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-900 transition"
                title="Create Project"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {isProjectsLoading ? (
              <div className="flex items-center space-x-2 py-4 justify-center">
                <Loader2 className="h-4 w-4 text-brand-500 animate-spin" />
                <span className="text-xs text-slate-500">Loading...</span>
              </div>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
                {projects.map((proj) => {
                  const isProjSelected = projectId === proj._id;
                  return (
                    <div key={proj._id} className="space-y-0.5">
                      <button
                        onClick={() => {
                          setCurrentProject(proj);
                          navigate(`/workspaces/${wsSlug}/projects/${proj._id}/board`);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 rounded-xl text-sm transition ${
                          isProjSelected
                            ? "bg-slate-900 text-white font-bold border border-slate-800/60"
                            : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 overflow-hidden">
                          <div
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: proj.color }}
                          />
                          <span className="truncate">{proj.name}</span>
                        </div>
                      </button>

                      {isProjSelected && (
                        <div className="pl-6 space-y-1 mt-0.5">
                          <Link
                            to={`/workspaces/${wsSlug}/projects/${proj._id}/board`}
                            className={`flex items-center space-x-2 py-1.5 text-xs font-semibold ${
                              location.pathname.endsWith("/board")
                                ? "text-brand-400 font-bold"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            <Layers className="h-3.5 w-3.5" />
                            <span>Kanban Board</span>
                          </Link>
                          <Link
                            to={`/workspaces/${wsSlug}/projects/${proj._id}/backlog`}
                            className={`flex items-center space-x-2 py-1.5 text-xs font-semibold ${
                              location.pathname.endsWith("/backlog")
                                ? "text-brand-400 font-bold"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            <Users className="h-3.5 w-3.5" />
                            <span>Sprints & Backlog</span>
                          </Link>
                          <Link
                            to={`/workspaces/${wsSlug}/projects/${proj._id}/analytics`}
                            className={`flex items-center space-x-2 py-1.5 text-xs font-semibold ${
                              location.pathname.endsWith("/analytics")
                                ? "text-brand-400 font-bold"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                            <span>Metrics & Analytics</span>
                          </Link>
                          <Link
                            to={`/workspaces/${wsSlug}/projects/${proj._id}/settings`}
                            className={`flex items-center space-x-2 py-1.5 text-xs font-semibold ${
                              location.pathname.includes("/settings")
                                ? "text-brand-400 font-bold"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            <Settings className="h-3.5 w-3.5" />
                            <span>Project Settings</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* User profile footer widget */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/80">
          <div className="flex items-center justify-between">
            <Link
              to="/settings/profile"
              className="flex items-center space-x-3 overflow-hidden group"
            >
              <img
                src={
                  currentUser?.avatarUrl ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.name}`
                }
                alt="Avatar"
                className="h-9 w-9 rounded-full object-cover border border-slate-700 group-hover:border-brand-500 transition shrink-0"
              />
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white group-hover:text-brand-400 transition truncate">
                  {currentUser?.name}
                </p>
                <p className="text-xs text-slate-500 truncate">View Profile</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-900 transition"
              title="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTAINER AREA */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Panel */}
        <header className="flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950 px-6 shrink-0">
          <div className="flex items-center space-x-3">
            {/* Breadcrumb path */}
            <span className="text-sm text-slate-500 font-semibold">{currentWorkspace?.name}</span>
            {currentProject && (
              <>
                <span className="text-slate-700">/</span>
                <span className="text-sm text-slate-300 font-bold">{currentProject.name}</span>
              </>
            )}
          </div>

          {/* Topbar Actions */}
          <div className="flex items-center space-x-6">
            {/* Presence indicator: Avatars list of users inside project room */}
            {projectId && presenceUserIds.length > 0 && (
              <div className="flex items-center -space-x-2">
                <span className="text-xs text-slate-500 font-semibold mr-3 border-r border-slate-800 pr-3">
                  Online ({presenceUserIds.length})
                </span>
                {presenceUserIds.map((uId) => {
                  // Find member details in project
                  const member = currentProject?.members?.find(
                    (m: any) => m.userId?._id === uId || m.userId === uId
                  );
                  const name = (member?.userId as any)?.name || "Teammate";
                  const avatar =
                    (member?.userId as any)?.avatarUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${uId}`;
                  return (
                    <img
                      key={uId}
                      src={avatar}
                      alt={name}
                      title={`${name} is active`}
                      className="h-7 w-7 rounded-full border border-slate-900 object-cover ring-2 ring-emerald-500/80"
                    />
                  );
                })}
              </div>
            )}

            {/* Dark Mode toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Notifications center */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl z-30">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                    <span className="text-sm font-bold text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={async () => {
                          await api.post("/notifications/mark-all-read");
                          refetchNotifications();
                        }}
                        className="text-xs text-brand-400 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                    {notificationsData && notificationsData.length > 0 ? (
                      notificationsData.map((notif) => (
                        <div
                          key={notif._id}
                          onClick={() => {
                            if (!notif.isRead) markReadMutation.mutate(notif._id);
                            if (notif.link) {
                              navigate(`/workspaces/${wsSlug}${notif.link}`);
                              setIsNotificationsOpen(false);
                            }
                          }}
                          className={`rounded-xl p-3 text-xs cursor-pointer transition ${
                            notif.isRead
                              ? "bg-slate-950/20 text-slate-400 hover:bg-slate-950/40"
                              : "bg-brand-500/10 text-slate-200 border-l-2 border-brand-500 hover:bg-brand-500/20"
                          }`}
                        >
                          <p className="font-semibold">{notif.message}</p>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-500 py-6">No notifications found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Children Render Area */}
        <div className="flex-1 overflow-y-auto bg-slate-900/40">
          <Outlet />
        </div>
      </div>

      {/* CREATE PROJECT DIALOG */}
      {isCreateProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-white">Create a New Project</h3>
            <p className="mt-1 text-sm text-slate-400">
              Add a project and initialize its Kanban board columns.
            </p>

            {pError && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                {pError}
              </div>
            )}

            <form onSubmit={handleCreateProjectSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                  placeholder="e.g. Mobile Application, Web Redesign"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Project Key (Short Key)
                  </label>
                  <input
                    type="text"
                    required
                    value={pKey}
                    onChange={(e) => setPKey(e.target.value.toUpperCase())}
                    className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
                    placeholder="e.g. MOB, WEB, FLOW"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Color Accent
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={pColor}
                      onChange={(e) => setPColor(e.target.value)}
                      className="h-11 w-11 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-sm font-semibold text-slate-400 font-mono">{pColor}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateProjectOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white disabled:opacity-50 transition shadow-lg shadow-brand-600/20"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
