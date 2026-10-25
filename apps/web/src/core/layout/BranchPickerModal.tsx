import { useAuth } from '../auth/AuthContext';

export default function BranchPickerModal() {
  const { user, setActiveBranchId } = useAuth();

  const branches = user?.branches || [];

  const handleSelect = (branchId: string) => {
    setActiveBranchId(branchId);
  };

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999 }}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
        <div className="modal-content border-0 shadow-lg rounded-4">
          {/* Header */}
          <div className="modal-header border-0 pb-0 px-4 pt-4">
            <div className="text-center w-100">
              <div
                className="rounded-circle bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3"
                style={{ width: 64, height: 64 }}
              >
                <i className="bi bi-building fs-2 text-primary" />
              </div>
              <h4 className="fw-bold mb-1">اختر الفرع</h4>
              <p className="text-muted small mb-0">
                اختر الفرع اللي هتشتغل منه في هذه الجلسة
              </p>
            </div>
          </div>

          {/* Branch List */}
          <div className="modal-body px-4 py-3">
            {branches.length === 0 ? (
              <div className="text-center text-muted py-4">
                <i className="bi bi-exclamation-circle fs-2 d-block mb-2" />
                <p>مفيش فروع متاحة لحسابك. تواصل مع المسؤول.</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {branches.map((branch: any) => (
                  <button
                    key={branch.id}
                    className="btn btn-outline-primary text-start p-3 rounded-3 d-flex align-items-center gap-3 hover-shadow"
                    onClick={() => handleSelect(branch.id)}
                    style={{ transition: 'all 0.15s ease' }}
                  >
                    <div
                      className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 44, height: 44 }}
                    >
                      {branch.isDefault ? (
                        <i className="bi bi-star-fill text-warning" />
                      ) : (
                        <i className="bi bi-building text-primary" />
                      )}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-semibold">{branch.nameAr || branch.nameEn}</div>
                      <div className="small text-muted">{branch.nameEn}</div>
                      <div className="font-monospace text-muted" style={{ fontSize: '0.75rem' }}>
                        كود الفرع: {branch.code}
                        {branch.isDefault && (
                          <span className="badge bg-warning text-dark ms-2">الفرع الرئيسي</span>
                        )}
                      </div>
                    </div>
                    <i className="bi bi-arrow-left-circle-fill text-primary fs-5" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="modal-footer border-0 px-4 pb-4 pt-0 justify-content-center">
            <p className="text-muted small mb-0">
              <i className="bi bi-info-circle me-1" />
              يمكنك تغيير الفرع في أي وقت من شريط الأدوات العلوي
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
