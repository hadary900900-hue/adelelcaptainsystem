import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, 'Password must contain uppercase, lowercase, and number'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstNameEn: z.string().min(1),
  lastNameEn: z.string().min(1),
  firstNameAr: z.string().optional().default(''),
  lastNameAr: z.string().optional().default(''),
  phone: z.string().optional().nullable(),
  roleIds: z.array(z.string()),
  branchIds: z.array(z.string()).min(1),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  isActive: z.boolean().optional(),
});
