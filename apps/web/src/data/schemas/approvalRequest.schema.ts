import { z } from "zod";

export const ApprovalKindSchema = z.enum([
  "over_limit_tab",
  "manual_discount",
  "complimentary",
  "staff_drink",
]);
export type ApprovalKind = z.infer<typeof ApprovalKindSchema>;

export const ApprovalStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ApprovalRequestSchema = z.object({
  id: z.string(),
  kind: ApprovalKindSchema,
  status: ApprovalStatusSchema.default("pending"),
  requestedBy: z.string(),
  decidedBy: z.string().optional(),
  at: z.string(),
  decidedAt: z.string().optional(),
  rejectionReason: z.string().optional(),
  details: z.object({
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    productId: z.string().optional(),
    productName: z.string().optional(),
    qty: z.number().int().optional(),
    amount: z.number().int().optional(), // in integer cents
    reason: z.string().optional(),
    orderDraft: z.record(z.string(), z.any()).optional(),
  }),
});
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
