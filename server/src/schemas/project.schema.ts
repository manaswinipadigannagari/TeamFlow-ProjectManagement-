import { z } from "zod";

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Project name must be at least 2 characters").max(100),
    key: z.string().min(2, "Project key must be at least 2 characters").max(10),
    description: z.string().max(1000).optional(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color code")
      .default("#4865f5"),
    icon: z.string().optional(),
  }),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Project name must be at least 2 characters").max(100).optional(),
    description: z.string().max(1000).optional(),
    status: z.enum(["active", "archived", "completed"]).optional(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color code")
      .optional(),
    icon: z.string().optional(),
  }),
});

export const updateProjectMemberSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "User ID is required"),
    role: z.enum(["admin", "member", "viewer"]),
  }),
});
