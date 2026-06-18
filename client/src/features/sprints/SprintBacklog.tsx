import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import {
  Plus,
  Play,
  CheckCircle,
  Calendar,
  Briefcase,
  Layers,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  TrendingDown,
  Info,
  Clock,
  Sparkles,
} from "lucide-react";
import { Sprint, Task, Project } from "../../types";

export default function SprintBacklog() {
  const { projectId, wsSlug } = useParams();
  const queryClient = useQueryClient();

  // Local state
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [sName, setSName] = useState("");
  const [sGoal, setSGoal] = useState("");
  const [sStart, setSStart] = useState("");
  const [sEnd, setSEnd] = useState("");
  const [sError, setSError] = useState<string | null>(null);

  // Accordion collapsed tracking
  const [isBacklogExpanded, setIsBacklogExpanded] = useState(true);
  const [expandedSprintIds, setExpandedSprintIds] = useState<Record<string, boolean>>({});

  // Fetch Sprints
  const {
    data: sprints,
    isLoading: isSprintsLoading,
    refetch: refetchSprints,
  } = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/sprints`);
      return res.data.data as Sprint[];
    },
    enabled: !!projectId,
  });

  // Fetch Backlog tasks (sprintId = null)
  const {
    data: backlogTasks,
    isLoading: isBacklogLoading,
    refetch: refetchBacklog,
  } = useQuery({
    queryKey: ["backlog-tasks", projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/tasks?sprintId=null`);
      return res.data.data as Task[];
    },
    enabled: !!projectId,
  });

  // Fetch Sprint-assigned tasks
  const {
    data: sprintTasks,
    isLoading: isSprintTasksLoading,
    refetch: refetchSprintTasks,
  } = useQuery({
    queryKey: ["sprint-tasks", projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/tasks`);
      // Return list of tasks that have a sprintId mapped
      return (res.data.data as Task[]).filter((t) => t.sprintId);
    },
    enabled: !!projectId,
  });

  // Fetch Project details
  const { data: projectDetails } = useQuery({
    queryKey: ["project-details", projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}`);
      return res.data.data as Project;
    },
    enabled: !!projectId,
  });

  // Create Sprint Mutation
  const createSprintMutation = useMutation({
    mutationFn: async (sprintData: any) => {
      const res = await api.post(`/projects/${projectId}/sprints`, sprintData);
      return res.data.data;
    },
    onSuccess: () => {
      setIsSprintModalOpen(false);
      setSName("");
      setSGoal("");
      setSStart("");
      setSEnd("");
      refetchSprints();
    },
    onError: (err: any) => {
      setSError(err.response?.data?.error?.message || "Failed to create sprint.");
    },
  });

  // Start Sprint Mutation
  const startSprintMutation = useMutation({
    mutationFn: async (sprintId: string) => {
      const res = await api.post(`/sprints/${sprintId}/start`);
      return res.data.data;
    },
    onSuccess: () => {
      refetchSprints();
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message || "Failed to start sprint.");
    },
  });

  // Complete Sprint Mutation
  const completeSprintMutation = useMutation({
    mutationFn: async (sprintId: string) => {
      const res = await api.post(`/sprints/${sprintId}/complete`);
      return res.data.data;
    },
    onSuccess: () => {
      refetchSprints();
      refetchBacklog();
      refetchSprintTasks();
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
    },
  });

  // Move Task between Sprints Mutation
  const mapTaskSprintMutation = useMutation({
    mutationFn: async ({
      taskId,
      targetSprintId,
    }: {
      taskId: string;
      targetSprintId: string | null;
    }) => {
      const res = await api.patch(`/tasks/${taskId}`, { sprintId: targetSprintId });
      return res.data.data;
    },
    onSuccess: () => {
      refetchBacklog();
      refetchSprintTasks();
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
    },
  });

  const handleCreateSprint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName.trim() || !sStart || !sEnd) return;
    setSError(null);
    createSprintMutation.mutate({
      name: sName,
      goal: sGoal,
      startDate: new Date(sStart).toISOString(),
      endDate: new Date(sEnd).toISOString(),
    });
  };

  const toggleSprintExpand = (sprintId: string) => {
    setExpandedSprintIds((prev) => ({
      ...prev,
      [sprintId]: !prev[sprintId],
    }));
  };

  const getSprintTasksList = (sprintId: string) => {
    return sprintTasks?.filter((t) => t.sprintId === sprintId) || [];
  };

  const getSprintTotalPoints = (sprintId: string) => {
    const list = getSprintTasksList(sprintId);
    return list.reduce((sum, t) => sum + (t.estimate || 0), 0);
  };

  const isAnySprintActive = sprints?.some((s) => s.status === "active") || false;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 text-slate-100 font-sans">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight font-display">
            Backlog & Sprints
          </h2>
          <p className="text-xs text-slate-500">
            Plan sprints, allocate tasks, and verify estimates.
          </p>
        </div>

        <button
          onClick={() => setIsSprintModalOpen(true)}
          className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white transition shadow-lg shadow-brand-600/10"
        >
          <Plus className="h-4 w-4" />
          <span>Create Sprint</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* --- SECTION A: ACTIVE & PLANNED SPRINTS LIST --- */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
            <Layers className="h-5 w-5 text-brand-500" />
            <span>Sprints list</span>
          </h3>

          {isSprintsLoading ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-6 w-6 text-brand-500 animate-spin" />
            </div>
          ) : sprints && sprints.length > 0 ? (
            sprints.map((sprint) => {
              const isOpen = expandedSprintIds[sprint._id] ?? true;
              const tasksInSprint = getSprintTasksList(sprint._id);
              const totalPoints = getSprintTotalPoints(sprint._id);

              return (
                <div
                  key={sprint._id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/20 overflow-hidden"
                >
                  {/* Sprint Header Panel */}
                  <div className="flex items-center justify-between bg-slate-950/60 px-5 py-4 border-b border-slate-800/80">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => toggleSprintExpand(sprint._id)}
                        className="text-slate-400 hover:text-white"
                      >
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center space-x-2.5">
                          <span className="text-sm font-bold text-white">{sprint.name}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              sprint.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : sprint.status === "completed"
                                  ? "bg-slate-800 text-slate-400"
                                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {sprint.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 max-w-lg truncate">
                          {sprint.goal || "No goal specified."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500 font-semibold">
                        <Calendar className="h-4 w-4 text-slate-600" />
                        <span>
                          {new Date(sprint.startDate).toLocaleDateString()} -{" "}
                          {new Date(sprint.endDate).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="text-xs font-bold bg-slate-900 border border-slate-850 px-3 py-1 rounded-lg">
                        <span className="text-slate-400">{tasksInSprint.length} tasks</span>
                        <span className="text-slate-700 mx-2">|</span>
                        <span className="text-brand-400">{totalPoints} SP</span>
                      </div>

                      {/* Sprint status triggers */}
                      {sprint.status === "planned" && (
                        <button
                          onClick={() => startSprintMutation.mutate(sprint._id)}
                          disabled={isAnySprintActive}
                          className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white disabled:opacity-50 transition"
                          title={
                            isAnySprintActive ? "Complete the active sprint first" : "Start Sprint"
                          }
                        >
                          <Play className="h-3.5 w-3.5 fill-white" />
                          <span>Start</span>
                        </button>
                      )}

                      {sprint.status === "active" && (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                "Are you sure you want to complete this sprint? Incomplete tasks will roll back to backlog."
                              )
                            ) {
                              completeSprintMutation.mutate(sprint._id);
                            }
                          }}
                          className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Complete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sprint tasks items list */}
                  {isOpen && (
                    <div className="p-4 space-y-2.5">
                      {tasksInSprint.map((task) => (
                        <div
                          key={task._id}
                          className="flex items-center justify-between rounded-xl bg-slate-900/40 p-4 border border-slate-850/60 hover:bg-slate-900 transition"
                        >
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider">
                              {task.key}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                              {task.type}
                            </span>
                            <p className="text-sm font-semibold text-slate-200 truncate">
                              {task.title}
                            </p>
                          </div>

                          <div className="flex items-center space-x-4 shrink-0">
                            {task.estimate > 0 && (
                              <span className="text-xs font-bold text-slate-400 font-mono bg-slate-850 px-2 py-0.5 rounded">
                                {task.estimate} SP
                              </span>
                            )}

                            {/* Option to send back to backlog */}
                            {sprint.status === "planned" && (
                              <button
                                onClick={() =>
                                  mapTaskSprintMutation.mutate({
                                    taskId: task._id,
                                    targetSprintId: null,
                                  })
                                }
                                className="text-xs text-slate-500 hover:text-white"
                              >
                                Move to Backlog
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {tasksInSprint.length === 0 && (
                        <p className="text-center text-xs text-slate-500 py-6">
                          No tasks allocated to this sprint. Move tasks from the backlog below.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-slate-800 p-8 text-center text-slate-500">
              No sprints planned for this project yet. Use "Create Sprint" to define a planning
              timebox.
            </div>
          )}
        </div>

        {/* --- SECTION B: BACKLOG TASKS LIST --- */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/20 overflow-hidden">
          <div className="flex items-center justify-between bg-slate-950/60 px-5 py-4 border-b border-slate-800/80">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-brand-500" />
              <span>Project Backlog</span>
            </h3>

            <div className="text-xs font-bold bg-slate-900 border border-slate-850 px-3 py-1 rounded-lg">
              <span className="text-slate-400">{(backlogTasks || []).length} unassigned tasks</span>
              <span className="text-slate-700 mx-2">|</span>
              <span className="text-brand-400">
                {(backlogTasks || []).reduce((sum, t) => sum + (t.estimate || 0), 0)} SP
              </span>
            </div>
          </div>

          <div className="p-4 space-y-2.5">
            {isBacklogLoading ? (
              <div className="flex h-20 items-center justify-center">
                <Loader2 className="h-6 w-6 text-brand-500 animate-spin" />
              </div>
            ) : backlogTasks && backlogTasks.length > 0 ? (
              backlogTasks.map((task) => (
                <div
                  key={task._id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl bg-slate-900/40 p-4 border border-slate-850/60 hover:bg-slate-900 transition gap-4"
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider">
                      {task.key}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {task.type}
                    </span>
                    <p className="text-sm font-semibold text-slate-200 truncate">{task.title}</p>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                    {task.estimate > 0 && (
                      <span className="text-xs font-bold text-slate-400 font-mono bg-slate-850 px-2 py-0.5 rounded">
                        {task.estimate} SP
                      </span>
                    )}

                    {/* Sprint allocation picker dropdown */}
                    {sprints && sprints.length > 0 ? (
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val)
                            mapTaskSprintMutation.mutate({ taskId: task._id, targetSprintId: val });
                        }}
                        className="text-xs rounded-lg border border-slate-850 bg-slate-950 px-2.5 py-1 text-slate-400 focus:border-brand-500 focus:outline-none cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Move to Sprint...
                        </option>
                        {sprints
                          .filter((s) => s.status !== "completed")
                          .map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span className="text-[10px] text-slate-500">
                        Create a sprint to allocate
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-slate-500 py-6">
                Backlog is empty. Create tasks directly inside the Kanban Board columns or list.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* --- CREATE SPRINT MODAL --- */}
      {isSprintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-white">Create Sprint</h3>
            <p className="mt-1 text-sm text-slate-400">
              Establish a timeboxed agile execution container.
            </p>

            {sError && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                {sError}
              </div>
            )}

            <form onSubmit={handleCreateSprint} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Sprint Name
                </label>
                <input
                  type="text"
                  required
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-brand-500 focus:outline-none"
                  placeholder="e.g. Sprint 3 — Recharts Analytics"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Sprint Goal statement
                </label>
                <textarea
                  value={sGoal}
                  onChange={(e) => setSGoal(e.target.value)}
                  rows={2}
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white focus:border-brand-500 focus:outline-none resize-none text-sm"
                  placeholder="e.g. Finalize metrics pipelines and charts rendering..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={sStart}
                    onChange={(e) => setSStart(e.target.value)}
                    className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-slate-300 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={sEnd}
                    onChange={(e) => setSEnd(e.target.value)}
                    className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-slate-300 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSprintModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSprintMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white disabled:opacity-50 transition shadow-lg shadow-brand-600/20"
                >
                  {createSprintMutation.isPending ? "Creating..." : "Create Sprint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
