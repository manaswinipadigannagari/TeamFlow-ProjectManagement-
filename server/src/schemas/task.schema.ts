import { z } from "zod";

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2, "Task title must be at least 2 characters").max(200),
    description: z.string().optional(),
    status: z.string().default("todo"),
    priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    type: z.enum(["task", "bug", "story", "epic"]).default("task"),
    assigneeIds: z.array(z.string()).optional(),
    dueDate: z.string().datetime().optional().nullable(),
    estimate: z.number().nonnegative().default(0),
    sprintId: z.string().optional().nullable(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2, "Task title must be at least 2 characters").max(200).optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    type: z.enum(["task", "bug", "story", "epic"]).optional(),
    assigneeIds: z.array(z.string()).optional(),
    dueDate: z.string().datetime().optional().nullable(),
    estimate: z.number().nonnegative().optional(),
    sprintId: z.string().optional().nullable(),
    subtasks: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          isCompleted: z.boolean(),
        })
      )
      .optional(),
  }),
});

export const moveTaskSchema = z.object({
  body: z.object({
    columnId: z.string(),
    position: z.number().nonnegative(),
    sprintId: z.string().optional().nullable(),
  }),
});
