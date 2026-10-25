import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema } from '@erp/shared';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../../../core/api/client';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: tokenFromUrl,
      newPassword: ''
    }
  });

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      const res: any = await apiClient.post('/auth/reset-password', data);
      setIsSuccess(true);
      toast.success(res.message || 'Password reset successful');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card animate-slide-up">
        <div className="text-center mb-4">
          <i className="bi bi-shield-check text-success display-4"></i>
          <h2 className="fw-bold mt-2">Reset Password</h2>
          <p className="text-muted small">Enter your reset token and new password</p>
        </div>

        {isSuccess ? (
          <div className="alert alert-success text-center" role="alert">
            <i className="bi bi-check-circle-fill fs-2 d-block mb-2"></i>
            <h6 className="fw-bold">Password Reset Successfully!</h6>
            <p className="small mb-2">Redirecting to login page...</p>
            <Link to="/login" className="btn btn-sm btn-primary">
              Sign In Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-3">
              <label className="form-label">Reset Token</label>
              <input
                type="text"
                disabled={isSubmitting}
                className={`form-control ${errors.token ? 'is-invalid' : ''}`}
                {...register('token')}
                placeholder="Paste reset token here"
              />
              {errors.token && <div className="invalid-feedback">{String(errors.token.message || 'Reset token is required')}</div>}
            </div>

            <div className="mb-3">
              <label className="form-label">New Password</label>
              <input
                type="password"
                disabled={isSubmitting}
                className={`form-control ${errors.newPassword ? 'is-invalid' : ''}`}
                {...register('newPassword')}
                placeholder="At least 8 characters"
              />
              {errors.newPassword && <div className="invalid-feedback">{String(errors.newPassword.message || 'Password must be at least 8 characters')}</div>}
            </div>

            <button type="submit" disabled={isSubmitting} className="w-100 erp-btn-primary d-flex align-items-center justify-content-center gap-2 mb-3">
              {isSubmitting && <span className="spinner-border spinner-border-sm" role="status"></span>}
              {isSubmitting ? 'Updating Password...' : 'Reset Password'}
            </button>

            <div className="text-center">
              <Link to="/login" className="text-decoration-none small text-muted">
                &larr; Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
