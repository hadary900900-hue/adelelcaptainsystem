import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@erp/shared';
import { useAuth } from '../../../core/auth/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../../core/api/client';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@elsalam.com',
      password: 'Admin@123456'
    }
  });

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res: any = await apiClient.post('/auth/login', data);
      if (res.success && res.data) {
        login(res.data.accessToken, res.data.refreshToken, res.data.user);
        toast.success(res.message || 'تم تسجيل الدخول بنجاح');
        navigate('/');
      } else {
        setErrorMessage(res.message || 'فشل تسجيل الدخول، تحقق من البيانات');
      }
    } catch (err: any) {
      const msg = err.message || err.error || 'خطأ في اسم المستخدم أو كلمة المرور';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickAccount = (email: string) => {
    setValue('email', email);
    setValue('password', 'Admin@123456');
  };

  return (
    <div className="login-wrapper">
      {/* Left/Right Brand Showroom Panel */}
      <div className="login-brand-panel d-none d-lg-flex">
        <div>
          <div className="d-flex align-items-center gap-3 mb-4">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center shadow-lg"
              style={{
                width: '52px',
                height: '52px',
                background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                color: '#fff',
              }}
            >
              <i className="bi bi-bicycle fs-2"></i>
            </div>
            <div>
              <h3 className="fw-bold mb-0 text-white tracking-wide">HELPER</h3>
              <p className="text-primary-subtle small mb-0">نظام الإدارة المتكامل لمعارض الدراجات النارية والقطع</p>
            </div>
          </div>

          <div className="my-5">
            <h1 className="display-6 fw-bold text-white mb-3" style={{ lineHeight: '1.25' }}>
              التحكم الكامل في معارضك، <br />
              <span style={{ color: '#60A5FA' }}>من الشاسيه حتى الفاتورة.</span>
            </h1>
            <p className="text-light opacity-75 fs-6" style={{ maxWidth: '480px' }}>
              منظومة سحابية متطورة لإدارة الفروع المتعددة، مبيعات ونقاط البيع السريعة، تتبع أرقام الشاسيه والمحركات،
              وفواتير المبيعات وضريبة القيمة المضافة بكل دقة واحترافية.
            </p>
          </div>

          <div style={{ maxWidth: '460px' }}>
            <div className="login-feature-item">
              <i className="bi bi-shield-check text-success fs-4"></i>
              <div>
                <div className="fw-bold text-white small">نظام أمني متكامل وصلاحيات دقيقة</div>
                <div className="text-light opacity-75" style={{ fontSize: '0.78rem' }}>
                  عزل كامل للمخازن والفروع مع تسجيل كل عمليات التدقيق
                </div>
              </div>
            </div>

            <div className="login-feature-item">
              <i className="bi bi-calculator text-warning fs-4"></i>
              <div>
                <div className="fw-bold text-white small">كاشير نقطة بيع سريع (POS)</div>
                <div className="text-light opacity-75" style={{ fontSize: '0.78rem' }}>
                  إضافة سريعة للعملاء، خصومات، واحتساب الضريبة وطباعة الإيصالات الفورية
                </div>
              </div>
            </div>

            <div className="login-feature-item">
              <i className="bi bi-boxes text-info fs-4"></i>
              <div>
                <div className="fw-bold text-white small">إدارة مخزون الشاسيه والقطع</div>
                <div className="text-light opacity-75" style={{ fontSize: '0.78rem' }}>
                  جرد دوري لحظي وتتبع حركات التحويل الداخلي بين الفروع
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-top border-white border-opacity-10 d-flex justify-content-between align-items-center text-light opacity-60 small">
          <span>&copy; {new Date().getFullYear()}  Helper - جميع الحقوق محفوظة</span>
          <span>الإصدار 2.5 </span>
        </div>
      </div>

      {/* Login Form Panel */}
      <div className="login-form-panel">
        <div className="login-box">
          <div className="text-center mb-4">
            <div
              className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow"
              style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, rgba(37,99,235,0.2) 0%, rgba(29,78,216,0.4) 100%)',
                border: '1px solid rgba(59,130,246,0.3)',
              }}
            >
              <i className="bi bi-person-fill-lock text-primary fs-2"></i>
            </div>
            <h3 className="fw-bold text-white mb-1">تسجيل الدخول</h3>
            <p className="text-light opacity-75 small">مرحباً بك مجدداً! أدخل بيانات حسابك للمتابعة</p>
          </div>

          {errorMessage && (
            <div className="alert alert-danger py-2.5 px-3 small rounded-3 d-flex align-items-center gap-2 mb-4 border-0" style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
              <i className="bi bi-exclamation-triangle-fill fs-5"></i>
              <div>{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Email Field */}
            <div className="mb-3">
              <label className="form-label text-light small fw-semibold">
                البريد الإلكتروني <span className="text-danger">*</span>
              </label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0 text-light opacity-50" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                  <i className="bi bi-envelope"></i>
                </span>
                <input
                  type="email"
                  disabled={isSubmitting}
                  className={`form-control border-start-0 ${errors.email ? 'is-invalid' : ''}`}
                  {...register('email')}
                  placeholder="admin@elsalam.com"
                  dir="ltr"
                />
              </div>
              {errors.email && (
                <div className="text-danger small mt-1" style={{ fontSize: '0.78rem' }}>
                  {String(errors.email.message || 'البريد الإلكتروني غير صحيح')}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label text-light small fw-semibold mb-0">
                  كلمة المرور <span className="text-danger">*</span>
                </label>
                <Link to="/forgot-password" className="text-decoration-none small text-primary" style={{ fontSize: '0.8rem' }}>
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0 text-light opacity-50" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
                  <i className="bi bi-shield-lock"></i>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  disabled={isSubmitting}
                  className={`form-control border-start-0 border-end-0 ${errors.password ? 'is-invalid' : ''}`}
                  {...register('password')}
                  placeholder="••••••••"
                  dir="ltr"
                />
                <button
                  type="button"
                  className="input-group-text bg-transparent border-start-0 text-light opacity-75"
                  style={{ borderColor: 'rgba(255,255,255,0.12)', cursor: 'pointer' }}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
              {errors.password && (
                <div className="text-danger small mt-1" style={{ fontSize: '0.78rem' }}>
                  {String(errors.password.message || 'كلمة المرور مطلوبة')}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 shadow"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <span>دخول إلى النظام</span>
                  <i className="bi bi-arrow-left fs-5"></i>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-4 pt-3 border-top border-white border-opacity-10 text-center">
            <span className="text-light opacity-60 small d-block mb-2">تسجيل تجريبي سريع بضغطة زر:</span>
            <div className="d-flex justify-content-center gap-2">
              <button
                type="button"
                onClick={() => fillQuickAccount('admin@elsalam.com')}
                className="btn btn-sm btn-outline-light py-1 px-2.5 opacity-75 hover-opacity-100"
                style={{ fontSize: '0.75rem', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                <i className="bi bi-person-check me-1"></i> مدير النظام (Admin)
              </button>
              <button
                type="button"
                onClick={() => fillQuickAccount('admin@erp.local')}
                className="btn btn-sm btn-outline-light py-1 px-2.5 opacity-75 hover-opacity-100"
                style={{ fontSize: '0.75rem', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                <i className="bi bi-shield me-1"></i> الحساب الافتراضي
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
