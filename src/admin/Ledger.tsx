import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { Wash } from '../data/types';
import { getISTDateKey, updateWash } from '../data/washes';
import { ArrowLeft, CheckCircle, Clock, Download, Edit2, X } from 'lucide-preact';

export const Ledger = () => {
  const [washes, setWashes] = useState<Wash[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Basic filter state for MVP
  const [date, setDate] = useState(getISTDateKey(new Date()));

  const fetchWashes = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'washes'),
        where('dateKey', '==', date)
      );
      const snap = await getDocs(q);
      const rawWashes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wash));
      // Sort descending
      rawWashes.sort((a, b) => new Date(b.deviceTime).getTime() - new Date(a.deviceTime).getTime());
      setWashes(rawWashes.slice(0, 50));
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
      await fetchWashes(); // refresh
    } catch (err) {
      console.error(err);
      alert('Failed to update wash.');
    }
  };

  const handleVoid = async (wash: Wash) => {
    if (confirm(`Are you sure you want to void wash for ${wash.plate}?`)) {
      await handleUpdate(wash.id!, { amount: 0 }, 'Voided by Admin');
    }
  };

  const handleEdit = async (wash: Wash) => {
    const newPlate = prompt('Enter new plate:', wash.plate);
    if (newPlate && newPlate !== wash.plate) {
      await handleUpdate(wash.id!, { plate: newPlate }, 'Corrected Plate');
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

  return (
    <div class="container">
      <header class="header" style={{ borderRadius: '16px', margin: '-16px -16px 16px -16px', padding: '16px 24px' }}>
        <div class="flex items-center gap-4">
          <button class="btn" onClick={() => route('/admin')} style={{ minHeight: '40px', padding: '0 12px' }}>
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: '1.25rem' }}>Master Ledger</h2>
        </div>
      </header>

      <div class="glass-panel mb-4">
        <label class="text-muted fw-bold mb-2" style={{ display: 'block' }}>Date Filter</label>
        <div class="flex items-center gap-2">
          <input 
            type="date" 
            class="input-glass" 
            style={{ flex: 1 }}
            value={date} 
            onChange={e => setDate((e.target as HTMLInputElement).value)} 
          />
          <button class="btn btn-primary" onClick={exportCSV}>
            <Download size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <div class="glass-panel text-center text-muted">Loading...</div>
      ) : washes.length === 0 ? (
        <div class="glass-panel text-center text-muted">No washes found for this date.</div>
      ) : (
        <div class="flex-col gap-2">
          {washes.map(wash => (
            <div key={wash.id} class="glass-panel flex-col gap-2" style={{ padding: '16px' }}>
              <div class="flex items-center justify-between">
                <div>
                  <div class="fw-bold" style={{ fontSize: '1.2rem', letterSpacing: '1px', textDecoration: wash.amount === 0 ? 'line-through' : 'none' }}>
                    {wash.plate}
                  </div>
                  <div class="text-muted flex items-center gap-2" style={{ fontSize: '0.875rem', marginTop: '4px' }}>
                    {wash.vehicleType} • {wash.serviceName} • {wash.paymentMode}
                  </div>
                  <div class="text-muted" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    {new Date(wash.deviceTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </div>
                </div>
                <div class="text-right">
                  <div class="fw-bold text-success" style={{ textDecoration: wash.amount === 0 ? 'line-through' : 'none' }}>
                    ₹{wash.amount}
                  </div>
                  <div class="flex items-center gap-2" style={{ justifyContent: 'flex-end', marginTop: '4px' }}>
                    {wash.status === 'paid' ? (
                      <span class="text-success flex items-center gap-1" style={{ fontSize: '0.875rem' }}><CheckCircle size={14} /> Paid</span>
                    ) : wash.amount > 0 ? (
                      <span class="text-danger flex items-center gap-1" style={{ fontSize: '0.875rem', color: 'var(--danger)' }}><Clock size={14} /> Pending</span>
                    ) : (
                      <span class="text-muted flex items-center gap-1" style={{ fontSize: '0.875rem' }}><X size={14} /> Void</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Admin Actions */}
              <div class="flex items-center gap-2" style={{ marginTop: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '8px' }}>
                {wash.status === 'pending' && wash.amount > 0 && (
                  <button class="btn btn-primary" style={{ flex: 1, padding: '4px' }} onClick={() => handleUpdate(wash.id!, { status: 'paid' }, 'Marked Paid')}>
                    Mark Paid
                  </button>
                )}
                {wash.amount > 0 && (
                  <button class="btn" style={{ flex: 1, padding: '4px', background: 'var(--glass-bg)', color: 'var(--danger)' }} onClick={() => handleVoid(wash)}>
                    Void
                  </button>
                )}
                <button class="btn" style={{ flex: 1, padding: '4px', background: 'var(--glass-bg)' }} onClick={() => handleEdit(wash)}>
                  <Edit2 size={16} /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
