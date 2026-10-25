import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import toast from 'react-hot-toast';

export default function BranchesPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchToDelete, setBranchToDelete] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [form, setForm] = useState({
    code: '',
    nameEn: '',
    nameAr: '',
    address: '',
    phone: '',
    email: '',
    isHeadquarters: false,
  });

  const { data: branchesData, isLoading, error, refetch } = useQuery({
    queryKey: ['branches-list', search],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches', {
        params: { limit: 100, search: search || undefined }
      });
      return res;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/branches', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['branches-select'] });
      toast.success('Branch created successfully');
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to create branch');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await apiClient.put(`/branches/${id}`, payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['branches-select'] });
      toast.success('Branch updated successfully');
      setEditingBranch(null);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to update branch');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/branches/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches-list'] });
      queryClient.invalidateQueries({ queryKey: ['branches-select'] });
      toast.success('Branch deleted successfully');
      setBranchToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to delete branch');
    },
  });

  const resetForm = () => {
    setForm({
      code: '',
      nameEn: '',
      nameAr: '',
      address: '',
      phone: '',
      email: '',
      isHeadquarters: false,
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (branch: any) => {
    setForm({
      code: branch.code,
      nameEn: branch.nameEn,
      nameAr: branch.nameAr || '',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      isHeadquarters: !!branch.isHeadquarters,
    });
    setEditingBranch(branch);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      email: form.email ? form.email : null,
      address: form.address ? form.address : null,
      phone: form.phone ? form.phone : null,
    };

    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const rawBranches = branchesData?.data || [];
  const branches = rawBranches.filter((b: any) => {
    if (typeFilter === 'HQ') return b.isHeadquarters;
    if (typeFilter === 'BRANCH') return !b.isHeadquarters;
    return true;
  });

  return (
    <div className="animate-fade-in vh-100">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-building me-2 text-primary"></i>
            إدارة الفروع (Branches)
          </h3>
          <p className="text-muted small mb-0">إدارة فروع الشركة والمقر الرئيسي وبيانات التواصل</p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-clockwise me-1"></i> تحديث
          </button>
          {hasPermission('branches.create') && (
            <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
              <i className="bi bi-plus-lg me-1"></i> إضافة فرع جديد
            </button>
          )}
        </div>
      </div>

      {/* Filter Card */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-3">
          <div className="row g-2">
            <div className="col-md-8">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="بحث باسم الفرع، الكود، أو رقم الهاتف..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select form-select-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">جميع أنواع الفروع</option>
                <option value="HQ">المقر الرئيسي (Headquarters)</option>
                <option value="BRANCH">فروع المعارض (Branches)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-muted">Loading branches...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i> Failed to load branches.
        </div>
      ) : (
        <div className="erp-card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Code</th>
                  <th>Name (English)</th>
                  <th>Name (Arabic)</th>
                  <th>Phone / Address</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches && branches.length > 0 ? (
                  branches.map((branch: any) => (
                    <tr key={branch.id}>
                      <td>
                        <span className="badge bg-dark font-monospace">{branch.code}</span>
                      </td>
                      <td className="fw-semibold">{branch.nameEn}</td>
                      <td dir="rtl">{branch.nameAr}</td>
                      <td className="small text-muted">
                        {branch.phone || '-'} {branch.address ? `• ${branch.address}` : ''}
                      </td>
                      <td>
                        {branch.isHeadquarters ? (
                          <span className="badge bg-primary">Headquarters</span>
                        ) : (
                          <span className="badge bg-secondary">Branch</span>
                        )}
                      </td>
                      <td>
                        {branch.isActive ? (
                          <span className="badge bg-success">Active</span>
                        ) : (
                          <span className="badge bg-danger">Inactive</span>
                        )}
                      </td>
                      <td className="text-muted small">
                        {new Date(branch.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {hasPermission('branches.update') && (
                            <button
                              className="btn btn-outline-primary"
                              title="تعديل الفرع"
                              onClick={() => handleOpenEdit(branch)}
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                          )}
                          {hasPermission('branches.delete') && !branch.isHeadquarters && (
                            <button
                              className="btn btn-outline-danger"
                              title="حذف الفرع"
                              onClick={() => setBranchToDelete(branch)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-muted">
                      No branches found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      {(showAddModal || editingBranch) && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-building-gear me-2 text-primary"></i>
                    {editingBranch ? `Edit Branch: ${editingBranch.nameEn}` : 'Add New Branch'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingBranch(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Branch Code *</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="e.g. CAI-01"
                        required
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 01012345678"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">English Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Nasr City Main Showroom"
                        required
                        value={form.nameEn}
                        onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Arabic Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="مثال: معرض مدينة نصر الرئيسي"
                        dir="rtl"
                        required
                        value={form.nameAr}
                        onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="branch@elsalambikes.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Address</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Full street address..."
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="isHq"
                          checked={form.isHeadquarters}
                          onChange={(e) => setForm({ ...form, isHeadquarters: e.target.checked })}
                        />
                        <label className="form-check-label fw-semibold" htmlFor="isHq">
                          Headquarters (الفرع الرئيسي)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingBranch(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingBranch ? 'Save Changes' : 'Create Branch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {branchToDelete && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i> Confirm Delete Branch
                </h5>
                <button type="button" className="btn-close" onClick={() => setBranchToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete branch <strong>"{branchToDelete.nameEn}"</strong> ({branchToDelete.code})?
                </p>
                <div className="alert alert-warning small mb-0">
                  <i className="bi bi-info-circle me-1"></i> Branches with assigned warehouses or active users cannot be deleted.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setBranchToDelete(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(branchToDelete.id)}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Branch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
