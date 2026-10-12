import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { route } from 'preact-router';
import { collection, getDocs, doc, setDoc, updateDoc, query, where } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, createSecondaryApp } from '../firebase';
import { getISTDateKey } from '../data/washes';
import type { Wash } from '../data/types';
import { 
  ArrowLeft, UserPlus, CheckCircle2, XCircle, 
  Mail, Lock, User, ShieldCheck, Sparkles, 
  ChevronDown, ChevronUp, Shield, Wrench
} from 'lucide-preact';

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

  const fetchData = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    if (!email || password.length < 6) {
      alert('Password must be at least 6 characters.');
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
      setShowAddForm(false);
      await fetchData();
      alert('Worker account created successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', id), { active: !currentStatus });
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

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
            <div class="brand-subtitle">{workers.length} registered attendants</div>
          </div>
        </div>

        <button 
          class="btn btn-primary"
          style={{ minHeight: '36px', padding: '0 12px', fontSize: '12px', borderRadius: 'var(--radius-sm)' }}
          onClick={() => setShowAddForm(!showAddForm)}
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
            <span class="metric-label">Total Staff</span>
            <span class="metric-value primary">{workers.length}</span>
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

        {/* Add New Worker Expandable Card */}
        {showAddForm && (
          <form class="glass-panel" onSubmit={handleCreate} style={{ padding: '16px', border: '2px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                New Worker Registration
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Staff Credentials</span>
            </div>
            
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
                    placeholder="worker3@wash.ceat.in" 
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
                  disabled={creating}
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
              Active Staff Roster
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
              No worker accounts found. Tap "Add Worker" to register an attendant.
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

                      <button 
                        class="btn" 
                        style={{ 
                          minHeight: '34px', 
                          padding: '0 12px', 
                          fontSize: '12px',
                          fontWeight: '700',
                          color: w.active ? 'var(--danger)' : 'var(--success)',
                          borderColor: w.active ? 'var(--danger-border)' : 'var(--success-border)',
                          background: w.active ? 'var(--danger-bg)' : 'var(--success-bg)'
                        }}
                        onClick={() => toggleActive(w.id, w.active)}
                      >
                        {w.active ? (
                          <><XCircle size={14} /> Disable</>
                        ) : (
                          <><CheckCircle2 size={14} /> Enable</>
                        )}
                      </button>
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
              Staff Roles & Privileges
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Attendants can scan license plates and log washes for their active shift. Only Administrator accounts can alter pricing, void entries, or manage the staff roster.
          </div>
        </div>
      </main>
    </div>
  );
};
