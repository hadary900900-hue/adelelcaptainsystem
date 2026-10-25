import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(2),
  nameAr: z.string().optional().default(''),
  description: z.string().optional().default(''),
  permissionIds: z.array(z.string()),
});

export const updateRoleSchema = createRoleSchema.partial();
