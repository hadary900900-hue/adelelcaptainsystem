import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { authMiddleware } from '../../middleware/auth.middleware';
import { loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@erp/shared';

const router = Router();
const controller = new AuthController();

router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', controller.refreshToken);
router.post('/logout', authMiddleware, controller.logout);
router.get('/me', authMiddleware, controller.getMe);
router.post('/forgot-password', validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), controller.resetPassword);

export default router;
