import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AppError } from './auth.middleware';
import { prisma } from '@erp/database';

export async function loadUserPermissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError('User not authenticated', 401, 'UNAUTHORIZED'));
  }

  if (req.user.permissions) {
    return next();
  }

  try {
    const [userRoles, userDirectPermissions] = await Promise.all([
      prisma.userRole.findMany({
        where: { userId: req.user.userId },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true
                }
              }
            }
          }
        }
      }),
      prisma.userPermission.findMany({
        where: { userId: req.user.userId },
        include: {
          permission: true
        }
      })
    ]);

    const permissions = new Set<string>();
    const revokedPermissions = new Set<string>();

    // 1. Collect Role Permissions
    for (const ur of userRoles) {
      if (ur.role.name === 'Super Admin' || (ur.role.isSystem && ur.role.name.includes('Admin'))) {
        permissions.add('admin.all');
      }
      for (const rp of ur.role.rolePermissions) {
        permissions.add(rp.permission.slug);
      }
    }

    // 2. Apply Direct User-Specific Permissions (Overrides role)
    for (const up of userDirectPermissions) {
      if (up.granted) {
        permissions.add(up.permission.slug);
      } else {
        revokedPermissions.add(up.permission.slug);
      }
    }

    // Remove any explicitly revoked permissions
    for (const revoked of revokedPermissions) {
      permissions.delete(revoked);
    }

    req.user.permissions = Array.from(permissions);
    next();
  } catch (error) {
    next(error);
  }
}

export function requirePermission(permissionSlug: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401, 'UNAUTHORIZED'));
    }

    if (!req.user.permissions) {
      await new Promise<void>((resolve, reject) => {
        loadUserPermissions(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    const perms = req.user.permissions || [];
    if (perms.includes('admin.all') || perms.includes(permissionSlug)) {
      return next();
    }

    return next(new AppError('Forbidden: Insufficient permissions', 403, 'FORBIDDEN'));
  };
}
