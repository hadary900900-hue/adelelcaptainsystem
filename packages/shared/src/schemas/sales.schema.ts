import { z } from 'zod';

export const createCustomerSchema = z.object({
  customerCode: z.string().min(1, 'Customer code is required'),
  type: z.enum(['INDIVIDUAL', 'COMPANY']).default('INDIVIDUAL'),
  nameEn: z.string().min(1, 'English name is required'),
  nameAr: z.string().optional().default(''),
  companyName: z.string().optional().nullable(),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email().optional().nullable().or(z.literal('')),
  nationalId: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  commercialReg: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  creditLimit: z.number().min(0).default(0),
  paymentTerms: z.number().int().min(0).default(0),
  priceTier: z.enum(['RETAIL', 'B2B', 'WHOLESALE', 'CUSTOM']).default('RETAIL'),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const createLeadSchema = z.object({
  customerId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  title: z.string().min(1, 'Lead title is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email().optional().nullable().or(z.literal('')),
  source: z.enum(['WALK_IN', 'PHONE', 'WEBSITE', 'SOCIAL', 'REFERRAL', 'EXHIBITION', 'OTHER']).default('WALK_IN'),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).default('NEW'),
  interestType: z.string().optional().nullable(),
  estimatedValue: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  lostReason: z.string().optional().nullable(),
  nextFollowUp: z.string().optional().nullable(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const createSalesActivitySchema = z.object({
  leadId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  type: z.enum(['CALL', 'MEETING', 'VISIT', 'EMAIL', 'WHATSAPP', 'TASK', 'NOTE']),
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).default('PENDING'),
});

export const updateSalesActivitySchema = createSalesActivitySchema.partial();

export const createCustomerNoteSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  note: z.string().min(1, 'Note content is required'),
});

export const createVehicleReservationSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  customerId: z.string().min(1, 'Customer is required'),
  vehicleUnitId: z.string().min(1, 'Vehicle unit is required'),
  productId: z.string().min(1, 'Product is required'),
  depositAmount: z.number().min(0).default(0),
  totalPrice: z.number().positive('Total price must be positive'),
  expiresAt: z.string().min(1, 'Expiration date is required'),
  notes: z.string().optional().nullable(),
});

export const createQuotationSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  customerId: z.string().min(1, 'Customer is required'),
  validUntil: z.string().min(1, 'Valid until date is required'),
  discountTotal: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(14),
  notes: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product is required'),
    description: z.string().optional().nullable(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).default(0),
    taxRate: z.number().min(0).default(14),
  })).min(1, 'At least one item is required'),
});

export const createSalesOrderSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  customerId: z.string().min(1, 'Customer is required'),
  quotationId: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  discountTotal: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(14),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product is required'),
    description: z.string().optional().nullable(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).default(0),
    taxRate: z.number().min(0).default(14),
  })).min(1, 'At least one item is required'),
});

export const createSalesInvoiceSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  customerId: z.string().min(1, 'Customer is required'),
  orderId: z.string().optional().nullable(),
  quotationId: z.string().optional().nullable(),
  invoiceType: z.enum(['CASH', 'CREDIT', 'B2B', 'CONSIGNMENT']).default('CASH'),
  dueDate: z.string().optional().nullable(),
  discountTotal: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(14),
  paidAmount: z.number().min(0).default(0),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'POS_CARD', 'WALLET']).default('CASH'),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product is required'),
    vehicleUnitId: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    discount: z.number().min(0).default(0),
    taxRate: z.number().min(0).default(14),
  })).min(1, 'At least one line item is required in the invoice'),
});

export const createSalesReturnSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  warehouseId: z.string().min(1, 'Target return warehouse is required'),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  refundStatus: z.enum(['REFUNDED', 'CREDITED_TO_ACCOUNT']).default('REFUNDED'),
  items: z.array(z.object({
    productId: z.string().min(1, 'Product is required'),
    description: z.string().optional().nullable(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    condition: z.enum(['GOOD', 'DAMAGED', 'DEFECTIVE']).default('GOOD'),
  })).min(1, 'At least one item to return'),
});

export const createCustomerPaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  invoiceId: z.string().optional().nullable(),
  amount: z.number().positive('Payment amount must be greater than 0'),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'POS_CARD', 'WALLET']).default('CASH'),
  referenceNo: z.string().optional().nullable(),
  chequeNumber: z.string().optional().nullable(),
  chequeDueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
