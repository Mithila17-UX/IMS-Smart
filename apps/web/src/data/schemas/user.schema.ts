import { z } from "zod";

export const UserRoleSchema = z.enum(["superadmin", "client_admin", "cashier"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  role: UserRoleSchema,
  active: z.boolean().default(true),
  createdAt: z.string(),
  lastLoginAt: z.string().optional(),
});

export type AppUser = z.infer<typeof UserSchema>;

export const CreateUserInputSchema = z.object({
  email: z.string().email("Valid email address is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["client_admin", "cashier"]),
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
