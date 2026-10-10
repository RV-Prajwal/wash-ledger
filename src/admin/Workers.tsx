import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, createSecondaryApp } from '../firebase';
import { ArrowLeft, UserPlus, CheckCircle, XCircle } from 'lucide-preact';

interface Worker {
  id: string;
  email: string;
  active: boolean;
  role: string;
}

export const Workers = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New worker form
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
      // Use secondary app to prevent logging admin out
      const secondaryApp = createSecondaryApp();
      const secondaryAuth = getAuth(secondaryApp);
      
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      
      // Add to users collection
      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        role: 'worker',
        active: true
      });
      
      setEmail('');
      setPassword('');
      await fetchWorkers();
      alert('Worker created successfully!');
      
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
    <div class="container">
      <header class="header" style={{ borderRadius: '16px', margin: '-16px -16px 16px -16px', padding: '16px 24px' }}>
        <div class="flex items-center gap-4">
          <button class="btn" onClick={() => route('/admin')} style={{ minHeight: '40px', padding: '0 12px' }}>
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: '1.25rem' }}>Workers</h2>
        </div>
      </header>

      {/* Create form */}
      <form class="glass-panel mb-4" onSubmit={handleCreate}>
        <h3 class="mb-2">Add New Worker</h3>
        <div class="flex-col gap-2">
          <input 
            type="email" 
            class="input-glass" 
            placeholder="Email (e.g. w1@wash.com)" 
            value={email}
            onChange={e => setEmail((e.target as HTMLInputElement).value)}
            required
          />
          <input 
            type="password" 
            class="input-glass" 
            placeholder="Password (min 6 chars)" 
            value={password}
            onChange={e => setPassword((e.target as HTMLInputElement).value)}
            required
          />
          <button type="submit" class="btn btn-primary" disabled={creating}>
            {creating ? 'Creating...' : <><UserPlus size={18} /> Create Worker</>}
          </button>
        </div>
      </form>

      <h3 class="mb-2">Worker List</h3>
      {loading ? (
        <div class="glass-panel text-center text-muted">Loading...</div>
      ) : workers.length === 0 ? (
        <div class="glass-panel text-center text-muted">No workers found.</div>
      ) : (
        <div class="flex-col gap-2">
          {workers.map(w => (
            <div key={w.id} class="glass-panel flex items-center justify-between" style={{ padding: '16px' }}>
              <div>
                <div class="fw-bold">{w.email}</div>
                <div class="text-muted" style={{ fontSize: '0.8rem' }}>ID: {w.id.substring(0, 8)}...</div>
              </div>
              <button 
                class="btn" 
                style={{ background: 'var(--glass-bg)', padding: '8px 12px', color: w.active ? 'var(--danger)' : 'var(--success)' }}
                onClick={() => toggleActive(w.id, w.active)}
              >
                {w.active ? <><XCircle size={16} /> Disable</> : <><CheckCircle size={16} /> Enable</>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
