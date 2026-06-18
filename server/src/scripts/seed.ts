import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User";
import Workspace from "../models/Workspace";
import Project from "../models/Project";
import Board from "../models/Board";
import Sprint from "../models/Sprint";
import Task from "../models/Task";
import Comment from "../models/Comment";
import ActivityLog from "../models/ActivityLog";
import Notification from "../models/Notification";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/teamflow";

const seed = async () => {
  try {
    console.log("Connecting to database for seeding...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected. Clearing old collections...");

    // Clear old data
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await Project.deleteMany({});
    await Board.deleteMany({});
    await Sprint.deleteMany({});
    await Task.deleteMany({});
    await Comment.deleteMany({});
    await ActivityLog.deleteMany({});
    await Notification.deleteMany({});

    console.log("Collections cleared. Creating seed users...");

    const passwordHash = await bcrypt.hash("password123", 10);

    const admin = await User.create({
      name: "Manas Admin",
      email: "admin@teamflow.com",
      passwordHash,
      role: "admin",
      isEmailVerified: true,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
      lastLoginAt: new Date(),
    });

    const dev1 = await User.create({
      name: "Sarah Developer",
      email: "sarah@teamflow.com",
      passwordHash,
      role: "member",
      isEmailVerified: true,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
      lastLoginAt: new Date(),
    });

    const dev2 = await User.create({
      name: "Alex Designer",
      email: "alex@teamflow.com",
      passwordHash,
      role: "member",
      isEmailVerified: true,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
      lastLoginAt: new Date(),
    });

    const client = await User.create({
      name: "John Client",
      email: "client@teamflow.com",
      passwordHash,
      role: "member",
      isEmailVerified: true,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
      lastLoginAt: new Date(),
    });

    console.log("Users created. Creating Workspace...");

    const workspace = await Workspace.create({
      name: "Acme Corporation",
      slug: "acme-corp",
      description: "Acme Corp primary delivery and project coordination workspace.",
      ownerId: admin._id,
      logoUrl: "",
      members: [
        { userId: admin._id, role: "owner", joinedAt: new Date() },
        { userId: dev1._id, role: "admin", joinedAt: new Date() },
        { userId: dev2._id, role: "member", joinedAt: new Date() },
        { userId: client._id, role: "viewer", joinedAt: new Date() },
      ],
    });

    console.log("Workspace created. Creating Projects...");

    // Project 1: TeamFlow Platform
    const p1 = await Project.create({
      workspaceId: workspace._id,
      name: "TeamFlow Platform",
      key: "FLOW",
      description: "Building the next generation collaborative dashboard for agile teams.",
      status: "active",
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days ahead
      members: [
        { userId: admin._id, role: "admin" },
        { userId: dev1._id, role: "member" },
        { userId: dev2._id, role: "member" },
        { userId: client._id, role: "viewer" },
      ],
      color: "#4865f5",
      icon: "Layers",
    });

    // Project 2: Mobile App Integration
    const p2 = await Project.create({
      workspaceId: workspace._id,
      name: "Mobile App Development",
      key: "MOB",
      description: "Scaffolding the React Native companion app for mobile notifications.",
      status: "active",
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      members: [
        { userId: admin._id, role: "admin" },
        { userId: dev1._id, role: "member" },
        { userId: dev2._id, role: "member" },
      ],
      color: "#ec4899",
      icon: "Smartphone",
    });

    console.log("Projects created. Creating Sprints...");

    // Sprints for Project 1 (FLOW)
    // Completed Sprint 1
    const s1_completed = await Sprint.create({
      projectId: p1._id,
      name: "Sprint 1 — Core Architecture",
      goal: "Establish monorepo, database models, express server, and core auth UI.",
      startDate: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000), // 17 days ago
      endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      status: "completed",
      taskIds: [],
    });

    // Active Sprint 2
    const s2_active = await Sprint.create({
      projectId: p1._id,
      name: "Sprint 2 — Board & Tasks",
      goal: "Implement Kanban board drag-and-drop, task detail modal, comments, and real-time collaboration.",
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12 days ahead
      status: "active",
      taskIds: [],
    });

    // Planned Sprint 3
    const s3_planned = await Sprint.create({
      projectId: p1._id,
      name: "Sprint 3 — Sprints & Analytics",
      goal: "Add sprint planning capabilities, burndown chart, workload analytics, and custom logging feed.",
      startDate: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
      status: "planned",
      taskIds: [],
    });

    // Active Sprint for Project 2 (MOB)
    const sMob_active = await Sprint.create({
      projectId: p2._id,
      name: "Sprint 1 — Mobilizing",
      goal: "Scaffold mobile workspace and setup expo routes.",
      startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
      status: "active",
      taskIds: [],
    });

    console.log("Sprints created. Creating Board schemas...");
    const board1 = await Board.create({
      projectId: p1._id,
      name: `${p1.name} Kanban`,
      columns: [
        { id: "backlog", name: "Backlog", order: 0, taskIds: [] },
        { id: "todo", name: "To Do", order: 1, taskIds: [] },
        { id: "inprogress", name: "In Progress", order: 2, taskIds: [] },
        { id: "inreview", name: "In Review", order: 3, taskIds: [] },
        { id: "done", name: "Done", order: 4, taskIds: [] },
      ],
    });

    const board2 = await Board.create({
      projectId: p2._id,
      name: `${p2.name} Kanban`,
      columns: [
        { id: "backlog", name: "Backlog", order: 0, taskIds: [] },
        { id: "todo", name: "To Do", order: 1, taskIds: [] },
        { id: "inprogress", name: "In Progress", order: 2, taskIds: [] },
        { id: "inreview", name: "In Review", order: 3, taskIds: [] },
        { id: "done", name: "Done", order: 4, taskIds: [] },
      ],
    });

    console.log("Boards created. Creating Tasks...");

    // Helpler function to push task to board column list
    const pushTaskToBoard = (boardDoc: any, colId: string, taskId: mongoose.Types.ObjectId) => {
      const col = boardDoc.columns.find((c: any) => c.id === colId);
      if (col) {
        col.taskIds.push(taskId);
      }
    };

    const createdTasks: any[] = [];

    // --- SPRINT 1 TASKS (FLOW - COMPLETED & DONE) ---
    const tData1 = [
      {
        key: "FLOW-1",
        title: "Configure TypeScript and monorepo workspaces",
        desc: "Setup root package and tsconfigs.",
        points: 2,
        assignee: dev1,
      },
      {
        key: "FLOW-2",
        title: "Scaffold Express HTTP server and Winston logger",
        desc: "Build standard entry files and folder configurations.",
        points: 3,
        assignee: admin,
      },
      {
        key: "FLOW-3",
        title: "Integrate Mongoose connection and schema indices",
        desc: "Configure local Mongo connections and model boundaries.",
        points: 3,
        assignee: dev1,
      },
      {
        key: "FLOW-4",
        title: "Implement JWT login, tokens and auth middlewares",
        desc: "Deploy access + rotated refresh cookie mechanics.",
        points: 5,
        assignee: dev1,
      },
      {
        key: "FLOW-5",
        title: "Setup workspace CRUD, invite structures",
        desc: "Allows creation of workspaces and member attachments.",
        points: 3,
        assignee: dev2,
      },
    ];

    for (const data of tData1) {
      const task = await Task.create({
        projectId: p1._id,
        boardId: board1._id,
        sprintId: s1_completed._id,
        key: data.key,
        title: data.title,
        description: data.desc,
        status: "done",
        priority: "medium",
        type: "task",
        assigneeIds: [data.assignee._id],
        reporterId: admin._id,
        labels: ["backend", "setup"],
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        estimate: data.points,
        position: board1.columns.find((c) => c.id === "done")!.taskIds.length,
        updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      });
      createdTasks.push(task);
      pushTaskToBoard(board1, "done", task._id as mongoose.Types.ObjectId);
      s1_completed.taskIds.push(task._id as mongoose.Types.ObjectId);
    }

    // --- SPRINT 2 TASKS (FLOW - ACTIVE - VARIOUS STATUSES) ---
    const tData2 = [
      {
        key: "FLOW-6",
        title: "Design Kanban Board layout with CSS grid",
        desc: "Build column UI containers with responsive variables.",
        status: "done",
        priority: "high",
        type: "story",
        points: 3,
        assignee: dev2,
        labels: ["frontend"],
      },
      {
        key: "FLOW-7",
        title: "Integrate @dnd-kit drag-and-drop board cards",
        desc: "Connect frontend dragging indicators to updates.",
        status: "inprogress",
        priority: "urgent",
        type: "task",
        points: 8,
        assignee: dev1,
        labels: ["frontend", "interactivity"],
      },
      {
        key: "FLOW-8",
        title: "Build Task Detail Modal and Checklist items",
        desc: "Creates slide-over detail container with checklist triggers.",
        status: "inprogress",
        priority: "high",
        type: "story",
        points: 5,
        assignee: dev2,
        labels: ["frontend"],
      },
      {
        key: "FLOW-9",
        title: "Establish Socket.io websocket rooms and broadcasts",
        desc: "Enable room attachments for real-time task mutations.",
        status: "inreview",
        priority: "urgent",
        type: "task",
        points: 5,
        assignee: dev1,
        labels: ["backend", "socket"],
      },
      {
        key: "FLOW-10",
        title: "Implement Task Commenting controller endpoints",
        desc: "Permits comments additions with mentions configurations.",
        status: "todo",
        priority: "medium",
        type: "task",
        points: 2,
        assignee: dev1,
        labels: ["backend"],
      },
      {
        key: "FLOW-11",
        title: "Verify access cookie rotation lifecycle tests",
        desc: "Checks logout, invalid tokens, and rate limits.",
        status: "todo",
        priority: "low",
        type: "bug",
        points: 1,
        assignee: dev1,
        labels: ["testing"],
      },
      {
        key: "FLOW-12",
        title: "Format Topbar notifications list and triggers",
        desc: "Displays bell notification cards inside details header.",
        status: "todo",
        priority: "medium",
        type: "story",
        points: 3,
        assignee: dev2,
        labels: ["frontend"],
      },
    ];

    for (const data of tData2) {
      const col = board1.columns.find((c) => c.id === data.status);
      const pos = col ? col.taskIds.length : 0;
      const task = await Task.create({
        projectId: p1._id,
        boardId: board1._id,
        sprintId: s2_active._id,
        key: data.key,
        title: data.title,
        description: data.desc,
        status: data.status,
        priority: data.priority,
        type: data.type,
        assigneeIds: [data.assignee._id],
        reporterId: admin._id,
        labels: data.labels,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        estimate: data.points,
        position: pos,
        subtasks: [
          { id: "sub1", title: "Database schemas configuration", isCompleted: true },
          { id: "sub2", title: "Frontend visual interfaces", isCompleted: data.status === "done" },
          { id: "sub3", title: "Unit testing validation", isCompleted: false },
        ],
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      });
      createdTasks.push(task);
      pushTaskToBoard(board1, data.status, task._id as mongoose.Types.ObjectId);
      s2_active.taskIds.push(task._id as mongoose.Types.ObjectId);
    }

    // --- SPRINT 3 TASKS (FLOW - PLANNED - ALL BACKLOG STATUS) ---
    const tData3 = [
      {
        key: "FLOW-13",
        title: "Configure MongoDB aggregation pipeline for active sprint burndown",
        desc: "Returns linear ideal vs actual point steps.",
        points: 5,
        assignee: dev1,
      },
      {
        key: "FLOW-14",
        title: "Build Workspace Overview Dashboard with Recharts",
        desc: "Renders task workload ratios and status ratios.",
        points: 5,
        assignee: dev2,
      },
      {
        key: "FLOW-15",
        title: "Implement Activity Audit trail cron logging",
        desc: "Aggregates logs list across project entities.",
        points: 3,
        assignee: dev1,
      },
    ];

    for (const data of tData3) {
      const task = await Task.create({
        projectId: p1._id,
        boardId: board1._id,
        sprintId: s3_planned._id,
        key: data.key,
        title: data.title,
        description: data.desc,
        status: "backlog",
        priority: "medium",
        type: "task",
        assigneeIds: [data.assignee._id],
        reporterId: admin._id,
        labels: ["analytics", "recharts"],
        dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        estimate: data.points,
        position: board1.columns.find((c) => c.id === "backlog")!.taskIds.length,
      });
      createdTasks.push(task);
      pushTaskToBoard(board1, "backlog", task._id as mongoose.Types.ObjectId);
      s3_planned.taskIds.push(task._id as mongoose.Types.ObjectId);
    }

    // --- PROJECT 2 ACTIVE SPRINT TASKS (MOB) ---
    const tDataMob = [
      {
        key: "MOB-1",
        title: "Initialize React Native Expo Workspace",
        desc: "Build app scaffolding and configs.",
        status: "inprogress",
        points: 3,
        assignee: dev1,
      },
      {
        key: "MOB-2",
        title: "Design mobile Login and workspace selection layout",
        desc: "Ensure sleek styles using standard views.",
        status: "todo",
        points: 3,
        assignee: dev2,
      },
      {
        key: "MOB-3",
        title: "Configure websocket client push channels",
        desc: "Receive notifications in background.",
        status: "todo",
        points: 5,
        assignee: dev1,
      },
    ];

    for (const data of tDataMob) {
      const col = board2.columns.find((c) => c.id === data.status);
      const pos = col ? col.taskIds.length : 0;
      const task = await Task.create({
        projectId: p2._id,
        boardId: board2._id,
        sprintId: sMob_active._id,
        key: data.key,
        title: data.title,
        description: data.desc,
        status: data.status,
        priority: "high",
        type: "task",
        assigneeIds: [data.assignee._id],
        reporterId: admin._id,
        labels: ["mobile", "expo"],
        dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        estimate: data.points,
        position: pos,
      });
      createdTasks.push(task);
      pushTaskToBoard(board2, data.status, task._id as mongoose.Types.ObjectId);
      sMob_active.taskIds.push(task._id as mongoose.Types.ObjectId);
    }

    // Save boards to store populated taskIds
    await board1.save();
    await board2.save();

    // Save sprints to store populated taskIds
    await s1_completed.save();
    await s2_active.save();
    await s3_planned.save();
    await sMob_active.save();

    console.log("Tasks created. Creating Comments...");

    // Add comments to active tasks (FLOW-7 and FLOW-8)
    const task7 = createdTasks.find((t) => t.key === "FLOW-7");
    const task8 = createdTasks.find((t) => t.key === "FLOW-8");

    if (task7) {
      await Comment.create([
        {
          taskId: task7._id,
          authorId: dev1._id,
          body: "Finished setting up the dragging context. Working on sorting elements within columns next.",
        },
        {
          taskId: task7._id,
          authorId: admin._id,
          body: "Great progress, Sarah! Make sure we trigger optimistic updates on the client UI so it feels snappy.",
        },
        {
          taskId: task7._id,
          authorId: dev1._id,
          body: "Will do. Emitting socket event `task:moved` on server as well so it updates in real time for other members.",
        },
      ]);
    }

    if (task8) {
      await Comment.create([
        {
          taskId: task8._id,
          authorId: dev2._id,
          body: "Do we want rich text support for the descriptions, or simple markdown?",
        },
        {
          taskId: task8._id,
          authorId: admin._id,
          body: "Simple markdown is excellent. Standard code blocks and links should render nicely.",
        },
      ]);
    }

    console.log("Comments created. Creating Activity Logs...");

    // Create activity logs for audit feed
    const logs: any[] = [
      {
        workspaceId: workspace._id,
        projectId: p1._id,
        actorId: admin._id,
        action: "project.created",
        targetType: "project",
        targetId: p1._id,
        metadata: { name: p1.name },
      },
      {
        workspaceId: workspace._id,
        projectId: p1._id,
        actorId: admin._id,
        action: "member.added",
        targetType: "project",
        targetId: p1._id,
        metadata: { userId: dev1._id, name: dev1.name },
      },
      {
        workspaceId: workspace._id,
        projectId: p1._id,
        actorId: admin._id,
        action: "member.added",
        targetType: "project",
        targetId: p1._id,
        metadata: { userId: dev2._id, name: dev2.name },
      },
      {
        workspaceId: workspace._id,
        projectId: p1._id,
        actorId: dev1._id,
        action: "sprint.started",
        targetType: "sprint",
        targetId: s1_completed._id,
        metadata: { name: s1_completed.name },
      },
      {
        workspaceId: workspace._id,
        projectId: p1._id,
        actorId: dev1._id,
        action: "sprint.completed",
        targetType: "sprint",
        targetId: s1_completed._id,
        metadata: { name: s1_completed.name },
      },
      {
        workspaceId: workspace._id,
        projectId: p1._id,
        actorId: dev1._id,
        action: "sprint.started",
        targetType: "sprint",
        targetId: s2_active._id,
        metadata: { name: s2_active.name },
      },
    ];

    if (task7) {
      logs.push(
        {
          workspaceId: workspace._id,
          projectId: p1._id,
          actorId: admin._id,
          action: "task.created",
          targetType: "task",
          targetId: task7._id,
          metadata: { key: task7.key, title: task7.title },
        },
        {
          workspaceId: workspace._id,
          projectId: p1._id,
          actorId: dev1._id,
          action: "task.moved",
          targetType: "task",
          targetId: task7._id,
          metadata: {
            key: task7.key,
            title: task7.title,
            oldStatus: "todo",
            newStatus: "inprogress",
          },
        }
      );
    }

    await ActivityLog.create(logs);

    console.log("Activity logs created. Creating direct user notifications...");

    // Create user notifications
    if (task7) {
      await Notification.create({
        userId: dev1._id,
        type: "task.assigned",
        message: `You have been assigned to task FLOW-7: "Integrate @dnd-kit drag-and-drop board cards"`,
        link: `/tasks/${task7._id}`,
        isRead: false,
        relatedEntity: { entityType: "task", entityId: task7._id },
      });
    }

    if (task8) {
      await Notification.create({
        userId: dev2._id,
        type: "task.assigned",
        message: `You have been assigned to task FLOW-8: "Build Task Detail Modal and Checklist items"`,
        link: `/tasks/${task8._id}`,
        isRead: true,
        relatedEntity: { entityType: "task", entityId: task8._id },
      });
    }

    console.log("Seeding process completed successfully!");
    console.log(`Demo Credentials:
    Username: admin@teamflow.com
    Password: password123
    `);

    await mongoose.connection.close();
  } catch (error) {
    console.error("Seeding failed: ", error);
    process.exit(1);
  }
};

seed();
