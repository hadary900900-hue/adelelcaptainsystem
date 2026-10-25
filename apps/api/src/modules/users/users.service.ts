import { prisma } from '@erp/database';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';
import bcrypt from 'bcryptjs';

export class UsersService {
  async list(orgId: string, { skip, limit, search }: any) {
    const where: any = { organizationId: orgId };
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstNameEn: { contains: search, mode: 'insensitive' } },
        { firstNameAr: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          userRoles: { include: { role: true } },
          userBranches: { include: { branch: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const data = users.map(u => {
      const { passwordHash, ...safeUser } = u;
      return safeUser;
    });

    return { total, data };
  }

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        userPermissions: { include: { permission: true } },
        userBranches: { include: { branch: true } }
      }
    });
    if (!user) throw new AppError('User not found', 404);
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async getUserPermissions(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
        userPermissions: { include: { permission: true } },
      },
    });
    if (!user) throw new AppError('User not found', 404);

    const allPermissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { slug: 'asc' }],
    });

    const rolePermSlugs = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        rolePermSlugs.add(rp.permission.slug);
      }
    }

    const directPermsMap = new Map<string, boolean>();
    for (const up of user.userPermissions) {
      directPermsMap.set(up.permission.slug, up.granted);
    }

    const permissions = allPermissions.map(p => {
      const fromRole = rolePermSlugs.has(p.slug);
      const direct = directPermsMap.get(p.slug);
      const effective = direct !== undefined ? direct : fromRole;

      return {
        id: p.id,
        slug: p.slug,
        module: p.module,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        fromRole,
        directGranted: direct === true,
        directRevoked: direct === false,
        isCustomized: direct !== undefined,
        effective,
      };
    });

    return {
      userId: user.id,
      email: user.email,
      name: `${user.firstNameAr || user.firstNameEn} ${user.lastNameAr || user.lastNameEn}`,
      permissions,
    };
  }

  async updateUserPermissions(userId: string, permissions: { permissionId: string; granted: boolean }[], updatedBy: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    await prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId } });
      if (permissions && permissions.length > 0) {
        await tx.userPermission.createMany({
          data: permissions.map(p => ({
            userId,
            permissionId: p.permissionId,
            granted: p.granted,
          })),
        });
      }
    });

    createAuditLog({
      userId: updatedBy,
      entityType: 'User',
      entityId: userId,
      action: 'updateUserPermissions',
      afterData: { permissionsCount: permissions.length },
    });

    return this.getUserPermissions(userId);
  }

  async create(orgId: string, data: any, createdBy: string) {
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new AppError('Email already in use', 400);

    const hash = await bcrypt.hash(data.password || '123456', 10);
    
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hash,
        firstNameEn: data.firstNameEn,
        lastNameEn: data.lastNameEn,
        firstNameAr: data.firstNameAr,
        lastNameAr: data.lastNameAr,
        phone: data.phone,
        organizationId: orgId,
        userRoles: {
          create: (data.roleIds || []).map((roleId: string) => ({ roleId }))
        },
        userBranches: {
          create: (data.branchIds || []).map((branchId: string, idx: number) => ({
            branchId,
            isDefault: idx === 0
          }))
        }
      }
    });

    createAuditLog({
      userId: createdBy,
      entityType: 'User',
      entityId: user.id,
      action: 'create',
      afterData: { email: user.email }
    });

    return user;
  }

  async update(id: string, data: any, updatedBy: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('User not found', 404);

    if (data.email && data.email !== user.email) {
      const exists = await prisma.user.findUnique({ where: { email: data.email } });
      if (exists) throw new AppError('Email already in use', 400);
    }

    const updateData: any = {
      email: data.email,
      firstNameEn: data.firstNameEn,
      lastNameEn: data.lastNameEn,
      firstNameAr: data.firstNameAr,
      lastNameAr: data.lastNameAr,
      phone: data.phone
    };

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      if (data.roleIds) {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: data.roleIds.map((roleId: string) => ({ userId: id, roleId }))
        });
      }

      if (data.branchIds) {
        await tx.userBranch.deleteMany({ where: { userId: id } });
        await tx.userBranch.createMany({
          data: data.branchIds.map((branchId: string, idx: number) => ({
            userId: id,
            branchId,
            isDefault: idx === 0
          }))
        });
      }

      return tx.user.update({
        where: { id },
        data: updateData
      });
    });

    createAuditLog({
      userId: updatedBy,
      entityType: 'User',
      entityId: user.id,
      action: 'update'
    });

    return updatedUser;
  }

  async delete(id: string, deletedBy: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('User not found', 404);

    await prisma.$transaction(async (tx) => {
      // 1. Clean up user role assignments
      await tx.userRole.deleteMany({ where: { userId: id } });
      // 2. Clean up user branch assignments
      await tx.userBranch.deleteMany({ where: { userId: id } });
      // 3. Clean up refresh tokens
      await tx.refreshToken.deleteMany({ where: { userId: id } });
      // 4. Clean up activities or unassign leads
      await tx.lead.updateMany({ where: { assignedToId: id }, data: { assignedToId: null } });
      // 5. Hard delete the user
      await tx.user.delete({ where: { id } });
    });

    createAuditLog({
      userId: deletedBy,
      entityType: 'User',
      entityId: id,
      action: 'delete',
      beforeData: { email: user.email, name: `${user.firstNameEn} ${user.lastNameEn}` }
    });
  }

  async toggleActive(id: string, isActive: boolean, updatedBy: string) {
    await prisma.user.update({
      where: { id },
      data: { isActive }
    });
    createAuditLog({
      userId: updatedBy,
      entityType: 'User',
      entityId: id,
      action: 'toggleActive',
      afterData: { isActive }
    });
  }
}
