import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  Loader2,
  TrendingDown,
  BarChart3,
  AlertCircle,
  Users,
  CheckCircle,
  PieChartIcon,
} from "lucide-react";

const COLORS = ["#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981"]; // todo, inprogress, inreview, done

export default function AnalyticsDashboard() {
  const { projectId } = useParams();

  // Fetch Overview metrics
  const { data: overview, isLoading: isOverviewLoading } = useQuery({
    queryKey: ["project-analytics-overview", projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/analytics/overview`);
      return res.data.data;
    },
    enabled: !!projectId,
  });

  // Fetch Burndown metrics
  const { data: burndown, isLoading: isBurndownLoading } = useQuery({
    queryKey: ["project-analytics-burndown", projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/analytics/burndown`);
      return res.data.data;
    },
    enabled: !!projectId,
  });

  const isLoading = isOverviewLoading || isBurndownLoading;

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
        <p className="mt-4 text-sm text-slate-500 font-sans">Computing agile analytics...</p>
      </div>
    );
  }

  // Formatting Pie status data
  const statusData =
    overview?.statusBreakdown?.map((s: any) => ({
      name:
        s.status === "todo"
          ? "To Do"
          : s.status === "inprogress"
            ? "In Progress"
            : s.status === "inreview"
              ? "In Review"
              : s.status === "done"
                ? "Done"
                : "Backlog",
      value: s.count,
    })) || [];

  // Formatting Bar priority data
  const priorityData =
    overview?.priorityBreakdown?.map((p: any) => ({
      name: p.priority.toUpperCase(),
      Count: p.count,
    })) || [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 text-slate-100 font-sans space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight font-display">
          Project Analytics
        </h2>
        <p className="text-xs text-slate-500">
          Track sprint velocity, backlog composition, and workloads.
        </p>
      </div>

      {/* Overview Stat Widgets */}
      <div className="grid gap-6 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Tasks</span>
            <p className="text-3xl font-extrabold text-white mt-1">{overview?.totalTasks || 0}</p>
          </div>
          <div className="h-10 w-10 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-400">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Completed</span>
            <p className="text-3xl font-extrabold text-emerald-400 mt-1">
              {overview?.completedTasks || 0}
            </p>
          </div>
          <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Overdue Tasks</span>
            <p className="text-3xl font-extrabold text-red-400 mt-1">
              {overview?.overdueCount || 0}
            </p>
          </div>
          <div className="h-10 w-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-400">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Active Sprint</span>
            <p className="text-sm font-bold text-white mt-2 truncate max-w-[150px]">
              {burndown?.activeSprint?.name || "None active"}
            </p>
          </div>
          <div className="h-10 w-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Burndown line chart */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
          <TrendingDown className="h-5 w-5 text-brand-500" />
          <span>Active Sprint Burndown</span>
        </h3>

        {burndown?.activeSprint ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndown.burndownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  label={{
                    value: "Story Points",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#64748b",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderRadius: "12px",
                    border: "1px solid #334155",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="ideal"
                  name="Ideal Remaining"
                  stroke="#64748b"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Remaining"
                  stroke="#4865f5"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <TrendingDown className="h-12 w-12 text-slate-700 mb-2" />
            <p className="text-sm">There is no active sprint for this project currently.</p>
            <p className="text-xs text-slate-600 mt-1">
              Start a sprint in the Backlog page to compile burndown charts.
            </p>
          </div>
        )}
      </div>

      {/* Pie/Donut & Bar charts grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Donut status chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
            <PieChartIcon className="h-5 w-5 text-brand-500" />
            <span>Task status distribution</span>
          </h3>
          {statusData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "12px",
                      border: "1px solid #334155",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-xs text-slate-500 py-20">No task statuses compiled.</p>
          )}
        </div>

        {/* Priority Bar chart */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-brand-500" />
            <span>Tasks by Priority</span>
          </h3>
          {priorityData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "12px",
                      border: "1px solid #334155",
                    }}
                  />
                  <Bar dataKey="Count" fill="#8b5cf6" radius={[6, 6, 0, 0]}>
                    {priorityData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.name === "URGENT"
                            ? "#ef4444"
                            : entry.name === "HIGH"
                              ? "#f59e0b"
                              : "#8b5cf6"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-center text-xs text-slate-500 py-20">No priority task counts.</p>
          )}
        </div>
      </div>

      {/* Member Workloads List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
          <Users className="h-5 w-5 text-brand-500" />
          <span>Team Workload Distribution</span>
        </h3>

        <div className="space-y-4">
          {overview?.workloadBreakdown && overview.workloadBreakdown.length > 0 ? (
            overview.workloadBreakdown.map((member: any) => (
              <div
                key={member.userId}
                className="flex items-center justify-between rounded-xl bg-slate-950/40 p-4 border border-slate-800/80"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={
                      member.avatarUrl ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${member.name}`
                    }
                    alt="Avatar"
                    className="h-9 w-9 rounded-full object-cover border border-slate-700"
                  />
                  <div>
                    <span className="text-sm font-bold text-white">{member.name}</span>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-6 text-right">
                  <div className="text-xs font-semibold">
                    <p className="text-slate-400">{member.taskCount} tasks assigned</p>
                    <p className="text-brand-400 mt-0.5">{member.totalPoints || 0} Story Points</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-xs text-slate-500 py-10">
              No member workloads compiled.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
