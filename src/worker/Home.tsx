import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { subscribeToWorkerWashes, getISTDateKey } from '../data/washes';
import type { Wash } from '../data/types';
import { useAuth } from '../auth/AuthGuard';
import { LogOut, Scan, Clock, CheckCircle, WifiOff } from 'lucide-preact';
import { auth } from '../firebase';
import { getDailyStats } from '../data/stats';

export const Home = () => {
  const { user, role } = useAuth();
  const [washes, setWashes] = useState<Wash[]>([]);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to latest 10 washes
    const unsubscribe = subscribeToWorkerWashes(user.uid, (data) => {
      setWashes(data);
      // In a real app we might get the exact count for the worker, 
      // but the prompt says "today's count". It could mean worker's count or total count.
      // Let's fetch the overall dailyStats count to show the center's volume, or just calculate worker's from washes?
      // MVP: Let's fetch the center's total today count.
      getDailyStats().then(stats => setTodayCount(stats?.count || 0));
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await auth.signOut();
    route('/login', true);
  };

  return (
    <div class="container">
      <header class="header" style={{ borderRadius: '16px', margin: '-16px -16px 16px -16px', padding: '16px 24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem' }}>Wash Ledger</h2>
          <p class="text-muted" style={{ fontSize: '0.875rem' }}>Hello, {user?.email?.split('@')[0]}</p>
        </div>
        <button class="btn" onClick={handleLogout} style={{ minHeight: '40px', padding: '0 12px' }}>
          <LogOut size={20} />
        </button>
      </header>

      {role === 'admin' && (
        <div class="glass-panel text-center mb-4" style={{ cursor: 'pointer', background: 'var(--primary)', color: 'white' }} onClick={() => route('/admin')}>
          <strong>Admin Dashboard</strong> - Tap to enter
        </div>
      )}

      <div class="glass-panel text-center">
        <h3 class="text-muted mb-4">Today's Washes</h3>
        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--primary)' }}>
          {todayCount}
        </div>
      </div>

      <button 
        class="btn btn-primary btn-large mt-4" 
        style={{ width: '100%', minHeight: '80px', fontSize: '1.5rem', borderRadius: '24px' }}
        onClick={() => route('/scan')}
      >
        <Scan size={32} />
        Record Wash
      </button>

      <div class="mt-4">
        <h3 class="mb-4">Recent Entries</h3>
        {washes.length === 0 ? (
          <p class="text-muted text-center glass-panel">No washes recorded yet.</p>
        ) : (
          <div class="flex-col gap-2">
            {washes.map(wash => (
              <div key={wash.id} class="glass-panel flex items-center justify-between" style={{ padding: '16px' }}>
                <div>
                  <div class="fw-bold" style={{ fontSize: '1.2rem', letterSpacing: '1px' }}>{wash.plate}</div>
                  <div class="text-muted flex items-center gap-2" style={{ fontSize: '0.875rem', marginTop: '4px' }}>
                    {wash.vehicleType} • {wash.serviceName}
                  </div>
                </div>
                <div class="text-right">
                  <div class="fw-bold text-success">₹{wash.amount}</div>
                  <div class="flex items-center gap-2" style={{ justifyContent: 'flex-end', marginTop: '4px' }}>
                    {wash.hasPendingWrites && <WifiOff size={14} color="var(--danger)" title="Pending sync" />}
                    {wash.status === 'paid' ? (
                      <CheckCircle size={14} color="var(--success)" />
                    ) : (
                      <Clock size={14} color="var(--primary)" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
