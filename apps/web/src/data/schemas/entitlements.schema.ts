import { z } from "zod";
import { ClientStatusSchema } from "./client.schema";

export const EntitlementsSchema = z.object({
  status: ClientStatusSchema.default("active"),
  statusReason: z.string().optional(),
  billingNote: z.string().optional(),
  modules: z.record(z.string(), z.boolean()).default({}),
  tiles: z.record(z.string(), z.boolean()).default({}),
  reports: z.record(z.string(), z.boolean()).default({}),
  settingsTabs: z.record(z.string(), z.boolean()).default({}),
  maxUsers: z.number().int().min(1).default(10),
  updatedAt: z.string(),
  updatedBy: z.string(),
});

export type EntitlementsDoc = z.infer<typeof EntitlementsSchema>;
