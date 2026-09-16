import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(512),
});

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(512),
  role: z.enum(["SUPER_ADMIN", "USER"]),
  isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(255).optional(),
    password: z.string().min(8).max(512).optional(),
    role: z.enum(["SUPER_ADMIN", "USER"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const storageSettingsSchema = z.object({
  path: z.string().trim().min(1).max(1024),
  createIfMissing: z.boolean().optional().default(false),
});

// Allow-list of MIME types accepted for upload. Extend as needed.
export const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/json",
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
