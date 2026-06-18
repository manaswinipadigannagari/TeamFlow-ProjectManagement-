import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import {
  FolderOpen,
  Calendar,
  CheckCircle,
  Plus,
  Loader2,
  ChevronRight,
  TrendingUp,
  Shield,
  HelpCircle,
} from "lucide-react";
import { Project } from "../../types";

export default function ProjectList() {
  const { wsSlug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { currentWorkspace, projects, setCurrentProject } = useWorkspaceStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pName, setPName] = useState("");
  const [pKey, setPKey] = useState("");
  const [pColor, setPColor] = useState("#4865f5");
  const [pError, setPError] = useState<string | null>(null);

  // Fetch projects inside selected workspace (re-fetches if workspace id changes)
  const {
    data: projectsList,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["projects", currentWorkspace?._id],
    queryFn: async () => {
      if (!currentWorkspace?._id) return [];
      const res = await api.get(`/workspaces/${currentWorkspace._id}/projects`);
      return res.data.data as Project[];
    },
    enabled: !!currentWorkspace?._id,
  });

  // Create Project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; key: string; color: string }) => {
      const res = await api.post(`/workspaces/${currentWorkspace?._id}/projects`, data);
      return res.data.data as Project;
    },
    onSuccess: (newProj) => {
      queryClient.invalidateQueries({ queryKey: ["projects", currentWorkspace?._id] });
      setIsCreateOpen(false);
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

  const handleSelectProject = (proj: Project) => {
    setCurrentProject(proj);
    navigate(`/workspaces/${wsSlug}/projects/${proj._id}/board`);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim() || !pKey.trim()) return;
    setPError(null);
    createProjectMutation.mutate({ name: pName, key: pKey, color: pColor });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
        <p className="mt-4 text-sm text-slate-500">Loading projects dashboard...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 text-slate-100 font-sans space-y-8">
      {/* Dashboard Topbar */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight font-display">
            Projects Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage deliverables and boards for this workspace.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white transition shadow-lg shadow-brand-600/10"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projectsList && projectsList.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projectsList.map((proj) => {
            const totalMembers = proj.members?.length || 1;
            return (
              <div
                key={proj._id}
                onClick={() => handleSelectProject(proj)}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-950/20 p-6 cursor-pointer hover:border-brand-500/50 hover:bg-slate-900 transition duration-300 shadow-xl"
              >
                <div>
                  {/* Top color bar */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-extrabold text-slate-500 font-mono tracking-wider bg-slate-850 px-2 py-0.5 rounded-md uppercase">
                      {proj.key}
                    </span>
                    <div
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: proj.color }}
                    />
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-brand-400 transition duration-200">
                    {proj.name}
                  </h3>
                  <p className="mt-2 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {proj.description || "No project description declared."}
                  </p>
                </div>

                <div className="mt-8 border-t border-slate-850 pt-4 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Active</span>
                  </div>
                  <div className="flex items-center space-x-1 font-bold text-brand-400 group-hover:translate-x-1 transition">
                    <span>Enter Board</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950/10 p-12 text-center flex flex-col items-center justify-center">
          <FolderOpen className="h-12 w-12 text-slate-700 mb-4 animate-pulse" />
          <h3 className="text-lg font-bold text-white">No projects found</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm">
            Create a project to initialize boards, columns, sprints, and invite workspace members.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-6 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold hover:bg-brand-500 text-white transition shadow-lg shadow-brand-600/10"
          >
            Create your First Project
          </button>
        </div>
      )}

      {/* CREATE PROJECT DIALOG */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in duration-200">
            <h3 className="text-2xl font-bold text-white">Create a New Project</h3>
            <p className="mt-1 text-sm text-slate-400">
              Initialize a project and its default Kanban board.
            </p>

            {pError && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                {pError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
                  placeholder="e.g. Mobile Companion App, Marketing Campaign"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Project Key
                  </label>
                  <input
                    type="text"
                    required
                    value={pKey}
                    onChange={(e) => setPKey(e.target.value.toUpperCase())}
                    className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
                    placeholder="e.g. FLOW, MOB"
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
                    <span className="text-xs font-bold text-slate-500 font-mono">{pColor}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
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
