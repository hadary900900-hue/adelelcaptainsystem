import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'balances' | 'movements'>('balances');
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');

  const [editingBalance, setEditingBalance] = useState<any>(null);
  const [balanceToDelete, setBalanceToDelete] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    quantity: 0,
    avgCost: 0,
    notes: '',
  });

  // Only admin or users with settings can view average cost
  const canViewCostPrice = hasPermission('admin.all') || hasPermission('settings.view');

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses-select'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses', { params: { limit: 100 } });
      return (res as any)?.data || res;
    },
  });

  const { data: balancesData, isLoading: loadingBalances } = useQuery({
    queryKey: ['inventory-balances', search, warehouseId],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/balances', {
        params: { search: search || undefined, warehouseId: warehouseId || undefined, limit: 50 },
      });
      return res;
    },
    enabled: activeTab === 'balances',
  });

  const { data: movementsData, isLoading: loadingMovements } = useQuery({
    queryKey: ['inventory-movements', search, warehouseId],
    queryFn: async () => {
      const res = await apiClient.get('/inventory/movements', {
        params: { search: search || undefined, warehouseId: warehouseId || undefined, limit: 50 },
      });
      return res;
    },
    enabled: activeTab === 'movements',
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await apiClient.put(`/inventory/balances/${id}`, payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      toast.success('Stock balance updated and movement logged successfully');
      setEditingBalance(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to update stock balance');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/inventory/balances/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-balances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      toast.success('Stock balance deleted and zeroed out successfully');
      setBalanceToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Failed to delete stock balance');
    },
  });

  const handleOpenEdit = (b: any) => {
    setEditForm({
      quantity: b.quantity,
      avgCost: b.avgCost || 0,
      notes: '',
    });
    setEditingBalance(b);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBalance) return;
    updateMutation.mutate({
      id: editingBalance.id,
      payload: {
        quantity: Number(editForm.quantity),
        avgCost: Number(editForm.avgCost),
        notes: editForm.notes.trim() || undefined,
      },
    });
  };

  const balances = balancesData?.data || [];
  const movements = movementsData?.data || [];

  return (
    <div className="container-fluid p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1">Inventory Management</h3>
          <p className="text-muted mb-0">Live stock balances across warehouses and complete stock movement audit trail</p>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold ${activeTab === 'balances' ? 'active' : ''}`}
            onClick={() => setActiveTab('balances')}
          >
            <i className="bi bi-boxes me-2"></i>
            Stock Balances
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold ${activeTab === 'movements' ? 'active' : ''}`}
            onClick={() => setActiveTab('movements')}
          >
            <i className="bi bi-clock-history me-2"></i>
            Stock Movement History
          </button>
        </li>
      </ul>

      {/* Filter toolbar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search products or references..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select className="form-select" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                <option value="">All Warehouses</option>
                {(warehousesData || []).map((w: any) => (
                  <option key={w.id} value={w.id}>{w.nameEn} ({w.code})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'balances' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {loadingBalances ? (
              <div className="p-5 text-center text-muted">
                <div className="spinner-border text-primary mb-2"></div>
                <div>Loading stock balances...</div>
              </div>
            ) : balances.length === 0 ? (
              <div className="p-5 text-center text-muted">
                <i className="bi bi-box2 display-4 mb-3 text-secondary d-block"></i>
                <h5>No stock records found</h5>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Product</th>
                      <th>SKU / Barcode</th>
                      <th>Warehouse</th>
                      <th>Quantity</th>
                      <th>Reserved</th>
                      <th>Available</th>
                      {canViewCostPrice && <th>Avg Cost</th>}
                      {canViewCostPrice && <th>Total Value</th>}
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.map((b: any) => (
                      <tr key={b.id}>
                        <td>
                          <div className="fw-semibold">{b.product?.nameEn}</div>
                          <small className="text-muted">{b.product?.type}</small>
                        </td>
                        <td>
                          <div className="fw-bold">{b.product?.sku}</div>
                          {b.product?.barcode && <small className="text-muted">{b.product?.barcode}</small>}
                        </td>
                        <td>{b.warehouse?.nameEn}</td>
                        <td>
                          <span className="fw-bold fs-6">{b.quantity}</span>
                        </td>
                        <td>{b.reservedQty}</td>
                        <td>
                          <span className="fw-bold text-success">{b.availableQty}</span>
                        </td>
                        {canViewCostPrice && (
                          <td>
                            <span className="badge bg-danger-subtle text-danger font-monospace">
                              {b.avgCost.toLocaleString()} EGP
                            </span>
                          </td>
                        )}
                        {canViewCostPrice && (
                          <td className="fw-semibold font-monospace">
                            {(b.quantity * b.avgCost).toLocaleString()} EGP
                          </td>
                        )}
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            {hasPermission('inventory.adjust') && (
                              <button
                                className="btn btn-outline-primary"
                                title="تعديل الرصيد المخزني"
                                onClick={() => handleOpenEdit(b)}
                              >
                                <i className="bi bi-pencil-square me-1"></i> Edit
                              </button>
                            )}
                            {hasPermission('inventory.adjust') && (
                              <button
                                className="btn btn-outline-danger"
                                title="حذف الرصيد / تصفير"
                                onClick={() => setBalanceToDelete(b)}
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
      )}

      {activeTab === 'movements' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {loadingMovements ? (
              <div className="p-5 text-center text-muted">
                <div className="spinner-border text-primary mb-2"></div>
                <div>Loading movements audit trail...</div>
              </div>
            ) : movements.length === 0 ? (
              <div className="p-5 text-center text-muted">
                <i className="bi bi-clock-history display-4 mb-3 text-secondary d-block"></i>
                <h5>No stock movements recorded</h5>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Movement #</th>
                      <th>Type</th>
                      <th>Product</th>
                      <th>Warehouse</th>
                      <th>Qty Change</th>
                      <th>Before & After</th>
                      <th>Reference</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m: any) => (
                      <tr key={m.id}>
                        <td className="font-monospace text-primary fw-bold">{m.movementNumber}</td>
                        <td>
                          <span className={`badge ${
                            m.movementType.includes('IN') || m.movementType.includes('INTAKE') ? 'bg-success' :
                            m.movementType.includes('OUT') ? 'bg-danger' : 'bg-warning text-dark'
                          }`}>
                            {m.movementType}
                          </span>
                        </td>
                        <td>
                          <div className="fw-semibold">{m.product?.nameEn}</div>
                          <small className="text-muted">{m.product?.sku}</small>
                        </td>
                        <td>{m.warehouse?.nameEn}</td>
                        <td>
                          <span className="fw-bold">{m.quantity}</span>
                        </td>
                        <td className="text-muted small">
                          {m.beforeQuantity} &rarr; {m.afterQuantity}
                        </td>
                        <td>
                          <div>{m.referenceType}</div>
                          <small className="text-muted font-monospace">{m.referenceNumber || '—'}</small>
                        </td>
                        <td className="text-muted small">
                          {new Date(m.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Stock Balance Modal */}
      {editingBalance && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <form onSubmit={handleEditSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-pencil-square text-primary me-2"></i>
                    Edit Stock Balance
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setEditingBalance(null)}></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-info py-2 small">
                    <div className="fw-bold">{editingBalance.product?.nameEn} ({editingBalance.product?.sku})</div>
                    <div>Warehouse: {editingBalance.warehouse?.nameEn}</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Physical Quantity in Warehouse *</label>
                    <input
                      type="number"
                      className="form-control"
                      required
                      min={0}
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                    />
                    <small className="text-muted">
                      Current: <strong>{editingBalance.quantity}</strong> (Reserved: {editingBalance.reservedQty})
                    </small>
                  </div>

                  {canViewCostPrice && (
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Average Unit Cost (EGP) <span className="badge bg-danger-subtle text-danger">Admin Only</span></label>
                      <input
                        type="number"
                        className="form-control"
                        min={0}
                        value={editForm.avgCost}
                        onChange={(e) => setEditForm({ ...editForm, avgCost: Number(e.target.value) })}
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Adjustment Reason / Notes</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="e.g. Physical inventory count discrepancy..."
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingBalance(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Updating...' : 'Update Balance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Stock Balance Confirmation Modal */}
      {balanceToDelete && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">
                  <i className="bi bi-trash me-2"></i> Confirm Delete Stock Balance
                </h5>
                <button type="button" className="btn-close" onClick={() => setBalanceToDelete(null)}></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete and zero out stock balance for <strong>"{balanceToDelete.product?.nameEn}"</strong> in <strong>{balanceToDelete.warehouse?.nameEn}</strong>?
                </p>
                <div className="alert alert-warning small mb-0">
                  <i className="bi bi-info-circle me-1"></i> A manual adjustment movement will be generated automatically to maintain audit trail integrity.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setBalanceToDelete(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(balanceToDelete.id)}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete & Zero Out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
