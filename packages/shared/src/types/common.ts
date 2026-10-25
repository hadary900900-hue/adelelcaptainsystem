export interface AuditFields {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeletable {
  deletedAt: Date | null;
}

export interface BranchScoped {
  branchId: string;
}

export interface SelectOption {
  value: string;
  label: string;
  labelAr?: string;
}
