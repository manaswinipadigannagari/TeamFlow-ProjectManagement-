import { z } from "zod";

export const createCommentSchema = z.object({
  body: z.object({
    body: z.string().min(1, "Comment body cannot be empty"),
    mentions: z.array(z.string()).optional(),
  }),
});
