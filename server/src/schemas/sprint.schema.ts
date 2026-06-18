import { z } from "zod";

export const createSprintSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Sprint name must be at least 2 characters").max(100),
    goal: z.string().max(500).optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }),
});

export const updateSprintSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Sprint name must be at least 2 characters").max(100).optional(),
    goal: z.string().max(500).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.enum(["planned", "active", "completed"]).optional(),
  }),
});
