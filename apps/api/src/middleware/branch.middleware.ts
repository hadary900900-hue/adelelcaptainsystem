import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AppError } from './auth.middleware';
import { prisma } from '@erp/database';

export async function branchMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError('User not authenticated', 401, 'UNAUTHORIZED'));
  }

  const branchIdHeader = req.headers['x-branch-id'] as string;
  
  try {
    const userBranches = await prisma.userBranch.findMany({
      where: { userId: req.user.userId },
      include: { branch: true }
    });

    if (userBranches.length === 0) {
      return next(new AppError('User has no assigned branches', 403, 'NO_BRANCH_ACCESS'));
    }

    let activeBranchId = branchIdHeader;

    if (!activeBranchId) {
      const defaultBranch = userBranches.find(ub => ub.isDefault);
      activeBranchId = defaultBranch ? defaultBranch.branchId : (userBranches[0]?.branchId || '');
    } else {
      const hasAccess = userBranches.some(ub => ub.branchId === activeBranchId);
      if (!hasAccess) {
        return next(new AppError('User does not have access to this branch', 403, 'NO_BRANCH_ACCESS'));
      }
    }

    req.user.activeBranchId = activeBranchId;
    next();
  } catch (error) {
    next(error);
  }
}
