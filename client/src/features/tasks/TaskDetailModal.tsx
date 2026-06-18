import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";
import { usePresenceStore } from "../../stores/presenceStore";
import {
  X,
  User,
  Calendar,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Circle,
  Clock,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Trash2,
  Plus,
  Loader2,
  Trash,
} from "lucide-react";
import { Task, Comment, User as IUserType } from "../../types";

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
}

export default function TaskDetailModal({ taskId, onClose }: TaskDetailModalProps) {
  const queryClient = useQueryClient();
  const { wsSlug, projectId } = useParams();
  const navigate = useNavigate();
  const { socket } = usePresenceStore();

  const [commentText, setCommentText] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");

  // Fetch Task Details
  const {
    data: task,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["task", taskId],
    queryFn: async () => {
      const res = await api.get(`/tasks/${taskId}`);
      return res.data.data as Task;
    },
    enabled: !!taskId,
  });

  // Fetch Comments
  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ["comments", taskId],
    queryFn: async () => {
      const res = await api.get(`/tasks/${taskId}/comments`);
      return res.data.data as Comment[];
    },
    enabled: !!taskId,
  });

  // Fetch project details for assignees list
  const { data: projectDetails } = useQuery({
    queryKey: ["project-details", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await api.get(`/projects/${projectId}`);
      return res.data.data;
    },
    enabled: !!projectId,
  });

  // Socket listener for comments
  useEffect(() => {
    if (!socket) return;

    const handleNewComment = (comment: Comment) => {
      if (comment.taskId === taskId) {
        refetchComments();
      }
    };

    socket.on("comment:created", handleNewComment);
    return () => {
      socket.off("comment:created", handleNewComment);
    };
  }, [socket, taskId, refetchComments]);

  // Mutations
  const updateTaskMutation = useMutation({
    mutationFn: async (updatedFields: any) => {
      const res = await api.patch(`/tasks/${taskId}`, updatedFields);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await api.post(`/tasks/${taskId}/comments`, { body });
      return res.data.data;
    },
    onSuccess: () => {
      setCommentText("");
      refetchComments();
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
      onClose();
    },
  });

  // Actions
  const handleToggleSubtask = (subId: string, isCompleted: boolean) => {
    if (!task) return;
    const updatedSubtasks = task.subtasks.map((s) => (s.id === subId ? { ...s, isCompleted } : s));
    updateTaskMutation.mutate({ subtasks: updatedSubtasks });
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskTitle.trim() || !task) return;
    const newSubtask = {
      id: `sub-${Math.random().toString(36).substr(2, 9)}`,
      title: subtaskTitle,
      isCompleted: false,
    };
    const updatedSubtasks = [...task.subtasks, newSubtask];
    updateTaskMutation.mutate({ subtasks: updatedSubtasks });
    setSubtaskTitle("");
  };

  const handleDeleteSubtask = (subId: string) => {
    if (!task) return;
    const updatedSubtasks = task.subtasks.filter((s) => s.id !== subId);
    updateTaskMutation.mutate({ subtasks: updatedSubtasks });
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    createCommentMutation.mutate(commentText);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
        <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
        <div className="rounded-xl bg-slate-900 p-6 text-center">
          <p className="text-red-400">Failed to load task details.</p>
          <button onClick={onClose} className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl h-[85vh] rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col md:flex-row shadow-2xl">
        {/* LEFT COMPONENT: Task Meta details & Comments */}
        <div className="flex-1 p-6 overflow-y-auto border-r border-slate-800 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-slate-500 font-mono tracking-wider bg-slate-850 px-2.5 py-1 rounded-full uppercase">
                {task.key}
              </span>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to delete this task card?")) {
                    deleteTaskMutation.mutate();
                  }
                }}
                className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-850 transition"
                title="Delete Task"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            </div>

            <input
              type="text"
              defaultValue={task.title}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== task.title) {
                  updateTaskMutation.mutate({ title: e.target.value });
                }
              }}
              className="text-2xl font-bold bg-transparent border-0 text-white w-full focus:outline-none focus:bg-slate-850 px-2 py-1 rounded-xl focus:ring-1 focus:ring-brand-500"
            />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Description
              </label>
              <textarea
                defaultValue={task.description}
                onBlur={(e) => {
                  if (e.target.value !== task.description) {
                    updateTaskMutation.mutate({ description: e.target.value });
                  }
                }}
                rows={4}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 focus:border-brand-500 focus:outline-none resize-none"
                placeholder="Write description in markdown format..."
              />
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Checklist Subtasks
              </label>
              <div className="space-y-2.5">
                {task.subtasks?.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-xl bg-slate-950/20 p-2.5 border border-slate-850/60"
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={sub.isCompleted}
                        onChange={(e) => handleToggleSubtask(sub.id, e.target.checked)}
                        className="rounded border-slate-800 bg-slate-950 text-brand-600 focus:ring-brand-500/20 h-4 w-4"
                      />
                      <span
                        className={`text-sm ${sub.isCompleted ? "line-through text-slate-500" : "text-slate-200"}`}
                      >
                        {sub.title}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteSubtask(sub.id)}
                      className="text-slate-600 hover:text-red-400 p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  placeholder="Add a checklist item..."
                  className="flex-1 rounded-xl border border-slate-850 bg-slate-950 px-4 py-2 text-xs text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Comments Thread */}
            <div className="space-y-4 pt-6 border-t border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <MessageSquare className="h-4.5 w-4.5 text-brand-500" />
                <span>Comments Thread</span>
              </h4>

              <div className="space-y-4 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                {comments && comments.length > 0 ? (
                  comments.map((c) => (
                    <div key={c._id} className="flex space-x-3 items-start">
                      <img
                        src={
                          c.authorId.avatarUrl ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${c.authorId.name}`
                        }
                        alt="Avatar"
                        className="h-8 w-8 rounded-full border border-slate-700 object-cover"
                      />
                      <div className="flex-1 rounded-2xl bg-slate-950/40 border border-slate-850/60 p-3 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-200">{c.authorId.name}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(c.createdAt).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{c.body}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-slate-500 py-6">
                    No feedback comments posted yet.
                  </p>
                )}
              </div>

              {/* Comment submission form */}
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Post an update comment..."
                  className="flex-1 rounded-xl border border-slate-850 bg-slate-950 px-4 py-2.5 text-xs text-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={createCommentMutation.isPending}
                  className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition disabled:opacity-50"
                >
                  Comment
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* RIGHT COMPONENT: Config panels */}
        <div className="w-full md:w-80 bg-slate-950/60 p-6 space-y-6 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-white">Task Details</span>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                Task Status
              </label>
              <select
                value={task.status}
                onChange={(e) => updateTaskMutation.mutate({ status: e.target.value })}
                className="w-full text-sm rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-slate-200 focus:outline-none"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="inreview">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Assignees */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                Assignee
              </label>
              <select
                value={task.assigneeIds?.[0]?._id || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  updateTaskMutation.mutate({ assigneeIds: val ? [val] : [] });
                }}
                className="w-full text-sm rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-slate-200 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {projectDetails?.members?.map((m: any) => (
                  <option key={m.userId._id} value={m.userId._id}>
                    {m.userId.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority and Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  Priority
                </label>
                <select
                  value={task.priority}
                  onChange={(e: any) => updateTaskMutation.mutate({ priority: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-slate-200 focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  Task Type
                </label>
                <select
                  value={task.type}
                  onChange={(e: any) => updateTaskMutation.mutate({ type: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-slate-200 focus:outline-none"
                >
                  <option value="task">Task</option>
                  <option value="bug">Bug</option>
                  <option value="story">Story</option>
                  <option value="epic">Epic</option>
                </select>
              </div>
            </div>

            {/* Story Points */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                Story Points
              </label>
              <input
                type="number"
                min={0}
                defaultValue={task.estimate}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val !== task.estimate) {
                    updateTaskMutation.mutate({ estimate: val });
                  }
                }}
                className="w-full text-sm rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-white focus:outline-none"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                Due Date
              </label>
              <input
                type="date"
                defaultValue={
                  task.dueDate ? new Date(task.dueDate).toISOString().substr(0, 10) : ""
                }
                onBlur={(e) => {
                  const val = e.target.value;
                  const isoVal = val ? new Date(val).toISOString() : null;
                  if (isoVal !== (task.dueDate ? new Date(task.dueDate).toISOString() : null)) {
                    updateTaskMutation.mutate({ dueDate: isoVal });
                  }
                }}
                className="w-full text-sm rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-4 space-y-1 mt-6">
            <p>Created by: {(task.reporterId as any)?.name || "System"}</p>
            <p>Created: {new Date(task.createdAt).toLocaleString()}</p>
            <p>Last updated: {new Date(task.updatedAt).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
