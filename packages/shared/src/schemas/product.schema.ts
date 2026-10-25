import { z } from 'zod';

export const createCategorySchema = z.object({
  code: z.string().min(1, 'Category code is required'),
  nameEn: z.string().min(1, 'English name is required'),
  nameAr: z.string().min(1, 'Arabic name is required'),
  parentId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createBrandSchema = z.object({
  code: z.string().min(1, 'Brand code is required'),
  nameEn: z.string().min(1, 'English name is required'),
  nameAr: z.string().min(1, 'Arabic name is required'),
  country: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateBrandSchema = createBrandSchema.partial();

export const createVehicleModelSchema = z.object({
  brandId: z.string().min(1, 'Brand ID is required'),
  code: z.string().min(1, 'Model code is required'),
  nameEn: z.string().min(1, 'English name is required'),
  nameAr: z.string().min(1, 'Arabic name is required'),
  category: z.string().default('MOTORCYCLE'),
  yearFrom: z.number().int().optional().nullable(),
  yearTo: z.number().int().optional().nullable(),
  engineCapacity: z.number().int().optional().nullable(),
  engineType: z.string().optional().nullable(),
  transmission: z.string().optional().nullable(),
  fuelType: z.string().optional().default('Petrol'),
  isActive: z.boolean().optional().default(true),
});

export const updateVehicleModelSchema = createVehicleModelSchema.partial();

export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional().nullable(),
  nameEn: z.string().min(1, 'English name is required'),
  nameAr: z.string().min(1, 'Arabic name is required'),
  type: z.enum(['VEHICLE', 'SPARE_PART', 'ACCESSORY', 'OIL', 'CONSUMABLE', 'SERVICE', 'OTHER']),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  vehicleModelId: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  descriptionAr: z.string().optional().nullable(),
  unitOfMeasure: z.string().default('PCS'),
  costPrice: z.number().min(0).default(0),
  retailPrice: z.number().min(0).default(0),
  b2bPrice: z.number().min(0).default(0),
  wholesalePrice: z.number().min(0).default(0),
  minStockAlert: z.number().min(0).default(0),
  maxStockLimit: z.number().min(0).optional().nullable(),
  allowNegativeStock: z.boolean().default(false),
  isActive: z.boolean().default(true),
  // Spare part specific extensions
  oemNumber: z.string().optional().nullable(),
  compatibleModels: z.string().optional().nullable(),
  supplierName: z.string().optional().nullable(),
  warrantyMonths: z.number().int().min(0).optional().default(0),
  defaultShelf: z.string().optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export const createVehicleUnitSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  modelId: z.string().optional().nullable(),
  branchId: z.string().min(1, 'Branch ID is required'),
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  vin: z.string().min(1, 'VIN / Chassis number is required'),
  engineNumber: z.string().min(1, 'Engine number is required'),
  color: z.string().min(1, 'Color is required'),
  modelYear: z.number().int().min(1900),
  status: z.enum(['AVAILABLE', 'RESERVED', 'SOLD', 'IN_SERVICE', 'RETURNED', 'DAMAGED', 'TRANSFERRED', 'CONSIGNMENT']).default('AVAILABLE'),
  purchaseCost: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).default(0),
  b2bPrice: z.number().min(0).default(0),
  mileage: z.number().int().min(0).default(0),
  keyNumber: z.string().optional().nullable(),
  batteryNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateVehicleUnitSchema = createVehicleUnitSchema.partial();

export const createStockTransferSchema = z.object({
  sourceWarehouseId: z.string().min(1, 'Source warehouse is required'),
  targetWarehouseId: z.string().min(1, 'Target warehouse is required'),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product ID is required'),
    requestedQty: z.number().min(0).optional().default(1),
    vehicleUnitIds: z.array(z.string()).optional(),
    unitCost: z.number().min(0).optional().default(0),
    notes: z.string().optional().nullable(),
  })).min(1, 'At least one item is required in the transfer'),
});

export const createStockAdjustmentSchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  reason: z.enum(['DAMAGED', 'EXPIRED', 'COUNT_DISCREPANCY', 'THEFT', 'CORRECTION', 'OTHER']),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product ID is required'),
    countedQty: z.number().min(0, 'Counted quantity cannot be negative'),
    notes: z.string().optional().nullable(),
  })).min(1, 'At least one item is required'),
});

export const createStockCountSchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse ID is required'),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product ID is required'),
    countedQty: z.number().min(0),
    notes: z.string().optional().nullable(),
  })).optional(),
});
