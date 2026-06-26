import { z } from "zod";

export const authSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters long."),
});

export const summarizeSchema = z.object({
  title: z.string().max(140).optional(),
  text: z.string().trim().min(100, "Paste at least 100 characters to summarize."),
  question: z.string().max(500).optional(),
  mode: z.enum(["detailed", "brief", "bullets"]).default("detailed"),
});

export const askSchema = z.object({
  documentId: z.string().min(1),
  question: z.string().trim().min(3).max(500),
});
