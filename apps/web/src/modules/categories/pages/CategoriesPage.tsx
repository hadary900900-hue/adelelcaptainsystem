import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<any>(null);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    code: '',
    nameEn: '',
    nameAr: '',
    description: '',
  });

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['categories-list', search],
    queryFn: async () => {
      const res = await apiClient.get('/categories', {
        params: { limit: 100, search: search || undefined }
      });
      return res;
    },
  });

  const resetForm = () => {
    setForm({ code: '', nameEn: '', nameAr: '', description: '' });
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/categories', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-list'] });
      queryClient.invalidateQueries({ queryKey: ['categories-select'] });
      toast.success('Category created successfully');
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to create category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await apiClient.put(`/categories/${id}`, payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-list'] });
      queryClient.invalidateQueries({ queryKey: ['categories-select'] });
      toast.success('Category updated successfully');
      setEditingCategory(null);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to update category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/categories/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-list'] });
      queryClient.invalidateQueries({ queryKey: ['categories-select'] });
      toast.success('Category deleted successfully');
      setCategoryToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to delete category');
    },
  });

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (c: any) => {
    setForm({
      code: c.code,
      nameEn: c.nameEn,
      nameAr: c.nameAr,
      description: c.description || '',
    });
    setEditingCategory(c);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const categories = categoriesData?.data || [];

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">تصنيفات المنتجات (Categories)</h3>
          <p className="text-muted mb-0">إدارة أقسام وتصنيفات الدراجات، قطع الغيار، الزيوت والملحقات</p>
        </div>
        {hasPermission('categories.create') && (
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleOpenAdd}>
            <i className="bi bi-plus-lg"></i>
            <span>إضافة تصنيف جديد</span>
          </button>
        )}
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
              placeholder="بحث باسم التصنيف، الكود، أو الوصف..."
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

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="p-5 text-center text-muted">
              <div className="spinner-border text-primary mb-2"></div>
              <div>Loading categories...</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Code</th>
                    <th>Name (English)</th>
                    <th>Name (Arabic)</th>
                    <th>Description</th>
                    <th>Products Count</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c: any) => (
                    <tr key={c.id}>
                      <td className="fw-bold font-monospace">{c.code}</td>
                      <td>{c.nameEn}</td>
                      <td dir="rtl">{c.nameAr}</td>
                      <td className="text-muted">{c.description || '—'}</td>
                      <td>
                        <span className="badge bg-secondary">{c._count?.products || 0} products</span>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {hasPermission('categories.update') && (
                            <button
                              className="btn btn-outline-primary"
                              title="Edit Category"
                              onClick={() => handleOpenEdit(c)}
                            >
                              <i className="bi bi-pencil-square"></i>
                            </button>
                          )}
                          {hasPermission('categories.delete') && (
                            <button
                              className="btn btn-outline-danger"
                              title="Delete Category"
                              onClick={() => setCategoryToDelete(c)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {(showAddModal || editingCategory) && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {editingCategory ? `Edit Category: ${editingCategory.nameEn}` : 'Create Category'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingCategory(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Category Code *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="e.g. CAT-ACC"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">English Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={form.nameEn}
                      onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Arabic Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      dir="rtl"
                      value={form.nameAr}
                      onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingCategory(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Modal */}
      {categoryToDelete && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-trash me-2"></i> Confirm Delete Category
                </h5>
                <button type="button" className="btn-close" onClick={() => setCategoryToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete category <strong>"{categoryToDelete.nameEn}"</strong> ({categoryToDelete.code})?
                </p>
                <div className="alert alert-warning small mb-0">
                  <i className="bi bi-info-circle me-1"></i> Make sure no products are assigned to this category.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCategoryToDelete(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(categoryToDelete.id)}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
