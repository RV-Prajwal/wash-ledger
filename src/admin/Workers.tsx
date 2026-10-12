import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, createSecondaryApp } from '../firebase';
import { 
  ArrowLeft, UserPlus, CheckCircle2, XCircle, 
  Mail, Lock, User, ShieldAlert 
} from 'lucide-preact';

interface Worker {
  id: string;
  email: string;
  active: boolean;
  role: string;
}

export const Workers = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Worker))
        .filter(w => w.role === 'worker');
      setWorkers(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
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
      await fetchWorkers();
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
      await fetchWorkers();
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

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
            <div class="brand-subtitle">{workers.length} registered staff</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="app-content safe-bottom-padding">
        {/* Add New Worker Card */}
        <form class="glass-panel" onSubmit={handleCreate} style={{ padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px' }}>
            Add Center Worker
          </div>
          
          <div class="flex-col gap-3">
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                class="input-glass" 
                placeholder="Worker Email (e.g. w2@wash.ceat.in)" 
                value={email}
                onChange={e => setEmail((e.target as HTMLInputElement).value)}
                style={{ paddingLeft: '38px', minHeight: '44px', fontSize: '14px' }}
                required
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                class="input-glass" 
                placeholder="Password (min 6 characters)" 
                value={password}
                onChange={e => setPassword((e.target as HTMLInputElement).value)}
                style={{ paddingLeft: '38px', minHeight: '44px', fontSize: '14px' }}
                required
              />
            </div>

            <button 
              type="submit" 
              class="scan-cta-btn" 
              disabled={creating}
              style={{ minHeight: '46px', padding: '10px 16px', borderRadius: 'var(--radius-md)' }}
            >
              <UserPlus size={18} />
              <span style={{ fontSize: '14px', fontWeight: '800' }}>
                {creating ? 'Creating...' : 'Create Worker Account'}
              </span>
            </button>
          </div>
        </form>

        {/* Worker Staff List */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px', paddingLeft: '4px' }}>
            Active Roster
          </div>

          {loading ? (
            <div class="glass-panel text-center text-muted" style={{ padding: '36px 16px' }}>
              Loading staff accounts...
            </div>
          ) : workers.length === 0 ? (
            <div class="glass-panel text-center text-muted" style={{ padding: '36px 16px' }}>
              No worker accounts found.
            </div>
          ) : (
            <div class="flex-col gap-2">
              {workers.map(w => (
                <div key={w.id} class="glass-panel" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: w.active ? 'var(--primary-light)' : 'var(--border-light)',
                      color: w.active ? 'var(--primary)' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '15px'
                    }}>
                      {w.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>
                        {w.email}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {w.active ? (
                          <span style={{ color: 'var(--success)', fontWeight: '700' }}>● Active</span>
                        ) : (
                          <span style={{ color: 'var(--danger)', fontWeight: '700' }}>● Disabled</span>
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
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
