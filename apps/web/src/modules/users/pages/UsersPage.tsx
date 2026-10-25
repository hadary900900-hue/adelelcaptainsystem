import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [permissionsUser, setPermissionsUser] = useState<any>(null);
  const [userPermissionsList, setUserPermissionsList] = useState<any[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);
  const [permSearch, setPermSearch] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    firstNameEn: '',
    lastNameEn: '',
    firstNameAr: '',
    lastNameAr: '',
    phone: '',
    roleId: '',
    branchId: '',
    isActive: true,
  });

  const { data: usersData, isLoading, error, refetch } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/users?limit=100');
      return res;
    },
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles-select-users'],
    queryFn: async () => {
      const res: any = await apiClient.get('/roles?limit=100');
      return (res as any)?.data || res;
    },
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches-select-users'],
    queryFn: async () => {
      const res: any = await apiClient.get('/branches?limit=100');
      return (res as any)?.data || res;
    },
  });

  const handleOpenPermissions = async (user: any) => {
    setPermissionsUser(user);
    setLoadingPerms(true);
    try {
      const res: any = await apiClient.get(`/users/${user.id}/permissions`);
      const data = res?.data?.data || res?.data || res;
      setUserPermissionsList(data.permissions || []);
    } catch (err: any) {
      alert('فشل تحميل صلاحيات المستخدم');
      setPermissionsUser(null);
    } finally {
      setLoadingPerms(false);
    }
  };

  const handleTogglePermission = (slug: string) => {
    setUserPermissionsList(prev =>
      prev.map(p => {
        if (p.slug === slug) {
          const nextEffective = !p.effective;
          return {
            ...p,
            effective: nextEffective,
            directGranted: nextEffective,
            directRevoked: !nextEffective,
            isCustomized: true,
          };
        }
        return p;
      })
    );
  };

  const handleSavePermissions = async () => {
    if (!permissionsUser) return;
    setSavingPerms(true);
    try {
      const payload = userPermissionsList
        .filter(p => p.isCustomized)
        .map(p => ({
          permissionId: p.id,
          granted: p.effective,
        }));

      await apiClient.put(`/users/${permissionsUser.id}/permissions`, { permissions: payload });
      alert('تم حفظ صلاحيات المستخدم بنجاح');
      setPermissionsUser(null);
      refetch();
    } catch (err: any) {
      alert(err?.message || 'فشل حفظ الصلاحيات');
    } finally {
      setSavingPerms(false);
    }
  };

  const resetForm = () => {
    setForm({
      email: '',
      password: '',
      firstNameEn: '',
      lastNameEn: '',
      firstNameAr: '',
      lastNameAr: '',
      phone: '',
      roleId: '',
      branchId: '',
      isActive: true,
    });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/users', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      alert('User created successfully');
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err?.message || err?.response?.data?.message || 'Failed to create user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await apiClient.put(`/users/${id}`, payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      alert('User updated successfully');
      setEditingUser(null);
      resetForm();
    },
    onError: (err: any) => {
      alert(err?.message || err?.response?.data?.message || 'Failed to update user');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/users/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-list'] });
      alert('User deleted permanently from system');
      setUserToDelete(null);
    },
    onError: (err: any) => {
      alert(err?.message || err?.response?.data?.message || 'Failed to delete user');
    },
  });

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (user: any) => {
    const currentRoleId = user.userRoles?.[0]?.roleId || '';
    const currentBranchId = user.userBranches?.[0]?.branchId || '';
    setForm({
      email: user.email,
      password: '',
      firstNameEn: user.firstNameEn,
      lastNameEn: user.lastNameEn,
      firstNameAr: user.firstNameAr || '',
      lastNameAr: user.lastNameAr || '',
      phone: user.phone || '',
      roleId: currentRoleId,
      branchId: currentBranchId,
      isActive: !!user.isActive,
    });
    setEditingUser(user);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roleId) {
      alert('Please select at least one role');
      return;
    }
    if (!form.branchId) {
      alert('Please select a branch assignment');
      return;
    }

    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        payload: {
          email: form.email.trim(),
          firstNameEn: form.firstNameEn.trim(),
          lastNameEn: form.lastNameEn.trim(),
          firstNameAr: form.firstNameAr.trim() || form.firstNameEn.trim(),
          lastNameAr: form.lastNameAr.trim() || form.lastNameEn.trim(),
          phone: form.phone.trim() || null,
          roleIds: [form.roleId],
          branchIds: [form.branchId],
          isActive: form.isActive,
        },
      });
    } else {
      createMutation.mutate({
        email: form.email.trim(),
        password: form.password,
        firstNameEn: form.firstNameEn.trim(),
        lastNameEn: form.lastNameEn.trim(),
        firstNameAr: form.firstNameAr.trim() || form.firstNameEn.trim(),
        lastNameAr: form.lastNameAr.trim() || form.lastNameEn.trim(),
        phone: form.phone.trim() || null,
        roleIds: [form.roleId],
        branchIds: [form.branchId],
      });
    }
  };

  const users = Array.isArray(usersData) ? usersData : (usersData?.data || []);
  const roles = rolesData || [];
  const branches = branchesData || [];

  return (
    <div className="animate-fade-in vh-100">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-people-fill me-2 text-info"></i>
            User Management
          </h3>
          <p className="text-muted small mb-0">System operators, branch assignments, and roles</p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
          {hasPermission('users.create') && (
            <button className="btn btn-info btn-sm text-white" onClick={handleOpenAdd}>
              <i className="bi bi-plus-lg me-1"></i> Add User
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-info" role="status"></div>
          <p className="mt-2 text-muted">Loading users...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i> Failed to load users.
        </div>
      ) : (
        <div className="erp-card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Roles</th>
                  <th>Branches</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users && users.length > 0 ? (
                  users.map((user: any) => (
                    <tr key={user.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar me-2 bg-light-primary text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                            <i className="bi bi-person-fill"></i>
                          </div>
                          <div>
                            <div className="fw-semibold">
                              {user.firstNameEn} {user.lastNameEn}
                            </div>
                            <small className="text-muted" dir="rtl">
                              {user.firstNameAr} {user.lastNameAr}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-monospace small">{user.email}</span>
                      </td>
                      <td>
                        {user.userRoles && user.userRoles.length > 0 ? (
                          user.userRoles.map((ur: any) => (
                            <span key={ur.roleId} className="badge bg-primary-subtle text-primary border border-primary-subtle me-1">
                              {ur.role?.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted small">No roles</span>
                        )}
                      </td>
                      <td>
                        {user.userBranches && user.userBranches.length > 0 ? (
                          user.userBranches.map((ub: any) => (
                            <span key={ub.branchId} className="badge bg-secondary-subtle text-secondary border border-secondary-subtle me-1">
                              {ub.branch?.nameEn}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted small">All branches</span>
                        )}
                      </td>
                      <td>
                        {user.isActive ? (
                          <span className="badge bg-success">Active</span>
                        ) : (
                          <span className="badge bg-danger">Inactive</span>
                        )}
                      </td>
                      <td className="text-muted small">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-outline-warning"
                            title="تخصيص صلاحيات هذا المستخدم (باليوزر)"
                            onClick={() => handleOpenPermissions(user)}
                          >
                            <i className="bi bi-shield-lock-fill me-1"></i> الصلاحيات
                          </button>
                          {hasPermission('users.update') && (
                            <button
                              className="btn btn-outline-primary"
                              title="تعديل المستخدم"
                              onClick={() => handleOpenEdit(user)}
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                          )}
                          {hasPermission('users.delete') && (
                            <button
                              className="btn btn-outline-danger"
                              title="تعطيل / حذف المستخدم"
                              onClick={() => setUserToDelete(user)}
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
                    <td colSpan={7} className="text-center py-4 text-muted">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {(showAddModal || editingUser) && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-person-gear me-2 text-info"></i>
                    {editingUser ? `Edit User: ${editingUser.email}` : 'Add New System User'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingUser(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Email (Username) *</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="user@erp.local"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                    {!editingUser ? (
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Password *</label>
                        <input
                          type="password"
                          className="form-control"
                          placeholder="Minimum 8 characters"
                          required
                          minLength={8}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                      </div>
                    ) : (
                      <div className="col-md-6">
                        <label className="form-label small fw-semibold">Status</label>
                        <div className="form-check form-switch mt-2">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="userActiveSwitch"
                            checked={form.isActive}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                          />
                          <label className="form-check-label fw-semibold" htmlFor="userActiveSwitch">
                            {form.isActive ? 'Active (نشط)' : 'Inactive (معطل)'}
                          </label>
                        </div>
                      </div>
                    )}
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">First Name (English) *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="John"
                        required
                        value={form.firstNameEn}
                        onChange={(e) => setForm({ ...form, firstNameEn: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Last Name (English) *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Doe"
                        required
                        value={form.lastNameEn}
                        onChange={(e) => setForm({ ...form, lastNameEn: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">الاسم الأول (عربي)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="مثال: أحمد"
                        dir="rtl"
                        value={form.firstNameAr}
                        onChange={(e) => setForm({ ...form, firstNameAr: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">اسم العائلة (عربي)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="مثال: علي"
                        dir="rtl"
                        value={form.lastNameAr}
                        onChange={(e) => setForm({ ...form, lastNameAr: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="01012345678"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Assigned Role *</label>
                      <select
                        className="form-select"
                        required
                        value={form.roleId}
                        onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                      >
                        <option value="">Select Role...</option>
                        {roles.map((r: any) => (
                          <option key={r.id} value={r.id}>
                            {r.name} {r.isSystem ? '(System)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Default Assigned Branch *</label>
                      <select
                        className="form-select"
                        required
                        value={form.branchId}
                        onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                      >
                        <option value="">Select Branch...</option>
                        {branches.map((b: any) => (
                          <option key={b.id} value={b.id}>
                            {b.nameEn} ({b.nameAr}) - {b.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingUser(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-info text-white"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {userToDelete && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-trash3 me-2"></i> Confirm Delete User
                </h5>
                <button type="button" className="btn-close" onClick={() => setUserToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to permanently delete user <strong>"{userToDelete.email}"</strong>?
                </p>
                <div className="alert alert-danger small mb-0">
                  <i className="bi bi-exclamation-triangle me-1"></i> This action is permanent. All roles, branch assignments, and sessions for this user will be completely removed.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setUserToDelete(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(userToDelete.id)}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete User Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: User-Specific Permissions */}
      {permissionsUser && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} dir="rtl">
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable my-3" style={{ maxHeight: '90vh' }}>
            <div className="modal-content border-0 shadow-lg" style={{ height: '85vh', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header bg-dark text-white flex-shrink-0">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-shield-check text-warning fs-4"></i>
                  <div>
                    <h5 className="modal-title fw-bold mb-0">
                      تخصيص صلاحيات المستخدم: <span className="text-warning">{permissionsUser.firstNameAr || permissionsUser.firstNameEn} {permissionsUser.lastNameAr || permissionsUser.lastNameEn}</span>
                    </h5>
                    <div className="small text-secondary">
                      البريد الإلكتروني: {permissionsUser.email} | منح أو سحب أي صلاحية باليوزر مباشرةً
                    </div>
                  </div>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={() => setPermissionsUser(null)}></button>
              </div>

              <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center gap-3">
                <div className="position-relative flex-grow-1" style={{ maxWidth: '400px' }}>
                  <input
                    type="text"
                    className="form-control form-control-sm pe-4"
                    placeholder="بحث في الصلاحيات (مبيعات، مخازن، محاسبة)..."
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                  />
                  <i className="bi bi-search position-absolute end-0 top-50 translate-middle-y me-2 text-muted small"></i>
                </div>
                <div className="d-flex align-items-center gap-3 small text-muted">
                  <span className="d-flex align-items-center gap-1">
                    <span className="badge bg-success p-1 rounded-circle" style={{ width: 10, height: 10 }}> </span>
                    ممنوحة ومفعلة
                  </span>
                  <span className="d-flex align-items-center gap-1">
                    <span className="badge bg-secondary p-1 rounded-circle" style={{ width: 10, height: 10 }}> </span>
                    غير مفعلة
                  </span>
                </div>
              </div>

              <div className="modal-body overflow-auto p-4 flex-grow-1">
                {loadingPerms ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-2"></div>
                    <p className="text-muted">جاري تحميل مصفوفة الصلاحيات...</p>
                  </div>
                ) : (
                  <div className="row g-3">
                    {Object.entries(
                      userPermissionsList
                        .filter(p =>
                          (p.nameAr || '').toLowerCase().includes(permSearch.toLowerCase()) ||
                          (p.nameEn || '').toLowerCase().includes(permSearch.toLowerCase()) ||
                          (p.slug || '').toLowerCase().includes(permSearch.toLowerCase()) ||
                          (p.module || '').toLowerCase().includes(permSearch.toLowerCase())
                        )
                        .reduce((acc: any, p: any) => {
                          const mod = p.module || 'عام';
                          if (!acc[mod]) acc[mod] = [];
                          acc[mod].push(p);
                          return acc;
                        }, {})
                    ).map(([mod, perms]: [string, any]) => (
                      <div key={mod} className="col-12">
                        <div className="card border">
                          <div className="card-header bg-light py-2 fw-bold text-dark d-flex justify-content-between align-items-center">
                            <span>
                              <i className="bi bi-folder2-open me-2 text-primary"></i>
                              وحدة: <span className="text-primary text-uppercase">{mod}</span>
                            </span>
                            <span className="badge bg-secondary bg-opacity-10 text-secondary">{perms.length} صلاحية</span>
                          </div>
                          <div className="card-body p-2">
                            <div className="row g-2">
                              {perms.map((p: any) => (
                                <div key={p.id} className="col-12 col-md-6 col-lg-4">
                                  <div
                                    className={`p-2 rounded border d-flex justify-content-between align-items-center transition-all ${
                                      p.effective ? 'bg-success bg-opacity-10 border-success' : 'bg-light'
                                    }`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleTogglePermission(p.slug)}
                                  >
                                    <div>
                                      <div className="fw-semibold small text-dark">
                                        {p.nameAr || p.nameEn}
                                      </div>
                                      <div className="font-monospace text-muted" style={{ fontSize: '0.72rem' }}>
                                        {p.slug}
                                      </div>
                                      {p.fromRole && !p.isCustomized && (
                                        <span className="badge bg-primary bg-opacity-10 text-primary" style={{ fontSize: '0.65rem' }}>
                                          موروثة من الرتبة
                                        </span>
                                      )}
                                      {p.isCustomized && (
                                        <span className="badge bg-warning text-dark" style={{ fontSize: '0.65rem' }}>
                                          مخصصة لهذا اليوزر
                                        </span>
                                      )}
                                    </div>

                                    <div className="form-check form-switch m-0" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        checked={p.effective}
                                        onChange={() => handleTogglePermission(p.slug)}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary" onClick={() => setPermissionsUser(null)}>
                  إلغاء
                </button>
                <button
                  type="button"
                  className="btn btn-primary fw-bold"
                  disabled={savingPerms}
                  onClick={handleSavePermissions}
                >
                  {savingPerms ? 'جاري الحفظ...' : 'حفظ صلاحيات المستخدم الآن'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
