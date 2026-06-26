import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import TaskDetailModal from "../tasks/TaskDetailModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useAuthStore } from "../../stores/authStore";
import { usePresenceStore } from "../../stores/presenceStore";
import {
  Plus,
  Search,
  Filter,
  CheckSquare,
  AlertTriangle,
  ArrowUp,
  Tag,
  Loader2,
  Calendar,
  Layers,
  ArrowDown,
  Circle,
  HelpCircle,
  Clock,
} from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Board, Task, User, BoardColumn, Project } from "../../types";

// --- 1. SORTABLE TASK CARD ITEM ---
function SortableCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const getPriorityIcon = (p: string) => {
    switch (p) {
      case "urgent":
        return <AlertTriangle className="h-3.5 w-3.5 text-red-500 fill-red-500/10" />;
      case "high":
        return <ArrowUp className="h-3.5 w-3.5 text-amber-500" />;
      case "low":
        return <ArrowDown className="h-3.5 w-3.5 text-slate-400" />;
      default:
        return <Circle className="h-3.5 w-3.5 text-brand-400" />;
    }
  };

  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter((s) => s.isCompleted).length || 0;
  const progressPercent =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="group relative rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow hover:border-brand-500/50 hover:bg-slate-900 transition duration-200 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider">
          {task.key}
        </span>
        <div className="flex items-center space-x-1 shrink-0">
          {getPriorityIcon(task.priority)}
          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-850">
            {task.type}
          </span>
        </div>
      </div>

      <h4 className="mt-2 text-sm font-semibold text-slate-200 group-hover:text-white transition line-clamp-2">
        {task.title}
      </h4>

      {/* Tags */}
      {task.labels && task.labels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {task.labels.map((l, i) => (
            <span
              key={i}
              className="text-[9px] font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-md"
            >
              {l}
            </span>
          ))}
        </div>
      )}

      {/* Subtask progress bar */}
      {totalSubtasks > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
            <span className="flex items-center space-x-1">
              <CheckSquare className="h-3 w-3" />
              <span>
                {completedSubtasks}/{totalSubtasks} Checklist
              </span>
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1 w-full rounded-full bg-slate-850 overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Card Footer info */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-800/60 pt-3">
        <div className="flex items-center space-x-2 text-slate-500">
          {task.dueDate && (
            <div className="flex items-center space-x-1 text-[10px]">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(task.dueDate).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
          {task.estimate > 0 && (
            <span className="text-[10px] font-bold text-slate-400 font-mono bg-slate-850 px-1.5 py-0.5 rounded">
              {task.estimate} SP
            </span>
          )}
        </div>

        {/* Assignees avatars */}
        <div className="flex -space-x-1.5 overflow-hidden">
          {task.assigneeIds?.map((assignee) => (
            <img
              key={assignee._id}
              src={
                assignee.avatarUrl ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${assignee.name}`
              }
              alt={assignee.name}
              title={assignee.name}
              className="h-5.5 w-5.5 rounded-full object-cover border border-slate-900"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// --- 2. BOARD COLUMN ---
interface ColumnProps {
  id: string;
  name: string;
  tasks: Task[];
  onCardClick: (task: Task) => void;
  onAddTaskClick: (colId: string) => void;
}

function BoardColumnContainer({ id, name, tasks, onCardClick, onAddTaskClick }: ColumnProps) {
  return (
    <div className="flex w-72 flex-col rounded-2xl border border-slate-800 bg-slate-950/40 p-4 h-full min-h-[500px]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-extrabold text-white font-display uppercase tracking-wider">
            {name}
          </span>
          <span className="text-xs font-bold text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTaskClick(id)}
          className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-900 transition"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Sortable Tasks List Container */}
      <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {tasks.map((task) => (
            <SortableCard key={task._id} task={task} onClick={() => onCardClick(task)} />
          ))}
          {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-850/50 rounded-xl text-slate-600 text-xs">
              Drag tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// --- 3. KANBAN BOARD COMPONENT ---
export default function KanbanBoard() {
  const { wsSlug, projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTaskId = searchParams.get("task");

  // Filter conditions state
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Create Task state modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [targetColId, setTargetColId] = useState("todo");
  const [tTitle, setTTitle] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tPriority, setTPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [tType, setTType] = useState<"task" | "bug" | "story" | "epic">("task");
  const [tEstimate, setTEstimate] = useState(0);
  const [tAssignee, setTAssignee] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require dragging 8px to distinguish click from drag
      },
    })
  );

  // Fetch Board
  const {
    data: boardData,
    isLoading,
    refetch: refetchBoard,
  } = useQuery({
    queryKey: ["board", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await api.get(`/projects/${projectId}/board`);
      return res.data.data as Board;
    },
    enabled: !!projectId,
  });

  // Fetch Project members
  const { data: projectDetails } = useQuery({
    queryKey: ["project-details", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const res = await api.get(`/projects/${projectId}`);
      return res.data.data as Project;
    },
    enabled: !!projectId,
  });

  // Move Task Mutation
  const moveTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      columnId,
      position,
    }: {
      taskId: string;
      columnId: string;
      position: number;
    }) => {
      const res = await api.patch(`/tasks/${taskId}/move`, { columnId, position });
      return res.data.data;
    },
    onSuccess: () => {
      refetchBoard();
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const res = await api.post(`/projects/${projectId}/tasks`, taskData);
      return res.data.data;
    },
    onSuccess: () => {
      setIsTaskModalOpen(false);
      setTTitle("");
      setTDesc("");
      setTPriority("medium");
      setTType("task");
      setTEstimate(0);
      setTAssignee("");
      refetchBoard();
    },
  });

  // DRAG AND DROP HANDLERS
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Find task
    if (boardData) {
      for (const col of boardData.columns) {
        const found = col.taskIds.find((t) => t._id === active.id);
        if (found) {
          setActiveTask(found);
          break;
        }
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !boardData) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Find active task column
    let sourceCol: BoardColumn | null = null;
    let targetCol: BoardColumn | null = null;

    for (const col of boardData.columns) {
      if (col.taskIds.some((t) => t._id === activeId)) {
        sourceCol = col;
      }
      if (col.id === overId || col.taskIds.some((t) => t._id === overId)) {
        targetCol = col;
      }
    }

    if (!sourceCol || !targetCol) return;

    // Determine target index position
    let targetIndex = 0;
    if (targetCol.id === overId) {
      // Dropped directly on column background -> insert at end
      targetIndex = targetCol.taskIds.length;
    } else {
      // Dropped over another task
      targetIndex = targetCol.taskIds.findIndex((t) => t._id === overId);
    }

    // Adjust targetIndex if dropped in same column to account for element splice offset
    if (sourceCol.id === targetCol.id) {
      const currentIndex = sourceCol.taskIds.findIndex((t) => t._id === activeId);
      if (currentIndex === targetIndex) return; // Same spot
    }

    // Apply mutation
    moveTaskMutation.mutate({
      taskId: activeId,
      columnId: targetCol.id,
      position: targetIndex,
    });

    // Optimistic UI update locally before server returns
    // Pull from source
    const activeTaskObj = sourceCol.taskIds.find((t) => t._id === activeId)!;
    sourceCol.taskIds = sourceCol.taskIds.filter((t) => t._id !== activeId);
    // Push to target
    targetCol.taskIds.splice(targetIndex, 0, activeTaskObj);
  };

  const handleAddTaskClick = (colId: string) => {
    setTargetColId(colId);
    setIsTaskModalOpen(true);
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tTitle.trim()) return;

    const payload = {
      title: tTitle,
      description: tDesc,
      status: targetColId,
      priority: tPriority,
      type: tType,
      estimate: tEstimate,
      assigneeIds: tAssignee ? [tAssignee] : [],
    };

    createTaskMutation.mutate(payload);
  };

  const getFilteredTasks = (tasks: Task[]) => {
    return tasks.filter((t) => {
      const matchSearch =
        search === "" ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.key.toLowerCase().includes(search.toLowerCase());

      const matchPriority = filterPriority === "" || t.priority === filterPriority;

      const matchAssignee =
        filterAssignee === "" || t.assigneeIds.some((a) => a._id === filterAssignee);

      return matchSearch && matchPriority && matchAssignee;
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
        <p className="mt-4 text-sm text-slate-500">Loading Kanban Board...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col px-6 py-6 overflow-hidden">
      {/* Board Controls Panel */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight font-display">
            Sprint Kanban
          </h2>
          <p className="text-xs text-slate-500">
            Drag cards between columns to change task status.
          </p>
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full sm:w-48 rounded-xl border border-slate-800 bg-slate-950 py-2 pl-9 pr-4 text-xs text-white focus:border-brand-500 focus:outline-none"
              placeholder="Search keys, titles..."
            />
          </div>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400 focus:border-brand-500 focus:outline-none"
          >
            <option value="">Any Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400 focus:border-brand-500 focus:outline-none"
          >
            <option value="">Any Assignee</option>
            {projectDetails?.members?.map((m: any) => (
              <option key={m.userId._id} value={m.userId._id}>
                {m.userId.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. DRAG AND DROP BOARD GRID */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex gap-5 overflow-x-auto pb-4 no-scrollbar">
          {boardData?.columns?.map((col) => {
            const filteredTasks = getFilteredTasks(col.taskIds);
            return (
              <BoardColumnContainer
                key={col.id}
                id={col.id}
                name={col.name}
                tasks={filteredTasks}
                onCardClick={(t) =>
                  navigate(`/workspaces/${wsSlug}/projects/${projectId}/board?task=${t._id}`)
                }
                onAddTaskClick={handleAddTaskClick}
              />
            );
          })}
        </div>

        {/* Drag Overlay card to show exactly what element is being dragged */}
        <DragOverlay>
          {activeTask ? (
            <div className="rounded-xl border border-brand-500 bg-slate-900 p-4 shadow-2xl opacity-80 cursor-grabbing">
              <span className="text-[10px] font-bold text-slate-500 font-mono">
                {activeTask.key}
              </span>
              <h4 className="mt-1 text-sm font-semibold text-slate-200">{activeTask.title}</h4>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 5. CREATE TASK MODAL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-white">Add Sprint Task</h3>
            <p className="mt-1 text-sm text-slate-400">
              Initialize a task card in the {targetColId} column.
            </p>

            <form onSubmit={handleAddTaskSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={tTitle}
                  onChange={(e) => setTTitle(e.target.value)}
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                  placeholder="Summarize the action item..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Description
                </label>
                <textarea
                  value={tDesc}
                  onChange={(e) => setTDesc(e.target.value)}
                  rows={4}
                  className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none resize-none text-sm"
                  placeholder="Task markdown description details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Task Type
                  </label>
                  <select
                    value={tType}
                    onChange={(e: any) => setTType(e.target.value)}
                    className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-brand-500 focus:outline-none"
                  >
                    <option value="task">Task</option>
                    <option value="bug">Bug</option>
                    <option value="story">Story</option>
                    <option value="epic">Epic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Priority
                  </label>
                  <select
                    value={tPriority}
                    onChange={(e: any) => setTPriority(e.target.value)}
                    className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-brand-500 focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Assignee
                  </label>
                  <select
                    value={tAssignee}
                    onChange={(e) => setTAssignee(e.target.value)}
                    className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-slate-300 focus:border-brand-500 focus:outline-none text-sm"
                  >
                    <option value="">Unassigned</option>
                    {projectDetails?.members?.map((m: any) => (
                      <option key={m.userId._id} value={m.userId._id}>
                        {m.userId.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Story Points Estimate
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={tEstimate}
                    onChange={(e) => setTEstimate(Number(e.target.value))}
                    className="block w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-sm font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white disabled:opacity-50 transition shadow-lg shadow-brand-600/20"
                >
                  {createTaskMutation.isPending ? "Adding..." : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Side-Panel/Modal */}
      {activeTaskId && (
        <TaskDetailModal
          taskId={activeTaskId}
          onClose={() => {
            searchParams.delete("task");
            setSearchParams(searchParams);
          }}
        />
      )}
    </div>
  );
}
