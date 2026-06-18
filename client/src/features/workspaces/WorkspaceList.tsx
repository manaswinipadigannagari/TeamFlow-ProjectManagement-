import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useAuthStore } from "../../stores/authStore";
import { Plus, Briefcase, ChevronRight, LogOut, Loader2, Info } from "lucide-react";
import { Workspace } from "../../types";

export default function WorkspaceList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.clearCredentials);
  const user = useAuthStore((state) => state.user);

  const { setWorkspaces, setCurrentWorkspace } = useWorkspaceStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Fetch workspaces using TanStack Query
  const {
    data: workspacesResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const res = await api.get("/workspaces");
      const list = res.data.data as Workspace[];
      setWorkspaces(list);
      return list;
    },
  });

  // Create workspace mutation
  const createMutation = useMutation({
    mutationFn: async (newWS: { name: string; description: string }) => {
      const res = await api.post("/workspaces", newWS);
      return res.data.data as Workspace;
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh workspaces list
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setIsModalOpen(false);
      setName("");
      setDescription("");

      // Auto select and navigate to projects list of the new workspace
      setCurrentWorkspace(data);
      navigate(`/workspaces/${data.slug}/projects`);
    },
    onError: (err: any) => {
      setCreateError(err.response?.data?.error?.message || "Failed to create workspace.");
    },
  });

  const handleSelectWorkspace = (ws: Workspace) => {
    setCurrentWorkspace(ws);
    navigate(`/workspaces/${ws.slug}/projects`);
  };

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreateError(null);
    createMutation.mutate({ name, description });
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
    <div className="relative min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Gradients */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-brand-500/5 blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-pink-500/5 blur-[150px]" />

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-lg">
              <span className="font-bold text-lg font-display">TF</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white font-display">
              TeamFlow
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 border-r border-slate-800 pr-4">
              <img
                src={
                  user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`
                }
                alt="Avatar"
                className="h-8 w-8 rounded-full border border-slate-700 object-cover"
              />
              <span className="text-sm font-medium text-slate-300">{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition duration-200"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-16 flex flex-col justify-center">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            Select your Workspace
          </h2>
          <p className="mt-2 text-slate-400">
            Choose a workspace to access your projects and boards.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 text-brand-500 animate-spin" />
            <p className="mt-4 text-sm text-slate-400">Loading workspaces...</p>
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-red-400">
              Error loading workspaces. Please check your network connection.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {workspacesResponse?.map((ws) => (
              <div
                key={ws._id}
                onClick={() => handleSelectWorkspace(ws)}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/40 p-6 cursor-pointer hover:border-brand-500/50 hover:bg-slate-900/80 transition duration-300 shadow-lg"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-brand-400 mb-4 group-hover:bg-brand-500 group-hover:text-white transition duration-300">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-brand-400 transition duration-200">
                    {ws.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                    {ws.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-4">
                  <span>{ws.members?.length || 1} members</span>
                  <div className="flex items-center space-x-1 font-semibold text-brand-400 group-hover:translate-x-1 transition duration-200">
                    <span>Enter Workspace</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            ))}

            {/* Create new Workspace card */}
            <div
              onClick={() => setIsModalOpen(true)}
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/10 p-8 cursor-pointer hover:border-brand-500/50 hover:bg-slate-900/30 transition duration-300 group min-h-[200px]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400 group-hover:bg-brand-600 group-hover:text-white transition duration-300">
                <Plus className="h-6 w-6" />
              </div>
              <span className="mt-4 font-bold text-slate-300 group-hover:text-white transition duration-200">
                Create Workspace
              </span>
              <p className="mt-1 text-xs text-slate-500 text-center">
                Add a new workspace to manage another team.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-bold text-white">Create a New Workspace</h3>
            <p className="mt-1 text-sm text-slate-400">
              Workspaces isolate your team's projects, boards, and sprints.
            </p>

            {createError && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateWorkspace} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition duration-200"
                  placeholder="e.g. Acme Tech, Marketing Group"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 transition duration-200 resize-none"
                  placeholder="Describe your team's objective or work domain..."
                />
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center justify-center px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white disabled:opacity-50 transition duration-200 shadow-lg shadow-brand-600/20"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                    </>
                  ) : (
                    "Create Workspace"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
