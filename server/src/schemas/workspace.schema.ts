import { z } from "zod";

export const createWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Workspace name must be at least 2 characters").max(100),
    description: z.string().max(500).optional(),
  }),
});

export const updateWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Workspace name must be at least 2 characters").max(100).optional(),
    description: z.string().max(500).optional(),
  }),
});

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    role: z.enum(["admin", "member", "viewer"]).default("member"),
  }),
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(["admin", "member", "viewer"]),
  }),
});
