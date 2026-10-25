import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import toast from 'react-hot-toast';

export default function RolesPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleToDelete, setRoleToDelete] = useState<any>(null);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    name: '',
    nameAr: '',
    description: '',
    permissionIds: [] as string[],
  });

  const { data: rolesData, isLoading, error, refetch } = useQuery({
    queryKey: ['roles-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/roles?limit=100');
      return res;
    },
  });

  const { data: permissionsData } = useQuery({
    queryKey: ['permissions-list'],
    queryFn: async () => {
      const res: any = await apiClient.get('/roles/permissions');
      return (res as any)?.data || res;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/roles', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-list'] });
      toast.success('Role created successfully');
      setShowAddModal(false);
      setForm({ name: '', nameAr: '', description: '', permissionIds: [] });
    },
    onError: (err: any) => {
      const msg = err?.message || err?.response?.data?.message || 'Failed to create role';
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await apiClient.put(`/roles/${id}`, payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-list'] });
      toast.success('Role permissions updated successfully');
      setEditingRole(null);
    },
    onError: (err: any) => {
      const msg = err?.message || err?.response?.data?.message || 'Failed to update role';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/roles/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-list'] });
      toast.success('Role deleted successfully');
      setRoleToDelete(null);
    },
    onError: (err: any) => {
      const msg = err?.message || err?.response?.data?.message || 'Failed to delete role';
      toast.error(msg);
    },
  });

  const handleOpenAdd = () => {
    setForm({ name: '', nameAr: '', description: '', permissionIds: [] });
    setShowAddModal(true);
  };

  const handleOpenEdit = (role: any) => {
    const existingPermIds = role.rolePermissions ? role.rolePermissions.map((rp: any) => rp.permissionId) : [];
    setForm({
      name: role.name,
      nameAr: role.nameAr || '',
      description: role.description || '',
      permissionIds: existingPermIds,
    });
    setEditingRole(role);
  };

  const handleTogglePermission = (id: string) => {
    setForm((prev) => {
      const exists = prev.permissionIds.includes(id);
      return {
        ...prev,
        permissionIds: exists ? prev.permissionIds.filter((p) => p !== id) : [...prev.permissionIds, id],
      };
    });
  };

  const handleSelectModulePermissions = (permList: any[]) => {
    const ids = permList.map((p) => p.id);
    const allSelected = ids.every((id) => form.permissionIds.includes(id));
    setForm((prev) => {
      if (allSelected) {
        return { ...prev, permissionIds: prev.permissionIds.filter((id) => !ids.includes(id)) };
      } else {
        const set = new Set([...prev.permissionIds, ...ids]);
        return { ...prev, permissionIds: Array.from(set) };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.permissionIds.length === 0) {
      toast.error('Please assign at least one permission');
      return;
    }
    if (editingRole) {
      updateMutation.mutate({
        id: editingRole.id,
        payload: {
          name: form.name.trim(),
          nameAr: form.nameAr.trim(),
          description: form.description.trim(),
          permissionIds: form.permissionIds,
        },
      });
    } else {
      createMutation.mutate({
        name: form.name.trim(),
        nameAr: form.nameAr.trim(),
        description: form.description.trim(),
        permissionIds: form.permissionIds,
      });
    }
  };

  const rawRoles = rolesData?.data || [];
  const roles = rawRoles.filter((r: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.nameAr && r.nameAr.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });
  const groupedPermissions: Record<string, any[]> = permissionsData || {};

  return (
    <div className="animate-fade-in vh-100">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h3 className="fw-bold mb-1">
            <i className="bi bi-shield-lock-fill me-2 text-warning"></i>
            الأدوار والصلاحيات (Roles & Permissions)
          </h3>
          <p className="text-muted small mb-0">
            حدد لكل دور وظيفي ما يُسمح له بفعله واستعراضه في النظام
          </p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={() => refetch()} className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-clockwise me-1"></i> تحديث
          </button>
          {hasPermission('roles.create') && (
            <button className="btn btn-warning btn-sm text-dark fw-semibold" onClick={handleOpenAdd}>
              <i className="bi bi-plus-lg me-1"></i> إضافة دور جديد
            </button>
          )}
        </div>
      </div>

      {/* Filter Card */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-3">
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-white border-end-0">
              <i className="bi bi-search text-muted"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="بحث باسم الدور (مثال: مدير، كاشير، أمين مخزن، محاسب)..."
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
      </div>

      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-warning" role="status"></div>
          <p className="mt-2 text-muted">Loading roles...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i> Failed to load roles.
        </div>
      ) : (
        <div className="erp-card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Role Name</th>
                  <th>Description</th>
                  <th>Permissions Count</th>
                  <th>Type</th>
                  <th>Created At</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles && roles.length > 0 ? (
                  roles.map((role: any) => (
                    <tr key={role.id}>
                      <td className="fw-semibold">
                        <div className="d-flex align-items-center">
                          <i className="bi bi-shield-check me-2 text-primary fs-5"></i>
                          <div>
                            <div>{role.name}</div>
                            {role.nameAr && <small className="text-muted" dir="rtl">{role.nameAr}</small>}
                          </div>
                        </div>
                      </td>
                      <td className="text-muted small">{role.description || '-'}</td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                          <i className="bi bi-check2-circle me-1"></i>
                          {role.rolePermissions ? role.rolePermissions.length : 0} permissions
                        </span>
                      </td>
                      <td>
                        {role.isSystem ? (
                          <span className="badge bg-secondary">System Reserved</span>
                        ) : (
                          <span className="badge bg-info-subtle text-info border">Custom Role</span>
                        )}
                      </td>
                      <td className="text-muted small">
                        {new Date(role.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {!role.isSystem && hasPermission('roles.update') && (
                            <button
                              className="btn btn-outline-primary"
                              title="تعديل الصلاحيات"
                              onClick={() => handleOpenEdit(role)}
                            >
                              <i className="bi bi-pencil-square me-1"></i> Edit Permissions
                            </button>
                          )}
                          {!role.isSystem && hasPermission('roles.delete') && (
                            <button
                              className="btn btn-outline-danger"
                              title="حذف الدور"
                              onClick={() => setRoleToDelete(role)}
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
                    <td colSpan={6} className="text-center py-4 text-muted">
                      No roles found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Role Modal */}
      {(showAddModal || editingRole) && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    <i className={`bi ${editingRole ? 'bi-pencil-square text-primary' : 'bi-shield-plus text-warning'} me-2`}></i>
                    {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Custom Role'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingRole(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Role Name (English) *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Sales & Parts Specialist"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">اسم الدور (عربي)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="مثال: مسؤول المبيعات وقطع الغيار"
                        dir="rtl"
                        value={form.nameAr}
                        onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-semibold">Description</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Scope of work and duties..."
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold mb-0">
                      <i className="bi bi-key me-2 text-primary"></i>
                      Select Permissions ({form.permissionIds.length} Assigned)
                    </h6>
                    <small className="text-muted">انقر على اسم الوحدة لتحديد كل صلاحياتها أو إلغائها</small>
                  </div>

                  <div style={{ maxHeight: 420, overflowY: 'auto' }} className="p-2 border rounded bg-light">
                    <div className="row g-3">
                      {Object.entries(groupedPermissions).map(([moduleName, permList]: [string, any[]]) => {
                        const allSelected = permList.every((p) => form.permissionIds.includes(p.id));
                        return (
                          <div key={moduleName} className="col-md-6">
                            <div className="card h-100 border shadow-sm">
                              <div className="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                                <span className="fw-bold text-uppercase small text-primary">
                                  <i className="bi bi-folder2-open me-2"></i>
                                  {moduleName}
                                </span>
                                <button
                                  type="button"
                                  className={`btn btn-xs py-0 px-2 btn-outline-${allSelected ? 'danger' : 'primary'}`}
                                  style={{ fontSize: '0.75rem' }}
                                  onClick={() => handleSelectModulePermissions(permList)}
                                >
                                  {allSelected ? 'Deselect All' : 'Select All'}
                                </button>
                              </div>
                              <div className="card-body p-2">
                                {permList.map((p: any) => (
                                  <div key={p.id} className="form-check py-1">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      id={`perm-chk-${p.id}`}
                                      checked={form.permissionIds.includes(p.id)}
                                      onChange={() => handleTogglePermission(p.id)}
                                    />
                                    <label className="form-check-label small w-100 cursor-pointer" htmlFor={`perm-chk-${p.id}`}>
                                      <div className="d-flex justify-content-between">
                                        <span className="fw-semibold">{p.slug || p.nameEn || p.code}</span>
                                        {p.nameAr && <span className="text-muted" dir="rtl" style={{ fontSize: '0.75rem' }}>{p.nameAr}</span>}
                                      </div>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingRole(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-warning text-dark fw-semibold"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingRole ? 'Save Changes' : 'Create Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {roleToDelete && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i> Confirm Delete Role
                </h5>
                <button type="button" className="btn-close" onClick={() => setRoleToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete the role <strong>"{roleToDelete.name}"</strong>?
                </p>
                <div className="alert alert-warning small mb-0">
                  <i className="bi bi-info-circle me-1"></i> Roles assigned to active users cannot be deleted until re-assigned.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setRoleToDelete(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(roleToDelete.id)}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
