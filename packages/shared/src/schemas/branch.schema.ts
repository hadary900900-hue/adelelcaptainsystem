import { z } from 'zod';

export const createBranchSchema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric'),
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  isHeadquarters: z.boolean().default(false),
});

export const updateBranchSchema = createBranchSchema.partial();
