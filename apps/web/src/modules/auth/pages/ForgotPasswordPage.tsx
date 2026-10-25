import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '@erp/shared';
import { Link } from 'react-router-dom';
import { apiClient } from '../../../core/api/client';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [tempResetToken, setTempResetToken] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      const res: any = await apiClient.post('/auth/forgot-password', data);
      setSuccessInfo(res.data?.message || 'If this email exists in our system, reset instructions have been created.');
      if (res.data?.resetToken) {
        setTempResetToken(res.data.resetToken);
      }
      toast.success('Reset request submitted');
    } catch (err: any) {
      toast.error(err.message || 'Request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card animate-slide-up">
        <div className="text-center mb-4">
          <i className="bi bi-key-fill text-warning display-4"></i>
          <h2 className="fw-bold mt-2">Forgot Password</h2>
          <p className="text-muted small">Enter your email address to receive password reset instructions</p>
        </div>

        {successInfo ? (
          <div className="alert alert-success" role="alert">
            <h6 className="alert-heading fw-bold mb-1">Request Received</h6>
            <p className="small mb-2">{successInfo}</p>
            {tempResetToken && (
              <div className="p-2 bg-light rounded small mt-2">
                <span className="text-muted d-block mb-1">Development Reset Token:</span>
                <code className="text-break">{tempResetToken}</code>
                <div className="mt-2">
                  <Link to={`/reset-password?token=${tempResetToken}`} className="btn btn-sm btn-outline-success">
                    Proceed to Reset Page &rarr;
                  </Link>
                </div>
              </div>
            )}
            <hr />
            <Link to="/login" className="btn btn-sm btn-outline-primary w-100">
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-3">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                disabled={isSubmitting}
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                {...register('email')}
                placeholder="name@company.com"
              />
              {errors.email && <div className="invalid-feedback">{String(errors.email.message || 'Invalid email')}</div>}
            </div>

            <button type="submit" disabled={isSubmitting} className="w-100 erp-btn-primary d-flex align-items-center justify-content-center gap-2 mb-3">
              {isSubmitting && <span className="spinner-border spinner-border-sm" role="status"></span>}
              {isSubmitting ? 'Sending Request...' : 'Send Reset Instructions'}
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
