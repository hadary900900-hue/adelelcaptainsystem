import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';

export class RolesService {
  async list(orgId: string, { skip, limit, search }: any) {
    const where: any = { organizationId: orgId };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [total, roles] = await Promise.all([
      prisma.role.count({ where }),
      prisma.role.findMany({
        where,
        skip,
        take: limit,
        include: { rolePermissions: { include: { permission: true } } },
        orderBy: { name: 'asc' }
      })
    ]);

    return { total, data: roles };
  }

  async getById(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: { rolePermissions: { include: { permission: true } } }
    });
    if (!role) throw new AppError('Role not found', 404);
    return role;
  }

  async create(orgId: string, data: any, createdBy: string) {
    const role = await prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        isSystem: false,
        organizationId: orgId,
        rolePermissions: {
          create: (data.permissionIds || []).map((permissionId: string) => ({ permissionId }))
        }
      }
    });

    createAuditLog({
      userId: createdBy,
      entityType: 'Role',
      entityId: role.id,
      action: 'create',
      afterData: { name: role.name }
    });

    return role;
  }

  async update(id: string, data: any, updatedBy: string) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) throw new AppError('Role not found', 404);
    if (role.isSystem) throw new AppError('Cannot update system role', 403);

    const updatedRole = await prisma.$transaction(async (tx) => {
      if (data.permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({
          data: data.permissionIds.map((permissionId: string) => ({ roleId: id, permissionId }))
        });
      }

      return tx.role.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description
        }
      });
    });

    createAuditLog({
      userId: updatedBy,
      entityType: 'Role',
      entityId: id,
      action: 'update'
    });

    return updatedRole;
  }

  async delete(id: string, deletedBy: string) {
    const role = await prisma.role.findUnique({ where: { id }, include: { userRoles: true } });
    if (!role) throw new AppError('Role not found', 404);
    if (role.isSystem) throw new AppError('Cannot delete system role', 403);
    if (role.userRoles.length > 0) throw new AppError('Cannot delete role assigned to users', 400);

    await prisma.role.delete({ where: { id } });

    createAuditLog({
      userId: deletedBy,
      entityType: 'Role',
      entityId: id,
      action: 'delete'
    });
  }

  async getAllPermissions() {
    const permissions = await prisma.permission.findMany({ orderBy: { module: 'asc' } });
    const grouped = permissions.reduce((acc: any, p) => {
      if (!acc[p.module]) acc[p.module] = [];
      acc[p.module].push(p);
      return acc;
    }, {});
    return grouped;
  }
}
