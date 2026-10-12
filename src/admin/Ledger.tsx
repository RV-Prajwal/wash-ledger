import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { route } from 'preact-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { Wash } from '../data/types';
import { getISTDateKey, updateWash } from '../data/washes';
import { 
  ArrowLeft, CheckCircle2, Clock, Download, 
  Edit2, X, Car, Bike, Search, Ban, Sparkles, AlertCircle, RefreshCw
} from 'lucide-preact';
import { getUserFriendlyError } from '../utils/errors';

export const Ledger = () => {
  const [washes, setWashes] = useState<Wash[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [date, setDate] = useState(getISTDateKey(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'voided'>('all');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // In-app dialog states replacing native confirm() & prompt()
  const [voidTarget, setVoidTarget] = useState<Wash | null>(null);
  const [editTarget, setEditTarget] = useState<Wash | null>(null);
  const [editPlateValue, setEditPlateValue] = useState('');
  const [editPlateError, setEditPlateError] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const fetchWashes = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const q = query(
        collection(db, 'washes'),
        where('dateKey', '==', date)
      );
      const snap = await getDocs(q);
      const rawWashes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wash));
      rawWashes.sort((a, b) => new Date(b.deviceTime).getTime() - new Date(a.deviceTime).getTime());
      setWashes(rawWashes);
    } catch (err) {
      console.error(err);
      setLoadError(getUserFriendlyError(err, 'Unable to load washes for selected date. Please check your network connection.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWashes();
  }, [date]);

  const handleUpdate = async (id: string, updates: Partial<Wash>, reason: string) => {
    if (!auth.currentUser) return;
    try {
      await updateWash(id, updates, auth.currentUser.uid, reason);
      await fetchWashes();
      setActionFeedback({ type: 'success', message: 'Wash record updated successfully.' });
      setTimeout(() => setActionFeedback(null), 2500);
    } catch (err) {
      console.error(err);
      setActionFeedback({ type: 'error', message: getUserFriendlyError(err, 'Failed to update wash record. Please try again.') });
    }
  };

  const handleOpenVoidModal = (wash: Wash) => {
    setVoidTarget(wash);
  };

  const handleConfirmVoid = async () => {
    if (!voidTarget) return;
    setIsSubmittingAction(true);
    try {
      await handleUpdate(voidTarget.id!, { amount: 0, voided: true }, 'Voided by Admin');
      setVoidTarget(null);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleOpenEditModal = (wash: Wash) => {
    setEditTarget(wash);
    setEditPlateValue(wash.plate);
    setEditPlateError('');
  };

  const handleConfirmEdit = async () => {
    if (!editTarget) return;
    const cleanPlate = editPlateValue.toUpperCase().replace(/\s+/g, '');
    if (cleanPlate.length < 4) {
      setEditPlateError('License plate must have at least 4 characters.');
      return;
    }

    setIsSubmittingAction(true);
    try {
      await handleUpdate(editTarget.id!, { plate: cleanPlate }, 'Corrected Plate');
      setEditTarget(null);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Plate', 'Vehicle', 'Service', 'Amount', 'Mode', 'Status', 'Time'];
    const rows = washes.map(w => [
      w.plate, w.vehicleType, w.serviceName, w.amount, w.paymentMode, w.status, 
      new Date(w.deviceTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ceat_wash_ledger_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter washes by search and status
  const filteredWashes = useMemo(() => {
    return washes.filter(w => {
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toUpperCase();
        const matchesPlate = w.plate.toUpperCase().includes(query);
        const matchesService = w.serviceName.toUpperCase().includes(query);
        if (!matchesPlate && !matchesService) return false;
      }

      if (statusFilter === 'paid') return w.status === 'paid' && !w.voided;
      if (statusFilter === 'pending') return w.status === 'pending' && !w.voided;
      if (statusFilter === 'voided') return w.voided || w.amount === 0;

      return true;
    });
  }, [washes, searchQuery, statusFilter]);

  const formatPlate = (plate: string) => {
    const clean = plate.toUpperCase().replace(/\s+/g, '');
    if (clean.length === 10) {
      return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6)}`;
    }
    return clean;
  };

  const totalRevenue = washes.reduce((sum, w) => w.status === 'paid' && !w.voided ? sum + w.amount : sum, 0);
  const totalPending = washes.reduce((sum, w) => w.status === 'pending' && !w.voided ? sum + w.amount : sum, 0);

  return (
    <div class="app-shell">
      {/* Mobile Top Header */}
      <header class="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            class="icon-btn" 
            onClick={() => route('/admin')}
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div class="brand-title">Master Ledger</div>
            <div class="brand-subtitle">{filteredWashes.length} entries found</div>
          </div>
        </div>

        <button 
          class="icon-btn" 
          onClick={exportCSV}
          title="Export CSV"
          style={{ background: 'var(--primary-light)', color: 'var(--primary)', borderColor: 'var(--primary-light)' }}
        >
          <Download size={18} />
        </button>
      </header>

      {/* Main Content */}
      <main class="app-content safe-bottom-padding">
        {actionFeedback && (
          <div style={{
            background: actionFeedback.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)',
            border: `1px solid ${actionFeedback.type === 'error' ? 'var(--danger-border)' : 'var(--success-border)'}`,
            color: actionFeedback.type === 'error' ? 'var(--danger)' : 'var(--success)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {actionFeedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{actionFeedback.message}</span>
          </div>
        )}

        {/* Ledger Date Financial Summary */}
        <section class="metrics-strip">
          <div class="metric-card">
            <span class="metric-label">Date Washes</span>
            <span class="metric-value primary">{washes.length}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Collected</span>
            <span class="metric-value success">₹{totalRevenue}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Pending</span>
            <span class={`metric-value ${totalPending > 0 ? 'warning' : ''}`}>₹{totalPending}</span>
          </div>
        </section>

        {/* Date Filter & Search Row */}
        <div class="glass-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="date" 
              class="input-field" 
              style={{ flex: 1, padding: '8px 12px', minHeight: '40px', fontSize: '13px' }}
              value={date} 
              onInput={(e) => setDate((e.target as HTMLInputElement).value)} 
            />
            <button 
              class="btn-secondary" 
              onClick={() => setDate(getISTDateKey(new Date()))}
              style={{ minHeight: '40px', padding: '0 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
            >
              Today
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              class="input-field" 
              style={{ width: '100%', paddingLeft: '36px', minHeight: '40px', fontSize: '13px' }}
              placeholder="Filter by plate or service..."
              value={searchQuery}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Load Error with Retry Button */}
        {loadError && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{loadError}</span>
            </div>
            <button 
              class="btn-secondary" 
              onClick={fetchWashes}
              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Tab Filters */}
        <div class="tabs-container">
          <button 
            class={`tab-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({washes.length})
          </button>
          <button 
            class={`tab-pill ${statusFilter === 'paid' ? 'active' : ''}`}
            onClick={() => setStatusFilter('paid')}
          >
            Paid ({washes.filter(w => w.status === 'paid' && !w.voided).length})
          </button>
          <button 
            class={`tab-pill ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending ({washes.filter(w => w.status === 'pending' && !w.voided).length})
          </button>
          <button 
            class={`tab-pill ${statusFilter === 'voided' ? 'active' : ''}`}
            onClick={() => setStatusFilter('voided')}
          >
            Voided ({washes.filter(w => w.voided || w.amount === 0).length})
          </button>
        </div>

        {/* Washes List Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div class="pulse" style={{ fontSize: '14px', fontWeight: '600' }}>Loading date ledger...</div>
          </div>
        ) : filteredWashes.length === 0 ? (
          <div class="empty-table-state glass-panel">
            <div class="empty-state-icon">
              <Sparkles size={24} />
            </div>
            <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '14px' }}>
              No washes match filter
            </div>
            <div style={{ fontSize: '12px' }}>
              Select another date or clear search query.
            </div>
          </div>
        ) : (
          <div class="flex-col gap-2">
            {filteredWashes.map(wash => {
              const isVoided = wash.voided || wash.amount === 0;
              return (
                <div key={wash.id} class="glass-panel" style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      {/* Realistic IND Plate Badge */}
                      <div class="plate-badge" style={{ opacity: isVoided ? 0.6 : 1 }}>
                        <div class="plate-badge-ind">
                          <span>I</span>
                          <span>N</span>
                          <span>D</span>
                        </div>
                        <div class="plate-badge-number" style={{ textDecoration: isVoided ? 'line-through' : 'none' }}>
                          {formatPlate(wash.plate)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        {wash.vehicleType === 'Car' ? (
                          <Car size={13} color="var(--primary)" />
                        ) : (
                          <Bike size={13} color="var(--accent-orange)" />
                        )}
                        <span>{wash.vehicleType}</span>
                        <span>•</span>
                        <span>{wash.serviceName}</span>
                        <span>•</span>
                        <span style={{ fontWeight: '600' }}>{wash.paymentMode}</span>
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '2px' }}>
                        {new Date(wash.deviceTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: '800', 
                        color: isVoided ? 'var(--text-muted)' : wash.status === 'paid' ? '#059669' : '#b45309',
                        textDecoration: isVoided ? 'line-through' : 'none' 
                      }}>
                        ₹{wash.amount}
                      </div>

                      <div style={{ marginTop: '4px' }}>
                        {isVoided ? (
                          <span class="status-badge voided">Void</span>
                        ) : wash.status === 'paid' ? (
                          <span class="status-badge paid">
                            <CheckCircle2 size={11} /> Paid
                          </span>
                        ) : (
                          <span class="status-badge pending">
                            <Clock size={11} /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Admin Actions Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                    {wash.status === 'pending' && !isVoided && (
                      <button 
                        class="btn btn-primary" 
                        style={{ flex: 1, minHeight: '34px', padding: '0 8px', fontSize: '12px' }} 
                        onClick={() => handleUpdate(wash.id!, { status: 'paid' }, 'Marked Paid by Admin')}
                      >
                        <CheckCircle2 size={14} /> Mark Paid
                      </button>
                    )}
                    
                    <button 
                      class="btn" 
                      style={{ flex: 1, minHeight: '34px', padding: '0 8px', fontSize: '12px' }} 
                      onClick={() => handleOpenEditModal(wash)}
                    >
                      <Edit2 size={13} /> Edit Plate
                    </button>

                    {!isVoided && (
                      <button 
                        class="btn" 
                        style={{ minHeight: '34px', padding: '0 10px', fontSize: '12px', color: 'var(--danger)', borderColor: 'var(--danger-border)', background: 'var(--danger-bg)' }} 
                        onClick={() => handleOpenVoidModal(wash)}
                        title="Void Wash"
                      >
                        <Ban size={13} /> Void
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: In-App Confirmation to Void Wash */}
        {voidTarget && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid var(--border)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                background: 'var(--danger-bg)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px'
              }}>
                <Ban size={24} />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>
                Void Wash Record?
              </h3>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '20px' }}>
                Are you sure you want to void the entry for vehicle <strong>{voidTarget.plate}</strong> ({voidTarget.serviceName})? The amount will be set to ₹0.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  class="btn-secondary"
                  style={{ flex: 1, minHeight: '42px', fontSize: '13px' }}
                  onClick={() => setVoidTarget(null)}
                  disabled={isSubmittingAction}
                >
                  Cancel
                </button>
                <button
                  class="btn-primary"
                  style={{ flex: 1, minHeight: '42px', fontSize: '13px', background: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={handleConfirmVoid}
                  disabled={isSubmittingAction}
                >
                  {isSubmittingAction ? 'Voiding...' : 'Yes, Void'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: In-App Edit Plate Dialog */}
        {editTarget && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid var(--border)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px'
              }}>
                <Edit2 size={22} />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>
                Correct License Plate
              </h3>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Update the vehicle number for this wash entry.
              </p>

              {editPlateError && (
                <div style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger)',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  marginBottom: '12px'
                }}>
                  {editPlateError}
                </div>
              )}

              <input
                type="text"
                class="input-field"
                style={{ width: '100%', minHeight: '44px', fontSize: '15px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '20px' }}
                value={editPlateValue}
                placeholder="e.g. KA01AB1234"
                onInput={(e) => {
                  setEditPlateValue((e.target as HTMLInputElement).value);
                  setEditPlateError('');
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  class="btn-secondary"
                  style={{ flex: 1, minHeight: '42px', fontSize: '13px' }}
                  onClick={() => setEditTarget(null)}
                  disabled={isSubmittingAction}
                >
                  Cancel
                </button>
                <button
                  class="btn-primary"
                  style={{ flex: 1, minHeight: '42px', fontSize: '13px' }}
                  onClick={handleConfirmEdit}
                  disabled={isSubmittingAction}
                >
                  {isSubmittingAction ? 'Saving...' : 'Save Plate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
