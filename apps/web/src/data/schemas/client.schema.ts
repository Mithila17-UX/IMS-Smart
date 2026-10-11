import { z } from "zod";

export const ClientStatusSchema = z.enum(["active", "read_only", "blocked"]);
export type ClientStatus = z.infer<typeof ClientStatusSchema>;

export const ClientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2, "Client name must be at least 2 characters"),
  status: ClientStatusSchema.default("active"),
  statusReason: z.string().optional(),
  billingNote: z.string().optional(),
  timezone: z.string().default("Asia/Colombo"),
  currency: z.string().default("LKR"),
  language: z.string().default("en-LK"),
  logoUrl: z.string().optional(),
  accentColor: z.string().default("#1e293b"),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLoginAt: z.string().optional(),
  entriesPerDay: z.number().default(0),
  lastBackupAt: z.string().optional(),
});

export type Client = z.infer<typeof ClientSchema>;

export const CreateClientInputSchema = z.object({
  name: z.string().min(2, "Client name must be at least 2 characters"),
  timezone: z.string().default("Asia/Colombo"),
  currency: z.string().default("LKR"),
  language: z.string().default("en-LK"),
  accentColor: z.string().default("#1e293b"),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  billingNote: z.string().optional(),
  presetId: z.string().default("full-bar"),
  adminEmail: z.string().email("Valid admin email is required"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  adminDisplayName: z.string().min(2, "Admin display name is required"),
});

export type CreateClientInput = z.infer<typeof CreateClientInputSchema>;
