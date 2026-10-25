import { z } from 'zod';

export const createWarehouseSchema = z.object({
  branchId: z.string().uuid(),
  code: z.string().min(2).max(20),
  nameEn: z.string().min(2),
  nameAr: z.string().min(2),
  type: z.enum(['MAIN', 'SECONDARY', 'TRANSIT', 'SERVICE', 'RETURNS']).default('MAIN'),
  address: z.string().optional().nullable(),
});

export const updateWarehouseSchema = createWarehouseSchema.omit({ branchId: true }).partial();
