import { PaginationQuery } from '@erp/shared';

export function parsePagination(query: any) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const rawLimit = parseInt(query.limit || '20', 10);
  const limit = Math.min(100, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  const search = query.search || undefined;

  return { page, limit, skip, sortBy, sortOrder, search };
}
