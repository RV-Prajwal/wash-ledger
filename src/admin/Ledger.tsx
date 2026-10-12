import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { route } from 'preact-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { Wash } from '../data/types';
import { getISTDateKey, updateWash } from '../data/washes';
import { 
  ArrowLeft, CheckCircle2, Clock, Download, 
  Edit2, X, Car, Bike, Search, Ban, Sparkles
} from 'lucide-preact';

export const Ledger = () => {
  const [washes, setWashes] = useState<Wash[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(getISTDateKey(new Date()));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'voided'>('all');

  const fetchWashes = async () => {
    setLoading(true);
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
    } catch (err) {
      console.error(err);
      alert('Failed to update wash.');
    }
  };

  const handleVoid = async (wash: Wash) => {
    if (confirm(`Are you sure you want to void wash for ${wash.plate}?`)) {
      await handleUpdate(wash.id!, { amount: 0, voided: true }, 'Voided by Admin');
    }
  };

  const handleEdit = async (wash: Wash) => {
    const newPlate = prompt('Enter corrected license plate:', wash.plate);
    if (newPlate && newPlate.toUpperCase().trim() !== wash.plate) {
      await handleUpdate(wash.id!, { plate: newPlate.toUpperCase().replace(/\s+/g, '') }, 'Corrected Plate');
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
    link.setAttribute("download", `wash_ledger_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredWashes = useMemo(() => {
    return washes.filter(w => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toUpperCase();
        if (!w.plate.toUpperCase().includes(q) && !w.serviceName.toUpperCase().includes(q)) {
          return false;
        }
      }
      if (statusFilter === 'paid') return w.status === 'paid' && !w.voided && w.amount > 0;
      if (statusFilter === 'pending') return w.status === 'pending' && !w.voided && w.amount > 0;
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
            <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Date:
            </label>
            <input 
              type="date" 
              class="input-glass" 
              style={{ minHeight: '38px', padding: '6px 12px', fontSize: '14px', flex: 1 }}
              value={date} 
              onChange={e => setDate((e.target as HTMLInputElement).value)} 
            />
          </div>

          <div class="search-bar-wrapper">
            <Search size={16} class="search-icon" />
            <input 
              type="text" 
              class="search-input"
              placeholder="Search plate (e.g. MH12)..."
              value={searchQuery}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
              style={{ minHeight: '38px' }}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div class="filter-tabs">
          <button 
            class={`filter-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({washes.length})
          </button>
          <button 
            class={`filter-tab-btn ${statusFilter === 'paid' ? 'active' : ''}`}
            onClick={() => setStatusFilter('paid')}
          >
            Paid
          </button>
          <button 
            class={`filter-tab-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            Pending
          </button>
          <button 
            class={`filter-tab-btn ${statusFilter === 'voided' ? 'active' : ''}`}
            onClick={() => setStatusFilter('voided')}
          >
            Voided
          </button>
        </div>

        {/* Wash Entries Cards / Mobile Table */}
        {loading ? (
          <div class="glass-panel text-center text-muted" style={{ padding: '36px 16px' }}>
            Loading ledger entries...
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
                      onClick={() => handleEdit(wash)}
                    >
                      <Edit2 size={13} /> Edit Plate
                    </button>

                    {!isVoided && (
                      <button 
                        class="btn" 
                        style={{ minHeight: '34px', padding: '0 10px', fontSize: '12px', color: 'var(--danger)', borderColor: 'var(--danger-border)', background: 'var(--danger-bg)' }} 
                        onClick={() => handleVoid(wash)}
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
      </main>
    </div>
  );
};
