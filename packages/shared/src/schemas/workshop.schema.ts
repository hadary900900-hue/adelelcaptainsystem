import { z } from 'zod';

export const createWorkOrderSchema = z.object({
  branchId: z.string().min(1, 'Branch ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  vehicleUnitId: z.string().min(1, 'Vehicle Unit ID is required'),
  assignedTechnicianId: z.string().optional().nullable(),
  odometerReading: z.number().int().min(0, 'Odometer reading must be non-negative'),
  fuelLevel: z.string().optional().nullable(),
  licensePlate: z.string().optional().nullable(),
  complaint: z.string().optional().nullable(),
  conditionNotes: z.string().optional().nullable(),
  accessories: z.string().optional().nullable(),
  photos: z.string().optional().nullable(), // JSON string or comma separated URLs
  overrideReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateWorkOrderSchema = z.object({
  assignedTechnicianId: z.string().optional().nullable(),
  status: z.enum([
    'RECEIVED',
    'DIAGNOSING',
    'AWAITING_APPROVAL',
    'APPROVED',
    'IN_PROGRESS',
    'WAITING_FOR_PARTS',
    'COMPLETED',
    'INVOICED',
    'DELIVERED',
    'CANCELLED',
  ]).optional(),
  fuelLevel: z.string().optional().nullable(),
  complaint: z.string().optional().nullable(),
  conditionNotes: z.string().optional().nullable(),
  accessories: z.string().optional().nullable(),
  photos: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const addWorkOrderItemSchema = z.object({
  productId: z.string().min(1, 'Product/Service ID is required'),
  quantity: z.number().min(0.01, 'Quantity must be greater than zero').default(1),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(14),
  technicianId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateWorkOrderItemSchema = addWorkOrderItemSchema.partial();

export const completeWorkOrderSchema = z.object({
  notes: z.string().optional().nullable(),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'CREDIT']).default('CASH'),
  paidAmount: z.number().min(0).optional().default(0),
});

export const deliverVehicleSchema = z.object({
  recipientName: z.string().min(1, 'Recipient name is required'),
  recipientNationalId: z.string().optional().nullable(),
  handoverNotes: z.string().optional().nullable(),
});

export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
export type AddWorkOrderItemInput = z.infer<typeof addWorkOrderItemSchema>;
export type UpdateWorkOrderItemInput = z.infer<typeof updateWorkOrderItemSchema>;
export type CompleteWorkOrderInput = z.infer<typeof completeWorkOrderSchema>;
export type DeliverVehicleInput = z.infer<typeof deliverVehicleSchema>;
