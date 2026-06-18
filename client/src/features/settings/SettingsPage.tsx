import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useAuthStore } from "../../stores/authStore";
import {
  User,
  Shield,
  Users,
  Folder,
  Save,
  Trash2,
  Mail,
  Plus,
  X,
  UserMinus,
  ShieldAlert,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { Workspace, Project, User as IUserType } from "../../types";

export default function SettingsPage() {
  const { wsSlug, projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const currentUser = useAuthStore((state) => state.user);
  const setCredentials = useAuthStore((state) => state.setCredentials);

  const { currentWorkspace, currentProject, setCurrentWorkspace, setCurrentProject } =
    useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<"profile" | "workspace" | "project">("profile");

  // Determine active tab on mount based on URL context
  useEffect(() => {
    if (projectId) {
      setActiveTab("project");
    } else if (wsSlug) {
      setActiveTab("workspace");
    } else {
      setActiveTab("profile");
    }
  }, [wsSlug, projectId]);

  // --- 1. USER PROFILE STATE & MUTATIONS ---
  const [profileName, setProfileName] = useState(currentUser?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // --- 2. WORKSPACE STATE & MUTATIONS ---
  const [wsName, setWsName] = useState(currentWorkspace?.name || "");
  const [wsDesc, setWsDesc] = useState(currentWorkspace?.description || "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [wsSuccess, setWsSuccess] = useState<string | null>(null);
  const [wsError, setWsError] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspace) {
      setWsName(currentWorkspace.name);
      setWsDesc(currentWorkspace.description || "");
    }
  }, [currentWorkspace]);

  // Query to get fully populated Workspace details (members)
  const { data: workspaceDetails, refetch: refetchWorkspace } = useQuery({
    queryKey: ["workspace-details", currentWorkspace?._id],
    queryFn: async () => {
      if (!currentWorkspace?._id) return null;
      const res = await api.get(`/workspaces/${currentWorkspace._id}`);
      return res.data.data as Workspace;
    },
    enabled: !!currentWorkspace?._id,
  });

  // Query to get fully populated Project details (members)
  const { data: projectDetails, refetch: refetchProject } = useQuery({
    queryKey: ["project-details", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await api.get(`/projects/${projectId}`);
      return res.data.data as Project;
    },
    enabled: !!projectId,
  });

  // --- 3. PROJECT STATE & MUTATIONS ---
  const [pName, setPName] = useState(projectDetails?.name || "");
  const [pDesc, setPDesc] = useState(projectDetails?.description || "");
  const [pStatus, setPStatus] = useState(projectDetails?.status || "active");
  const [pColor, setPColor] = useState(projectDetails?.color || "#4865f5");
  const [projectMemberId, setProjectMemberId] = useState("");
  const [projectMemberRole, setProjectMemberRole] = useState<"admin" | "member" | "viewer">(
    "member"
  );
  const [pSuccess, setPSuccess] = useState<string | null>(null);
  const [pError, setPError] = useState<string | null>(null);

  useEffect(() => {
    if (projectDetails) {
      setPName(projectDetails.name);
      setPDesc(projectDetails.description || "");
      setPStatus(projectDetails.status);
      setPColor(projectDetails.color);
    }
  }, [projectDetails]);

  // MUTATIONS
  // Update Profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; avatarUrl: string }) => {
      // Stub endpoint for profile settings update
      const res = await api.patch("/auth/me", data);
      return res.data.data as IUserType;
    },
    onSuccess: (data) => {
      setProfileSuccess("Profile updated successfully!");
      // Re-sign token locally or update Zustand
      if (currentUser) {
        setCredentials(
          { ...currentUser, name: data.name, avatarUrl: data.avatarUrl },
          useAuthStore.getState().accessToken || ""
        );
      }
    },
    onError: (err: any) => {
      setProfileError(err.response?.data?.error?.message || "Failed to update profile.");
    },
  });

  // Update Workspace
  const updateWorkspaceMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await api.patch(`/workspaces/${currentWorkspace?._id}`, data);
      return res.data.data as Workspace;
    },
    onSuccess: (data) => {
      setWsSuccess("Workspace updated successfully!");
      setCurrentWorkspace(data);
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (err: any) => {
      setWsError(err.response?.data?.error?.message || "Failed to update workspace.");
    },
  });

  // Invite Workspace Member
  const inviteMemberMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      const res = await api.post(`/workspaces/${currentWorkspace?._id}/invite`, data);
      return res.data.data as Workspace;
    },
    onSuccess: () => {
      setWsSuccess("Member invited successfully!");
      setInviteEmail("");
      refetchWorkspace();
    },
    onError: (err: any) => {
      setWsError(
        err.response?.data?.error?.message || "Failed to invite member. Ensure email is registered."
      );
    },
  });

  // Change Workspace Member Role
  const updateWsRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await api.patch(`/workspaces/${currentWorkspace?._id}/members/${userId}`, {
        role,
      });
      return res.data.data;
    },
    onSuccess: () => {
      setWsSuccess("Member role updated successfully.");
      refetchWorkspace();
    },
    onError: (err: any) => {
      setWsError(err.response?.data?.error?.message || "Failed to update role.");
    },
  });

  // Remove Workspace Member
  const removeWsMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.delete(`/workspaces/${currentWorkspace?._id}/members/${userId}`);
      return res.data.data;
    },
    onSuccess: () => {
      setWsSuccess("Member removed from workspace.");
      refetchWorkspace();
    },
    onError: (err: any) => {
      setWsError(err.response?.data?.error?.message || "Failed to remove member.");
    },
  });

  // Delete Workspace
  const deleteWorkspaceMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/workspaces/${currentWorkspace?._id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setCurrentWorkspace(null);
      navigate("/workspaces");
    },
    onError: (err: any) => {
      setWsError(err.response?.data?.error?.message || "Failed to delete workspace.");
    },
  });

  // Update Project Details
  const updateProjectMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      status: string;
      color: string;
    }) => {
      const res = await api.patch(`/projects/${projectId}`, data);
      return res.data.data as Project;
    },
    onSuccess: (data) => {
      setPSuccess("Project updated successfully!");
      setCurrentProject(data);
    },
    onError: (err: any) => {
      setPError(err.response?.data?.error?.message || "Failed to update project.");
    },
  });

  // Add Project Member
  const addProjectMemberMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      const res = await api.post(`/projects/${projectId}/members`, data);
      return res.data.data;
    },
    onSuccess: () => {
      setPSuccess("Member added to project!");
      setProjectMemberId("");
      refetchProject();
    },
    onError: (err: any) => {
      setPError(err.response?.data?.error?.message || "Failed to add member to project.");
    },
  });

  // Remove Project Member
  const removeProjectMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.delete(`/projects/${projectId}/members/${userId}`);
      return res.data.data;
    },
    onSuccess: () => {
      setPSuccess("Member removed from project.");
      refetchProject();
    },
    onError: (err: any) => {
      setPError(err.response?.data?.error?.message || "Failed to remove member.");
    },
  });

  // Delete Project
  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/projects/${projectId}`);
    },
    onSuccess: () => {
      setCurrentProject(null);
      navigate(`/workspaces/${wsSlug}/projects`);
    },
    onError: (err: any) => {
      setPError(err.response?.data?.error?.message || "Failed to delete project.");
    },
  });

  // SUBMIT HANDLERS
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    // Profile name updates
    updateProfileMutation.mutate({ name: profileName, avatarUrl });
  };

  const handleWorkspaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWsError(null);
    setWsSuccess(null);
    updateWorkspaceMutation.mutate({ name: wsName, description: wsDesc });
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setWsError(null);
    setWsSuccess(null);
    inviteMemberMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPError(null);
    setPSuccess(null);
    updateProjectMutation.mutate({
      name: pName,
      description: pDesc,
      status: pStatus,
      color: pColor,
    });
  };

  const handleAddProjectMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectMemberId) return;
    setPError(null);
    setPSuccess(null);
    addProjectMemberMutation.mutate({ userId: projectMemberId, role: projectMemberRole });
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 text-slate-100">
      {/* Back to Project / Workspace link */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => {
            if (projectId) {
              navigate(`/workspaces/${wsSlug}/projects/${projectId}/board`);
            } else if (wsSlug) {
              navigate(`/workspaces/${wsSlug}/projects`);
            } else {
              navigate("/workspaces");
            }
          }}
          className="flex items-center space-x-1 text-sm text-slate-400 hover:text-white transition"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      </div>

      <h1 className="text-3xl font-extrabold text-white mb-8">Settings</h1>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Navigation Sidebar */}
        <aside className="w-full md:w-64 flex flex-row md:flex-col gap-1 overflow-x-auto no-scrollbar md:overflow-visible">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-left text-sm font-semibold transition ${
              activeTab === "profile"
                ? "bg-brand-600 text-white"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            }`}
          >
            <User className="h-4 w-4" />
            <span>User Profile</span>
          </button>

          {currentWorkspace && (
            <button
              onClick={() => setActiveTab("workspace")}
              className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-left text-sm font-semibold transition ${
                activeTab === "workspace"
                  ? "bg-brand-600 text-white"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Workspace Admin</span>
            </button>
          )}

          {projectId && currentProject && (
            <button
              onClick={() => setActiveTab("project")}
              className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-left text-sm font-semibold transition ${
                activeTab === "project"
                  ? "bg-brand-600 text-white"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Folder className="h-4 w-4" />
              <span>Project settings</span>
            </button>
          )}
        </aside>

        {/* Settings Content Panels */}
        <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
          {/* TAB 1: PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">User Profile</h3>
                <p className="text-sm text-slate-400">Update your avatar name or credentials.</p>
              </div>

              {profileSuccess && (
                <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none transition duration-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Avatar seed
                    </label>
                    <input
                      type="text"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none transition duration-200"
                      placeholder="e.g. https://api.dicebear.com/7.x/..."
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white transition disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: WORKSPACE TAB */}
          {activeTab === "workspace" && currentWorkspace && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Workspace Settings</h3>
                <p className="text-sm text-slate-400">
                  Administrate "{currentWorkspace.name}" workspace.
                </p>
              </div>

              {wsSuccess && (
                <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{wsSuccess}</span>
                </div>
              )}
              {wsError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  {wsError}
                </div>
              )}

              {/* General settings */}
              <form
                onSubmit={handleWorkspaceSubmit}
                className="space-y-6 border-b border-slate-800 pb-8"
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Workspace Name
                    </label>
                    <input
                      type="text"
                      required
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none transition duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={wsDesc}
                      onChange={(e) => setWsDesc(e.target.value)}
                      className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none transition duration-200"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white transition"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Details</span>
                  </button>
                </div>
              </form>

              {/* Invite Workspace members */}
              <div className="border-b border-slate-800 pb-8">
                <h4 className="text-lg font-bold text-white mb-4">Invite Team Members</h4>
                <form onSubmit={handleInviteSubmit} className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="block w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none transition duration-200"
                      placeholder="teammate@company.com"
                    />
                  </div>
                  <select
                    value={inviteRole}
                    onChange={(e: any) => setInviteRole(e.target.value)}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-brand-500 focus:outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="submit"
                    className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white transition"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Invite</span>
                  </button>
                </form>
              </div>

              {/* Members List */}
              <div>
                <h4 className="text-lg font-bold text-white mb-4">
                  Workspace Members ({workspaceDetails?.members?.length || 1})
                </h4>
                <div className="space-y-4">
                  {workspaceDetails?.members?.map((member: any) => {
                    const memberUser = member.userId;
                    const isOwner = workspaceDetails.ownerId === memberUser._id;
                    return (
                      <div
                        key={memberUser._id}
                        className="flex items-center justify-between rounded-xl bg-slate-950/40 p-4 border border-slate-800/80"
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={
                              memberUser.avatarUrl ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${memberUser.name}`
                            }
                            alt="Avatar"
                            className="h-9 w-9 rounded-full object-cover border border-slate-700"
                          />
                          <div>
                            <p className="text-sm font-bold text-white">{memberUser.name}</p>
                            <p className="text-xs text-slate-400">{memberUser.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {isOwner ? (
                            <span className="text-xs font-semibold text-brand-400 bg-brand-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                              Owner
                            </span>
                          ) : (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  updateWsRoleMutation.mutate({
                                    userId: memberUser._id,
                                    role: e.target.value,
                                  })
                                }
                                className="text-xs rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-slate-300 focus:border-brand-500 focus:outline-none"
                              >
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <button
                                onClick={() => removeWsMemberMutation.mutate(memberUser._id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800/60 transition"
                                title="Remove member"
                              >
                                <UserMinus className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-red-500/20 pt-8 mt-12">
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
                  <div className="flex items-start space-x-3 text-red-400">
                    <ShieldAlert className="h-6 w-6 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="text-lg font-bold text-white">Danger Zone</h4>
                      <p className="text-sm text-red-400/80">
                        Deleting a workspace will permanently delete all projects, Kanban boards,
                        active sprints, tasks, and settings associated with it. This action cannot
                        be undone.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "Are you absolutely sure you want to delete this workspace? All data will be lost forever."
                          )
                        ) {
                          deleteWorkspaceMutation.mutate();
                        }
                      }}
                      className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold text-white transition shadow-lg shadow-red-600/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Workspace</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROJECT TAB */}
          {activeTab === "project" && currentProject && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Project Configurations</h3>
                <p className="text-sm text-slate-400">
                  Administrate "{currentProject.name}" settings.
                </p>
              </div>

              {pSuccess && (
                <div className="flex items-center space-x-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{pSuccess}</span>
                </div>
              )}
              {pError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                  {pError}
                </div>
              )}

              {/* General settings */}
              <form
                onSubmit={handleProjectSubmit}
                className="space-y-6 border-b border-slate-800 pb-8"
              >
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Project Name
                    </label>
                    <input
                      type="text"
                      required
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none transition duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Project Key
                    </label>
                    <input
                      type="text"
                      disabled
                      value={projectDetails?.key || ""}
                      className="block w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Project Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={pColor}
                        onChange={(e) => setPColor(e.target.value)}
                        className="h-10 w-10 border-0 bg-transparent rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={pColor}
                        onChange={(e) => setPColor(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={pDesc}
                      onChange={(e) => setPDesc(e.target.value)}
                      className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white transition"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Project</span>
                  </button>
                </div>
              </form>

              {/* Add Project member */}
              <div className="border-b border-slate-800 pb-8">
                <h4 className="text-lg font-bold text-white mb-4">Add Project Member</h4>
                <form
                  onSubmit={handleAddProjectMemberSubmit}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <select
                    value={projectMemberId}
                    onChange={(e) => setProjectMemberId(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">Select workspace member...</option>
                    {workspaceDetails?.members?.map((m: any) => {
                      const wsUser = m.userId;
                      // Filter users already in project
                      const inProject = projectDetails?.members?.some(
                        (pm) => pm.userId === wsUser._id
                      );
                      if (inProject) return null;
                      return (
                        <option key={wsUser._id} value={wsUser._id}>
                          {wsUser.name} ({wsUser.email})
                        </option>
                      );
                    })}
                  </select>
                  <select
                    value={projectMemberRole}
                    onChange={(e: any) => setProjectMemberRole(e.target.value)}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-brand-500 focus:outline-none"
                  >
                    <option value="admin">Project Admin</option>
                    <option value="member">Project Member</option>
                    <option value="viewer">Project Viewer</option>
                  </select>
                  <button
                    type="submit"
                    className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white transition"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Member</span>
                  </button>
                </form>
              </div>

              {/* Project Members list */}
              <div>
                <h4 className="text-lg font-bold text-white mb-4">
                  Project Members ({projectDetails?.members?.length || 0})
                </h4>
                <div className="space-y-4">
                  {projectDetails?.members?.map((pm: any) => {
                    const pmUser = pm.userId;
                    return (
                      <div
                        key={pmUser._id}
                        className="flex items-center justify-between rounded-xl bg-slate-950/40 p-4 border border-slate-800/80"
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={
                              pmUser.avatarUrl ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${pmUser.name}`
                            }
                            alt="Avatar"
                            className="h-9 w-9 rounded-full object-cover border border-slate-700"
                          />
                          <div>
                            <p className="text-sm font-bold text-white">{pmUser.name}</p>
                            <p className="text-xs text-slate-400">{pmUser.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 uppercase tracking-wider">
                            {pm.role}
                          </span>
                          <button
                            onClick={() => removeProjectMemberMutation.mutate(pmUser._id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800/60 transition"
                            title="Remove project member"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Danger Zone Project */}
              <div className="border-t border-red-500/20 pt-8 mt-12">
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
                  <div className="flex items-start space-x-3 text-red-400">
                    <ShieldAlert className="h-6 w-6 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="text-lg font-bold text-white">Danger Zone</h4>
                      <p className="text-sm text-red-400/80">
                        Deleting a project will permanently delete all boards, sprints, active
                        backlog tasks, checklist records, comments, and settings. This action cannot
                        be undone.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "Are you absolutely sure you want to delete this project? All tasks and sprints will be lost forever."
                          )
                        ) {
                          deleteProjectMutation.mutate();
                        }
                      }}
                      className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold text-white transition shadow-lg shadow-red-600/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Project</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
