import { h } from 'preact';
import { useEffect, useState, useMemo } from 'preact/hooks';
import { route } from 'preact-router';
import { subscribeToWorkerWashes, getISTDateKey } from '../data/washes';
import type { Wash } from '../data/types';
import { useAuth } from '../auth/AuthGuard';
import { 
  Scan, Camera, LogOut, Clock, CheckCircle2, 
  WifiOff, Car, Bike, ShieldCheck, Sparkles, 
  Keyboard, Search, X, ShieldAlert
} from 'lucide-preact';
import { auth } from '../firebase';
import { getDailyStats } from '../data/stats';
import heroImg from '../assets/wash-hero.jpg';

export const Home = () => {
  const { user, role } = useAuth();
  const [washes, setWashes] = useState<Wash[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'pending' | 'car' | 'bike'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const todayKey = getISTDateKey();

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to latest washes for this worker
    const unsubscribe = subscribeToWorkerWashes(user.uid, (data) => {
      setWashes(data);
      getDailyStats().then(stats => {
        setTodayCount(stats?.count || 0);
        setTodayRevenue(stats?.revenue || 0);
      });
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await auth.signOut();
    route('/login', true);
  };

  // Filter and search logic
  const filteredWashes = useMemo(() => {
    return washes.filter(wash => {
      // Search query filter (matches license plate or service)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toUpperCase();
        const matchesPlate = wash.plate.toUpperCase().includes(query);
        const matchesService = wash.serviceName.toUpperCase().includes(query);
        if (!matchesPlate && !matchesService) return false;
      }

      // Tab filter
      if (activeFilter === 'today') {
        return wash.dateKey === todayKey;
      }
      if (activeFilter === 'pending') {
        return wash.status === 'pending';
      }
      if (activeFilter === 'car') {
        return wash.vehicleType === 'Car';
      }
      if (activeFilter === 'bike') {
        return wash.vehicleType === 'Bike';
      }
      return true; // 'all'
    });
  }, [washes, activeFilter, searchQuery, todayKey]);

  // Pending washes count
  const pendingCount = washes.filter(w => w.status === 'pending').length;

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatPlate = (plate: string) => {
    // Format KA01AB1234 -> KA 01 AB 1234 for crisp presentation
    const clean = plate.toUpperCase().replace(/\s+/g, '');
    if (clean.length === 10) {
      return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6)}`;
    }
    return clean;
  };

  return (
    <div class="app-shell">
      {/* Mobile App Header */}
      <header class="app-header">
        <div class="brand-badge">
          <div class="brand-logo-icon">C</div>
          <div>
            <div class="brand-title">Wash Ledger</div>
            <div class="brand-subtitle">
              <span class="status-dot"></span>
              {user?.email?.split('@')[0] || 'Worker'}
            </div>
          </div>
        </div>

        <div class="header-actions">
          {role === 'admin' && (
            <button 
              class="icon-btn" 
              title="Admin Dashboard"
              onClick={() => route('/admin')}
            >
              <ShieldCheck size={20} color="var(--primary)" />
            </button>
          )}
          <button 
            class="icon-btn" 
            title="Sign Out"
            onClick={handleLogout}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main class="app-content">
        {/* Admin Portal Quick Switch Banner */}
        {role === 'admin' && (
          <div 
            onClick={() => route('/admin')}
            style={{
              background: 'linear-gradient(135deg, #0256d0 0%, #002e73 100%)',
              color: 'white',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} />
              <span>Admin Mode Active</span>
            </div>
            <span style={{ fontSize: '11px', opacity: 0.85 }}>Open Portal &rarr;</span>
          </div>
        )}

        {/* Hero Section matching the user's reference */}
        <section class="hero-card">
          <img 
            src={heroImg} 
            alt="CEAT Vehicle Wash Service" 
            class="hero-img"
          />
          <div class="hero-overlay">
            <span class="hero-pill">CEAT Quick Wash & Care</span>
            <div class="hero-text-content">
              <h2 class="hero-headline">India's #1 Car & Bike Wash</h2>
              <p class="hero-tagline">Spotless • Fast • Instant Plate Verification</p>
            </div>
          </div>
        </section>

        {/* Primary Action Button: Scan Wash */}
        <button 
          class="scan-cta-btn" 
          onClick={() => route('/scan')}
          id="btn-scan-wash"
        >
          <div class="scan-cta-icon-wrapper">
            <Camera size={26} color="#ffffff" />
          </div>
          <div class="scan-cta-text-col">
            <div class="scan-cta-title">Scan Wash</div>
            <div class="scan-cta-sub">Auto-detect license plate & log entry</div>
          </div>
        </button>

        {/* Secondary fallback button */}
        <button 
          class="secondary-action-btn"
          onClick={() => route('/confirm')}
          id="btn-manual-entry"
        >
          <Keyboard size={18} color="var(--text-muted)" />
          <span>Manual Entry (Type Plate)</span>
        </button>

        {/* Metrics Strip */}
        <section class="metrics-strip">
          <div class="metric-card">
            <span class="metric-label">Today's Washes</span>
            <span class="metric-value primary">{todayCount}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Center Total</span>
            <span class="metric-value success">₹{todayRevenue}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Pending</span>
            <span class={`metric-value ${pendingCount > 0 ? 'warning' : ''}`}>{pendingCount}</span>
          </div>
        </section>

        {/* Wash History Clean Table Section */}
        <section class="history-section">
          <div class="section-header">
            <h3 class="section-title">
              Wash History
              <span class="count-pill">{filteredWashes.length}</span>
            </h3>
          </div>

          {/* Filter Pills */}
          <div class="filter-tabs">
            <button 
              class={`filter-tab-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All
            </button>
            <button 
              class={`filter-tab-btn ${activeFilter === 'today' ? 'active' : ''}`}
              onClick={() => setActiveFilter('today')}
            >
              Today
            </button>
            <button 
              class={`filter-tab-btn ${activeFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveFilter('pending')}
            >
              Pending {pendingCount > 0 && `(${pendingCount})`}
            </button>
            <button 
              class={`filter-tab-btn ${activeFilter === 'car' ? 'active' : ''}`}
              onClick={() => setActiveFilter('car')}
            >
              <Car size={13} /> Cars
            </button>
            <button 
              class={`filter-tab-btn ${activeFilter === 'bike' ? 'active' : ''}`}
              onClick={() => setActiveFilter('bike')}
            >
              <Bike size={13} /> Bikes
            </button>
          </div>

          {/* Quick Search */}
          <div class="search-bar-wrapper">
            <Search size={16} class="search-icon" />
            <input 
              type="text" 
              class="search-input"
              placeholder="Search plate (e.g. KA01)..."
              value={searchQuery}
              onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Clean Table View */}
          <div class="table-card">
            <div class="table-wrapper">
              <table class="wash-table">
                <thead>
                  <tr>
                    <th>Plate</th>
                    <th>Vehicle</th>
                    <th>Time</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWashes.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div class="empty-table-state">
                          <div class="empty-state-icon">
                            <Sparkles size={24} />
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '14px' }}>
                              No washes found
                            </div>
                            <div style={{ fontSize: '12px', marginTop: '2px' }}>
                              {searchQuery ? 'Try a different search query' : 'Tap "Scan Wash" above to log your first wash'}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredWashes.map(wash => (
                      <tr key={wash.id}>
                        {/* Realistic IND Plate Badge */}
                        <td>
                          <div class="plate-badge">
                            <div class="plate-badge-ind">
                              <span>I</span>
                              <span>N</span>
                              <span>D</span>
                            </div>
                            <div class="plate-badge-number">
                              {formatPlate(wash.plate)}
                            </div>
                          </div>
                        </td>

                        {/* Vehicle & Service */}
                        <td>
                          <div class="vehicle-cell">
                            <span class="vehicle-type-tag">
                              {wash.vehicleType === 'Car' ? (
                                <Car size={13} color="var(--primary)" />
                              ) : (
                                <Bike size={13} color="var(--accent-orange)" />
                              )}
                              <span>{wash.vehicleType}</span>
                            </span>
                            <span class="service-name-text">
                              {wash.serviceName}
                            </span>
                          </div>
                        </td>

                        {/* Time */}
                        <td>
                          <span class="time-text">
                            {formatTime(wash.deviceTime)}
                          </span>
                        </td>

                        {/* Amount */}
                        <td>
                          <span class={`amount-text ${wash.status === 'paid' ? 'paid' : ''}`}>
                            ₹{wash.amount}
                          </span>
                        </td>

                        {/* Status */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {wash.voided ? (
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
                            {wash.hasPendingWrites && (
                              <span title="Pending cloud sync" style={{ display: 'flex', alignItems: 'center' }}>
                                <WifiOff size={13} color="var(--warning)" />
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
