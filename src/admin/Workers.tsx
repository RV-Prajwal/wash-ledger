import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, createSecondaryApp } from '../firebase';
import { getISTDateKey } from '../data/washes';
import type { Wash } from '../data/types';
import { 
  ArrowLeft, UserPlus, CheckCircle2, XCircle, 
  Mail, Lock, ShieldCheck, Sparkles, 
  Shield, AlertCircle, RefreshCw, Trash2
} from 'lucide-preact';
import { getUserFriendlyError } from '../utils/errors';

const MAX_WORKERS = 3;

interface Worker {
  id: string;
  email: string;
  active: boolean;
  role: string;
}

export const Workers = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [todayWashes, setTodayWashes] = useState<Wash[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [statusError, setStatusError] = useState('');
  const [fetchError, setFetchError] = useState('');

  // Delete worker dialog states
  const [deleteTarget, setDeleteTarget] = useState<Worker | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setFetchError('');
    try {
      // 1. Fetch worker user accounts
      const userSnap = await getDocs(collection(db, 'users'));
      const list = userSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Worker))
        .filter(w => w.role === 'worker');
      setWorkers(list);

      // 2. Fetch today's washes to calculate worker productivity
      const todayKey = getISTDateKey();
      const washSnap = await getDocs(query(collection(db, 'washes'), where('dateKey', '==', todayKey)));
      setTodayWashes(washSnap.docs.map(d => d.data() as Wash));
    } catch (err) {
      console.error(err);
      setFetchError(getUserFriendlyError(err, 'Unable to load attendant accounts. Please check your connection.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // Enforce maximum 3 workers limit
    if (workers.length >= MAX_WORKERS) {
      setFormError(`Maximum limit of ${MAX_WORKERS} worker accounts reached. Please delete an existing worker before registering a new one.`);
      return;
    }

    if (!email || password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    
    setCreating(true);
    try {
      const secondaryApp = createSecondaryApp();
      const secondaryAuth = getAuth(secondaryApp);
      
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      
      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        role: 'worker',
        active: true
      });
      
      setEmail('');
      setPassword('');
      setFormSuccess('Worker account created successfully!');
      await fetchData();
      setTimeout(() => {
        setShowAddForm(false);
        setFormSuccess('');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setFormError(getUserFriendlyError(err, 'Failed to create worker account. Please verify credentials.'));
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    setStatusError('');
    try {
      await updateDoc(doc(db, 'users', id), { active: !currentStatus });
      await fetchData();
    } catch (err) {
      console.error(err);
      setStatusError(getUserFriendlyError(err, 'Failed to update attendant active status.'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteDoc(doc(db, 'users', deleteTarget.id));
      setDeleteSuccess(`Worker ${deleteTarget.email} deleted successfully.`);
      setTimeout(() => setDeleteSuccess(''), 3000);
      setDeleteTarget(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setDeleteError(getUserFriendlyError(err, 'Failed to delete worker account. Please try again.'));
    } finally {
      setDeleting(false);
    }
  };

  const isAtMaxLimit = workers.length >= MAX_WORKERS;
  const activeCount = workers.filter(w => w.active).length;
  const totalWashesLogged = todayWashes.length;

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
            <div class="brand-title">Manage Workers</div>
            <div class="brand-subtitle">{workers.length}/{MAX_WORKERS} attendants registered</div>
          </div>
        </div>

        <button 
          class="btn btn-primary"
          style={{ 
            minHeight: '36px', 
            padding: '0 12px', 
            fontSize: '12px', 
            borderRadius: 'var(--radius-sm)',
            opacity: isAtMaxLimit && !showAddForm ? 0.7 : 1
          }}
          onClick={() => {
            if (isAtMaxLimit && !showAddForm) {
              setStatusError(`Maximum limit of ${MAX_WORKERS} worker accounts reached. Delete an existing worker before adding a new one.`);
              return;
            }
            setStatusError('');
            setShowAddForm(!showAddForm);
          }}
        >
          <UserPlus size={15} />
          <span>{showAddForm ? 'Close' : 'Add Worker'}</span>
        </button>
      </header>

      {/* Main Content */}
      <main class="app-content safe-bottom-padding">
        {/* Staff Metrics Strip */}
        <section class="metrics-strip">
          <div class="metric-card">
            <span class="metric-label">Staff Slots</span>
            <span class={`metric-value ${isAtMaxLimit ? 'warning' : 'primary'}`}>
              {workers.length} / {MAX_WORKERS}
            </span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Active Now</span>
            <span class="metric-value success">{activeCount}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Today's Washes</span>
            <span class="metric-value">{totalWashesLogged}</span>
          </div>
        </section>

        {/* Max Limit Info Notice */}
        {isAtMaxLimit && !showAddForm && (
          <div style={{
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning-border)',
            color: '#92400e',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, color: '#d97706' }} />
            <span>Maximum limit of 3 worker accounts reached. To register a new worker, please delete an existing account below.</span>
          </div>
        )}

        {/* Fetch Error with Retry */}
        {fetchError && (
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
              <span>{fetchError}</span>
            </div>
            <button 
              class="btn-secondary" 
              onClick={fetchData}
              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Delete Success Alert */}
        {deleteSuccess && (
          <div style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            color: 'var(--success)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{deleteSuccess}</span>
          </div>
        )}

        {/* Status Error Alert if toggling active fails or limit hit */}
        {statusError && (
          <div style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{statusError}</span>
          </div>
        )}

        {/* Add New Worker Expandable Card */}
        {showAddForm && (
          <form class="glass-panel" onSubmit={handleCreate} style={{ padding: '16px', border: '2px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                New Worker Registration ({workers.length}/{MAX_WORKERS})
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Staff Credentials</span>
            </div>

            {formError && (
              <div style={{
                background: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div style={{
                background: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                color: 'var(--success)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>{formSuccess}</span>
              </div>
            )}
            
            <div class="flex-col gap-3">
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Worker Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="email" 
                    class="input-glass" 
                    placeholder="worker@wash.ceat.in" 
                    value={email}
                    onChange={e => setEmail((e.target as HTMLInputElement).value)}
                    style={{ paddingLeft: '38px', minHeight: '46px', fontSize: '14px' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                  Password (min 6 chars)
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="password" 
                    class="input-glass" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={e => setPassword((e.target as HTMLInputElement).value)}
                    style={{ paddingLeft: '38px', minHeight: '46px', fontSize: '14px' }}
                    required
                  />
                </div>
              </div>

              <div class="grid-2" style={{ marginTop: '4px' }}>
                <button 
                  type="button" 
                  class="secondary-action-btn"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  class="btn btn-primary" 
                  disabled={creating || isAtMaxLimit}
                  style={{ minHeight: '46px', fontSize: '14px', borderRadius: 'var(--radius-md)' }}
                >
                  {creating ? 'Registering...' : 'Create Worker'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Worker Staff Roster */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', paddingLeft: '4px' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              Active Staff Roster ({workers.length}/{MAX_WORKERS})
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
              {activeCount} of {workers.length} active
            </span>
          </div>

          {loading ? (
            <div class="glass-panel text-center text-muted" style={{ padding: '36px 16px' }}>
              Loading staff accounts & performance...
            </div>
          ) : workers.length === 0 ? (
            <div class="glass-panel text-center text-muted" style={{ padding: '36px 16px' }}>
              No worker accounts found. Tap "Add Worker" to register up to 3 attendants.
            </div>
          ) : (
            <div class="flex-col gap-2">
              {workers.map(w => {
                const count = todayWashes.filter(wash => wash.workerId === w.id || wash.workerId === w.email).length;
                const revenue = todayWashes.filter(wash => (wash.workerId === w.id || wash.workerId === w.email) && wash.status === 'paid' && !wash.voided).reduce((sum, wash) => sum + wash.amount, 0);

                return (
                  <div key={w.id} class="glass-panel" style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: w.active ? 'var(--primary-gradient)' : 'var(--border-light)',
                          color: w.active ? '#ffffff' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '16px',
                          boxShadow: w.active ? 'var(--shadow-sm)' : 'none',
                          flexShrink: 0
                        }}>
                          {w.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)', letterSpacing: '-0.2px' }}>
                            {w.email}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', marginTop: '3px' }}>
                            {w.active ? (
                              <span style={{ color: 'var(--success)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span class="status-dot"></span> Active Attendant
                              </span>
                            ) : (
                              <span style={{ color: 'var(--danger)', fontWeight: '700' }}>
                                ● Disabled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions: Enable/Disable and Delete */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          class="btn" 
                          style={{ 
                            minHeight: '34px', 
                            padding: '0 10px', 
                            fontSize: '12px',
                            fontWeight: '700',
                            color: w.active ? 'var(--danger)' : 'var(--success)',
                            borderColor: w.active ? 'var(--danger-border)' : 'var(--success-border)',
                            background: w.active ? 'var(--danger-bg)' : 'var(--success-bg)'
                          }}
                          onClick={() => toggleActive(w.id, w.active)}
                          title={w.active ? 'Disable account' : 'Enable account'}
                        >
                          {w.active ? (
                            <><XCircle size={14} /> Disable</>
                          ) : (
                            <><CheckCircle2 size={14} /> Enable</>
                          )}
                        </button>

                        <button 
                          class="btn" 
                          style={{ 
                            minHeight: '34px', 
                            padding: '0 10px', 
                            fontSize: '12px',
                            fontWeight: '700',
                            color: 'var(--danger)',
                            borderColor: 'var(--danger-border)',
                            background: 'var(--danger-bg)'
                          }}
                          onClick={() => {
                            setDeleteTarget(w);
                            setDeleteError('');
                          }}
                          title="Delete Worker Account"
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Today's Productivity Badge */}
                    <div style={{ 
                      marginTop: '10px', 
                      paddingTop: '8px', 
                      borderTop: '1px solid var(--border-light)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      color: 'var(--text-muted)'
                    }}>
                      <span>Today's Logged Washes:</span>
                      <span style={{ fontWeight: '800', color: count > 0 ? 'var(--primary)' : 'var(--text-main)' }}>
                        {count} washes {revenue > 0 && `(₹${revenue})`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Informative Security & Roles Guidance Card */}
        <div class="glass-panel" style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--primary)' }}>
            <Shield size={18} />
            <span style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>
              Staff Roles & Quota
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            A maximum of 3 attendant accounts can be active simultaneously. Attendants can scan license plates and log washes for their active shift. Only Administrator accounts can manage pricing, void entries, or alter the staff roster.
          </div>
        </div>

        {/* Modal: In-App Confirmation to Delete Worker */}
        {deleteTarget && (
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
                <Trash2 size={24} />
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-main)' }}>
                Delete Worker Account?
              </h3>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
                Are you sure you want to permanently delete <strong>{deleteTarget.email}</strong>? They will immediately lose access to the Wash Ledger app. (Past wash records logged by this attendant remain in the ledger).
              </p>

              {deleteError && (
                <div style={{
                  background: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger)',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{deleteError}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  class="btn-secondary"
                  style={{ flex: 1, minHeight: '42px', fontSize: '13px' }}
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteError('');
                  }}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  class="btn-primary"
                  style={{ flex: 1, minHeight: '42px', fontSize: '13px', background: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
