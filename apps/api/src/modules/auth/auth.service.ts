import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@erp/database';
import { config } from '../../config';
import { AppError } from '../../middleware/error.middleware';
import { createAuditLog } from '../../utils/audit';
import { AuthUser } from '@erp/shared';

export class AuthService {
  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        userBranches: { include: { branch: true } }
      }
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const accessToken = jwt.sign(
      { userId: user.id, organizationId: user.organizationId },
      config.jwt.accessSecret as string,
      { expiresIn: config.jwt.accessExpiresIn as any }
    );

    const familyId = uuidv4();
    const refreshToken = uuidv4();
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        tokenHash: refreshHash,
        userId: user.id,
        familyId,
        expiresAt,
      }
    });

    createAuditLog({
      userId: user.id,
      entityType: 'Auth',
      action: 'login',
      ipAddress,
      userAgent
    });

    return {
      accessToken,
      refreshToken: `${familyId}:${refreshToken}`,
      user: await this.mapUserToAuthUserAsync(user)
    };
  }

  async refreshToken(refreshTokenString: string, ipAddress?: string, userAgent?: string) {
    const [familyId, token] = refreshTokenString.split(':');
    if (!familyId || !token) throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');

    const tokens = await prisma.refreshToken.findMany({
      where: { familyId },
      orderBy: { createdAt: 'desc' }
    });

    const currentToken = tokens[0];
    if (!currentToken) throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
    
    if (currentToken.isRevoked) {
      await prisma.refreshToken.updateMany({
        where: { familyId },
        data: { isRevoked: true }
      });
      throw new AppError('Token family revoked', 401, 'TOKEN_REVOKED');
    }

    const isValid = await bcrypt.compare(token, currentToken.tokenHash);
    if (!isValid) {
      await prisma.refreshToken.updateMany({
        where: { familyId },
        data: { isRevoked: true }
      });
      throw new AppError('Invalid refresh token, family revoked', 401, 'TOKEN_REVOKED');
    }

    if (currentToken.expiresAt < new Date()) {
      throw new AppError('Refresh token expired', 401, 'TOKEN_EXPIRED');
    }

    await prisma.refreshToken.update({
      where: { id: currentToken.id },
      data: { isRevoked: true }
    });

    const user = await prisma.user.findUnique({
      where: { id: currentToken.userId },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        userBranches: { include: { branch: true } }
      }
    });

    if (!user || !user.isActive) throw new AppError('User not found or inactive', 401, 'UNAUTHORIZED');

    const accessToken = jwt.sign(
      { userId: user.id, organizationId: user.organizationId },
      config.jwt.accessSecret as string,
      { expiresIn: config.jwt.accessExpiresIn as any }
    );

    const newRefreshToken = uuidv4();
    const refreshHash = await bcrypt.hash(newRefreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        tokenHash: refreshHash,
        userId: user.id,
        familyId,
        expiresAt,
      }
    });

    return {
      accessToken,
      refreshToken: `${familyId}:${newRefreshToken}`,
      user: await this.mapUserToAuthUserAsync(user)
    };
  }

  async logout(userId: string, refreshTokenString?: string, ipAddress?: string, userAgent?: string) {
    if (refreshTokenString) {
      const [familyId] = refreshTokenString.split(':');
      if (familyId) {
        await prisma.refreshToken.updateMany({
          where: { familyId },
          data: { isRevoked: true }
        });
      }
    }

    createAuditLog({
      userId,
      entityType: 'Auth',
      action: 'logout',
      ipAddress,
      userAgent
    });
  }

  async getMe(userId: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
        userBranches: { include: { branch: true } }
      }
    });

    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    return this.mapUserToAuthUserAsync(user);
  }

  private async mapUserToAuthUserAsync(user: any): Promise<AuthUser> {
    const roles = user.userRoles.map((ur: any) => ur.role.name);
    const isSuperOrAdmin = roles.includes('Super Admin') || roles.some((r: string) => r.toLowerCase().includes('admin'));

    const permissions = new Set<string>();
    user.userRoles.forEach((ur: any) => {
      ur.role.rolePermissions.forEach((rp: any) => permissions.add(rp.permission.slug));
    });

    let branches: any[] = [];
    if (isSuperOrAdmin) {
      // Admins have access to ALL branches in the organization
      const allBranches = await prisma.branch.findMany({
        where: { organizationId: user.organizationId, isActive: true },
        orderBy: [{ isHeadquarters: 'desc' }, { code: 'asc' }]
      });
      branches = allBranches.map(b => ({
        id: b.id,
        code: b.code,
        nameEn: b.nameEn,
        nameAr: b.nameAr,
        isDefault: b.isHeadquarters
      }));
    } else {
      branches = user.userBranches.map((ub: any) => ({
        id: ub.branch.id,
        code: ub.branch.code,
        nameEn: ub.branch.nameEn,
        nameAr: ub.branch.nameAr,
        isDefault: ub.isDefault
      }));
    }

    const defaultBranch = branches.find((b: any) => b.isDefault);
    const activeBranchId = defaultBranch ? defaultBranch.id : (branches[0]?.id || '');

    return {
      id: user.id,
      email: user.email,
      firstNameEn: user.firstNameEn,
      lastNameEn: user.lastNameEn,
      firstNameAr: user.firstNameAr,
      lastNameAr: user.lastNameAr,
      phone: user.phone || undefined,
      avatar: user.avatar || undefined,
      preferredLang: user.preferredLang as any,
      organizationId: user.organizationId,
      roles,
      permissions: Array.from(permissions),
      branches,
      activeBranchId
    };
  }

  private mapUserToAuthUser(user: any): AuthUser {
    const roles = user.userRoles.map((ur: any) => ur.role.name);
    const permissions = new Set<string>();
    user.userRoles.forEach((ur: any) => {
      ur.role.rolePermissions.forEach((rp: any) => permissions.add(rp.permission.slug));
    });

    const branches = user.userBranches.map((ub: any) => ({
      id: ub.branch.id,
      code: ub.branch.code,
      nameEn: ub.branch.nameEn,
      nameAr: ub.branch.nameAr,
      isDefault: ub.isDefault
    }));

    const defaultBranch = user.userBranches.find((ub: any) => ub.isDefault);
    const activeBranchId = defaultBranch ? defaultBranch.branch.id : (branches[0]?.id || '');

    return {
      id: user.id,
      email: user.email,
      firstNameEn: user.firstNameEn,
      lastNameEn: user.lastNameEn,
      firstNameAr: user.firstNameAr,
      lastNameAr: user.lastNameAr,
      phone: user.phone || undefined,
      avatar: user.avatar || undefined,
      preferredLang: user.preferredLang as any,
      organizationId: user.organizationId,
      roles,
      permissions: Array.from(permissions),
      branches,
      activeBranchId
    };
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return { message: 'If this email exists, a password reset token has been generated.' };
    }

    const resetToken = uuidv4();
    const resetTokenExp = new Date();
    resetTokenExp.setHours(resetTokenExp.getHours() + 1);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExp
      }
    });

    createAuditLog({
      userId: user.id,
      entityType: 'Auth',
      action: 'forgot_password'
    });

    return {
      message: 'If this email exists, a password reset token has been generated.',
      resetToken: config.nodeEnv === 'development' ? resetToken : undefined
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: {
          gt: new Date()
        }
      }
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        resetToken: null,
        resetTokenExp: null
      }
    });

    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { isRevoked: true }
    });

    createAuditLog({
      userId: user.id,
      entityType: 'Auth',
      action: 'reset_password'
    });

    return { message: 'Password has been reset successfully' };
  }
}
