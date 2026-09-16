import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const ROLES = ["SUPER_ADMIN", "USER"] as const;
export type Role = (typeof ROLES)[number];

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ROLES }).notNull().default("USER"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 hash of the session token
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const files = sqliteTable(
  "files",
  {
    id: text("id").primaryKey(),
    originalName: text("original_name").notNull(),
    storedName: text("stored_name").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    storagePath: text("storage_path").notNull(),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("files_uploaded_by_idx").on(table.uploadedBy),
    index("files_created_at_idx").on(table.createdAt),
  ],
);

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const LOG_LEVELS = ["info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const logs = sqliteTable(
  "logs",
  {
    id: text("id").primaryKey(),
    level: text("level", { enum: LOG_LEVELS }).notNull(),
    message: text("message").notNull(),
    // Extra structured detail (e.g. { email, route }), stored as JSON text.
    context: text("context"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("logs_created_at_idx").on(table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type FileRecord = typeof files.$inferSelect;
export type NewFileRecord = typeof files.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type LogEntry = typeof logs.$inferSelect;
