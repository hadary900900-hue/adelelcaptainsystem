import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import toast from 'react-hot-toast';

export default function BrandsPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [brandToDelete, setBrandToDelete] = useState<any>(null);

  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [search, setSearch] = useState('');

  const [brandForm, setBrandForm] = useState({
    code: '',
    nameEn: '',
    nameAr: '',
    country: '',
  });

  const [modelForm, setModelForm] = useState({
    code: '',
    nameEn: '',
    nameAr: '',
    category: 'MOTORCYCLE',
    engineCapacity: 150,
    engineType: '4-Stroke',
    transmission: 'Manual',
  });

  const { data: brandsData, isLoading } = useQuery({
    queryKey: ['brands-list', search],
    queryFn: async () => {
      const res = await apiClient.get('/brands', {
        params: { limit: 100, search: search || undefined }
      });
      return res;
    },
  });

  const { data: brandDetails } = useQuery({
    queryKey: ['brand-details', selectedBrand?.id],
    queryFn: async () => {
      const res = await apiClient.get(`/brands/${selectedBrand.id}`);
      return (res as any)?.data || res;
    },
    enabled: !!selectedBrand?.id,
  });

  const resetBrandForm = () => {
    setBrandForm({ code: '', nameEn: '', nameAr: '', country: '' });
  };

  const createBrandMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/brands', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands-list'] });
      queryClient.invalidateQueries({ queryKey: ['brands-select'] });
      toast.success('Brand registered successfully');
      setShowAddModal(false);
      resetBrandForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to register brand');
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await apiClient.put(`/brands/${id}`, payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands-list'] });
      queryClient.invalidateQueries({ queryKey: ['brands-select'] });
      queryClient.invalidateQueries({ queryKey: ['brand-details', selectedBrand?.id] });
      toast.success('Brand updated successfully');
      setEditingBrand(null);
      resetBrandForm();
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to update brand');
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/brands/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands-list'] });
      queryClient.invalidateQueries({ queryKey: ['brands-select'] });
      if (selectedBrand?.id === brandToDelete?.id) {
        setSelectedBrand(null);
      }
      toast.success('Brand deleted successfully');
      setBrandToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to delete brand');
    },
  });

  const createModelMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post(`/brands/${selectedBrand.id}/models`, payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-details', selectedBrand?.id] });
      toast.success('Vehicle model registered successfully');
      setShowAddModelModal(false);
      setModelForm({
        code: '',
        nameEn: '',
        nameAr: '',
        category: 'MOTORCYCLE',
        engineCapacity: 150,
        engineType: '4-Stroke',
        transmission: 'Manual',
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to register model');
    },
  });

  const handleOpenAdd = () => {
    resetBrandForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (b: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setBrandForm({
      code: b.code,
      nameEn: b.nameEn,
      nameAr: b.nameAr,
      country: b.country || '',
    });
    setEditingBrand(b);
  };

  const handleBrandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBrand) {
      updateBrandMutation.mutate({ id: editingBrand.id, payload: brandForm });
    } else {
      createBrandMutation.mutate(brandForm);
    }
  };

  const brands = brandsData?.data || [];

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Brands & Vehicle Models</h3>
          <p className="text-muted mb-0">Motorcycle & Scooter manufacturers and their registered models</p>
        </div>
        {hasPermission('brands.create') && (
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleOpenAdd}>
            <i className="bi bi-plus-lg"></i>
            <span>Add Brand</span>
          </button>
        )}
      </div>

      <div className="row g-4">
        <div className="col-md-7">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="fw-bold mb-0">دليل الماركات والشركات المصنعة</h5>
              <div style={{ minWidth: '220px' }}>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="بحث باسم الماركة أو الكود..."
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
            <div className="card-body p-0">
              {isLoading ? (
                <div className="p-4 text-center text-muted">Loading brands...</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Code</th>
                        <th>Brand Name</th>
                        <th>Country</th>
                        <th>Models</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brands.map((b: any) => (
                        <tr
                          key={b.id}
                          className={selectedBrand?.id === b.id ? 'table-primary' : ''}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedBrand(b)}
                        >
                          <td className="fw-bold font-monospace">{b.code}</td>
                          <td>
                            <div className="fw-semibold">{b.nameEn}</div>
                            <small className="text-muted" dir="rtl">{b.nameAr}</small>
                          </td>
                          <td>{b.country || '—'}</td>
                          <td>
                            <span className="badge bg-secondary">{b._count?.vehicleModels || 0} models</span>
                          </td>
                          <td className="text-end" onClick={(e) => e.stopPropagation()}>
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-secondary"
                                title="View models"
                                onClick={() => setSelectedBrand(b)}
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                              {hasPermission('brands.update') && (
                                <button
                                  className="btn btn-outline-primary"
                                  title="Edit brand"
                                  onClick={(e) => handleOpenEdit(b, e)}
                                >
                                  <i className="bi bi-pencil-square"></i>
                                </button>
                              )}
                              {hasPermission('brands.delete') && (
                                <button
                                  className="btn btn-outline-danger"
                                  title="Delete brand"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBrandToDelete(b);
                                  }}
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
        </div>

        {/* Selected Brand Models View */}
        <div className="col-md-5">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0">
                {selectedBrand ? `${selectedBrand.nameEn} Models` : 'Select a Brand'}
              </h5>
              {selectedBrand && hasPermission('brands.create') && (
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setShowAddModelModal(true)}
                >
                  <i className="bi bi-plus-lg me-1"></i> Add Model
                </button>
              )}
            </div>
            <div className="card-body">
              {!selectedBrand ? (
                <div className="p-4 text-center text-muted">
                  <i className="bi bi-arrow-left-circle display-4 mb-2 d-block"></i>
                  Click on any brand to view and manage its vehicle models.
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {(brandDetails?.vehicleModels || []).length === 0 ? (
                    <div className="text-muted text-center py-4">No vehicle models registered for this brand yet.</div>
                  ) : (
                    (brandDetails?.vehicleModels || []).map((m: any) => (
                      <div key={m.id} className="list-group-item px-0 py-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="fw-bold">{m.nameEn}</span>
                          <span className="badge bg-light text-dark font-monospace border">{m.code}</span>
                        </div>
                        <div className="small text-muted mb-1" dir="rtl">{m.nameAr}</div>
                        <div className="d-flex gap-2 small text-secondary">
                          <span><i className="bi bi-speedometer2 me-1"></i>{m.engineCapacity || '—'} cc</span>
                          <span>•</span>
                          <span>{m.transmission || 'Manual'}</span>
                          <span>•</span>
                          <span>{m.category}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Brand Modal */}
      {(showAddModal || editingBrand) && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleBrandSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {editingBrand ? `Edit Brand: ${editingBrand.nameEn}` : 'Register New Brand'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingBrand(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Brand Code *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={brandForm.code}
                      onChange={(e) => setBrandForm({ ...brandForm, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. SYM, HONDA, BAJAJ"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">English Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={brandForm.nameEn}
                      onChange={(e) => setBrandForm({ ...brandForm, nameEn: e.target.value })}
                      placeholder="e.g. Sanyang Motor (SYM)"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Arabic Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      dir="rtl"
                      value={brandForm.nameAr}
                      onChange={(e) => setBrandForm({ ...brandForm, nameAr: e.target.value })}
                      placeholder="مثال: إس واي إم (SYM)"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Country of Origin</label>
                    <input
                      type="text"
                      className="form-control"
                      value={brandForm.country}
                      onChange={(e) => setBrandForm({ ...brandForm, country: e.target.value })}
                      placeholder="e.g. Taiwan, Japan, India"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingBrand(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={createBrandMutation.isPending || updateBrandMutation.isPending}
                  >
                    {createBrandMutation.isPending || updateBrandMutation.isPending ? 'Saving...' : editingBrand ? 'Save Changes' : 'Register Brand'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Brand Modal */}
      {brandToDelete && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-trash me-2"></i> Confirm Delete Brand
                </h5>
                <button type="button" className="btn-close" onClick={() => setBrandToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete brand <strong>"{brandToDelete.nameEn}"</strong> ({brandToDelete.code})?
                </p>
                <div className="alert alert-warning small mb-0">
                  <i className="bi bi-info-circle me-1"></i> Any models registered under this brand will also be deleted. Products must be removed first.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setBrandToDelete(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={deleteBrandMutation.isPending}
                  onClick={() => deleteBrandMutation.mutate(brandToDelete.id)}
                >
                  {deleteBrandMutation.isPending ? 'Deleting...' : 'Delete Brand'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Model Modal */}
      {showAddModelModal && selectedBrand && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={(e) => {
                e.preventDefault();
                createModelMutation.mutate({
                  ...modelForm,
                  engineCapacity: Number(modelForm.engineCapacity),
                });
              }}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Register Model under {selectedBrand.nameEn}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddModelModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Model Code *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={modelForm.code}
                      onChange={(e) => setModelForm({ ...modelForm, code: e.target.value })}
                      placeholder="e.g. JET4-150"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">English Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={modelForm.nameEn}
                      onChange={(e) => setModelForm({ ...modelForm, nameEn: e.target.value })}
                      placeholder="e.g. Jet 4 150cc"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Arabic Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      dir="rtl"
                      value={modelForm.nameAr}
                      onChange={(e) => setModelForm({ ...modelForm, nameAr: e.target.value })}
                      placeholder="مثال: جيت 4 - 150 سي سي"
                    />
                  </div>
                  <div className="row g-2">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Category</label>
                      <select
                        className="form-select"
                        value={modelForm.category}
                        onChange={(e) => setModelForm({ ...modelForm, category: e.target.value })}
                      >
                        <option value="MOTORCYCLE">Motorcycle</option>
                        <option value="SCOOTER">Scooter</option>
                        <option value="TRICYCLE">Tricycle (تروسيكل)</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Engine CC</label>
                      <input
                        type="number"
                        className="form-control"
                        value={modelForm.engineCapacity}
                        onChange={(e) => setModelForm({ ...modelForm, engineCapacity: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddModelModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={createModelMutation.isPending}>
                    {createModelMutation.isPending ? 'Saving...' : 'Register Model'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
