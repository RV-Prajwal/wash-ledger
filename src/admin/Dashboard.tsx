import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { route } from 'preact-router';
import { getDailyStats } from '../data/stats';
import type { DailyStats, Wash } from '../data/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ArrowLeft, ArrowRight, Home, List, Tag, Users, 
  AlertCircle, Car, Bike, CreditCard, Banknote, 
  Sparkles, CheckCircle2, Clock, ChevronRight, BarChart3
} from 'lucide-preact';
import heroImg from '../assets/wash-hero.jpg';

export const Dashboard = () => {
  const [date, setDate] = useState(new Date());
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [todayWashes, setTodayWashes] = useState<Wash[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to get date string YYYY-MM-DD in IST
  const getISTDateKey = (d: Date) => {
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(d.getTime() + istOffset);
    return istTime.toISOString().split('T')[0];
  };

  const dateKey = getISTDateKey(date);
  const isToday = dateKey === getISTDateKey(new Date());

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch aggregated stats
      const statsData = await getDailyStats(dateKey);
      setStats(statsData);

      // 2. Fetch today's individual wash records for real-time breakdowns & live feed
      const q = query(
        collection(db, 'washes'),
        where('dateKey', '==', dateKey)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wash));
      list.sort((a, b) => new Date(b.deviceTime).getTime() - new Date(a.deviceTime).getTime());
      setTodayWashes(list);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateKey]);

  const changeDay = (days: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    setDate(newDate);
  };

  // Accurate counts (prefer stats doc, fallback to actual washes count if stats map is unpopulated)
  const totalWashesCount = stats?.count ?? todayWashes.length;
  const totalRevenueAmount = stats?.revenue ?? todayWashes.reduce((sum, w) => w.status === 'paid' && !w.voided ? sum + w.amount : sum, 0);
  const pendingAmount = stats?.pendingAmount ?? todayWashes.reduce((sum, w) => w.status === 'pending' && !w.voided ? sum + w.amount : sum, 0);

  const bikeCount = stats?.breakdownByVehicle?.Bike ?? todayWashes.filter(w => w.vehicleType === 'Bike').length;
  const carCount = stats?.breakdownByVehicle?.Car ?? todayWashes.filter(w => w.vehicleType === 'Car').length;
  const totalVehicles = bikeCount + carCount;
  const bikePercent = totalVehicles > 0 ? Math.round((bikeCount / totalVehicles) * 100) : 0;
  const carPercent = totalVehicles > 0 ? 100 - bikePercent : 0;

  const cashCount = stats?.breakdownByMode?.Cash ?? todayWashes.filter(w => w.paymentMode === 'Cash').length;
  const upiCount = stats?.breakdownByMode?.UPI ?? todayWashes.filter(w => w.paymentMode === 'UPI').length;
  const totalModes = cashCount + upiCount;
  const cashPercent = totalModes > 0 ? Math.round((cashCount / totalModes) * 100) : 0;
  const upiPercent = totalModes > 0 ? 100 - cashPercent : 0;

  const formatPlate = (plate: string) => {
    const clean = plate.toUpperCase().replace(/\s+/g, '');
    if (clean.length === 10) {
      return `${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 6)} ${clean.slice(6)}`;
    }
    return clean;
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div class="app-shell">
      {/* Mobile App Header */}
      <header class="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            class="icon-btn" 
            onClick={() => route('/')}
            title="Return to Worker Scanner"
          >
            <Home size={18} />
          </button>
          <div>
            <div class="brand-title">Admin Dashboard</div>
            <div class="brand-subtitle">
              <span class="status-dot"></span> CEAT Center Operations
            </div>
          </div>
        </div>

        <button 
          class="icon-btn" 
          onClick={() => route('/admin/ledger')}
          title="Open Master Ledger"
          style={{ background: 'var(--primary-light)', color: 'var(--primary)', borderColor: 'var(--primary-light)' }}
        >
          <List size={18} />
        </button>
      </header>

      {/* Main Content Area */}
      <main class="app-content safe-bottom-padding">
        {/* Executive Hero Banner */}
        <section class="hero-card" style={{ height: '160px' }}>
          <img 
            src={heroImg} 
            alt="CEAT Vehicle Wash Operations" 
            class="hero-img"
            style={{ height: '160px' }}
          />
          <div class="hero-overlay">
            <span class="hero-pill">Center Management</span>
            <div class="hero-text-content">
              <h2 class="hero-headline" style={{ fontSize: '17px' }}>Daily Operations & Ledger</h2>
              <p class="hero-tagline">Real-time revenue, volumes & attendant audits</p>
            </div>
          </div>
        </section>

        {/* Quick Admin Navigation Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <button 
            class="secondary-action-btn" 
            onClick={() => route('/admin/ledger')}
            style={{ flexDirection: 'column', padding: '10px 4px', minHeight: '66px', gap: '4px', borderRadius: 'var(--radius-md)' }}
          >
            <List size={20} color="var(--primary)" />
            <span style={{ fontSize: '11px', fontWeight: '800' }}>Ledger</span>
          </button>
          <button 
            class="secondary-action-btn" 
            onClick={() => route('/admin/prices')}
            style={{ flexDirection: 'column', padding: '10px 4px', minHeight: '66px', gap: '4px', borderRadius: 'var(--radius-md)' }}
          >
            <Tag size={20} color="var(--accent-orange)" />
            <span style={{ fontSize: '11px', fontWeight: '800' }}>Prices</span>
          </button>
          <button 
            class="secondary-action-btn" 
            onClick={() => route('/admin/workers')}
            style={{ flexDirection: 'column', padding: '10px 4px', minHeight: '66px', gap: '4px', borderRadius: 'var(--radius-md)' }}
          >
            <Users size={20} color="#7c3aed" />
            <span style={{ fontSize: '11px', fontWeight: '800' }}>Workers</span>
          </button>
        </div>

        {/* Date Selector Card */}
        <div class="glass-panel" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button 
            class="icon-btn" 
            onClick={() => changeDay(-1)} 
            style={{ minWidth: '36px', minHeight: '36px' }}
            title="Previous Day"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)' }}>
              {isToday ? 'Today, ' : ''}{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
              {dateKey}
            </div>
          </div>

          <button 
            class="icon-btn" 
            onClick={() => changeDay(1)} 
            style={{ minWidth: '36px', minHeight: '36px' }}
            disabled={isToday}
            title="Next Day"
          >
            <ArrowRight size={18} />
          </button>
        </div>

        {loading ? (
          <div class="glass-panel text-center text-muted" style={{ padding: '36px 16px' }}>
            Loading center operations...
          </div>
        ) : (
          <div class="flex-col gap-3">
            {/* KPI Cards */}
            <div class="grid-2">
              <div class="glass-panel" style={{ padding: '14px' }}>
                <span class="metric-label">Total Washes</span>
                <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary)', marginTop: '4px' }}>
                  {totalWashesCount}
                </div>
              </div>

              <div class="glass-panel" style={{ padding: '14px' }}>
                <span class="metric-label">Revenue Collected</span>
                <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--success)', marginTop: '4px' }}>
                  ₹{totalRevenueAmount}
                </div>
              </div>
            </div>

            {/* Pending Amount Alert Card */}
            <div class="glass-panel" style={{ 
              padding: '12px 16px', 
              background: pendingAmount > 0 ? 'var(--warning-bg)' : 'var(--surface)',
              border: pendingAmount > 0 ? '1px solid var(--warning-border)' : '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={22} color={pendingAmount > 0 ? 'var(--warning)' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Pending Collection
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: pendingAmount > 0 ? '#b45309' : 'var(--text-main)' }}>
                    ₹{pendingAmount}
                  </div>
                </div>
              </div>
              {pendingAmount > 0 && (
                <button 
                  class="btn btn-primary"
                  style={{ minHeight: '36px', padding: '0 12px', fontSize: '12px' }}
                  onClick={() => route('/admin/ledger')}
                >
                  Review
                </button>
              )}
            </div>

            {/* Breakdown by Vehicle */}
            <div class="glass-panel" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.5px' }}>
                Vehicle Breakdown
              </div>
              <div class="grid-2" style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bike size={18} color="var(--accent-orange)" />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bikes</div>
                    <div style={{ fontWeight: '800', fontSize: '16px' }}>{bikeCount}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Car size={18} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cars</div>
                    <div style={{ fontWeight: '800', fontSize: '16px' }}>{carCount}</div>
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${bikePercent}%`, background: 'var(--accent-orange)' }} title={`Bikes: ${bikePercent}%`}></div>
                <div style={{ width: `${carPercent}%`, background: 'var(--primary)' }} title={`Cars: ${carPercent}%`}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '600' }}>
                <span>Bikes ({bikePercent}%)</span>
                <span>Cars ({carPercent}%)</span>
              </div>
            </div>

            {/* Breakdown by Payment Mode */}
            <div class="glass-panel" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.5px' }}>
                Payment Method
              </div>
              <div class="grid-2" style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Banknote size={18} color="#059669" />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cash</div>
                    <div style={{ fontWeight: '800', fontSize: '16px' }}>{cashCount}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={18} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>UPI / QR</div>
                    <div style={{ fontWeight: '800', fontSize: '16px' }}>{upiCount}</div>
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${cashPercent}%`, background: '#059669' }} title={`Cash: ${cashPercent}%`}></div>
                <div style={{ width: `${upiPercent}%`, background: 'var(--primary)' }} title={`UPI: ${upiPercent}%`}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '600' }}>
                <span>Cash ({cashPercent}%)</span>
                <span>UPI ({upiPercent}%)</span>
              </div>
            </div>

            {/* Today's Live Wash Feed - Clean Table View directly on Dashboard */}
            <section class="history-section" style={{ marginTop: '8px' }}>
              <div class="section-header">
                <h3 class="section-title">
                  Live Wash Feed
                  <span class="count-pill">{todayWashes.length}</span>
                </h3>
                <button 
                  class="btn" 
                  style={{ minHeight: '30px', padding: '0 8px', fontSize: '11px', gap: '4px' }}
                  onClick={() => route('/admin/ledger')}
                >
                  <span>All Entries</span>
                  <ChevronRight size={13} />
                </button>
              </div>

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
                      {todayWashes.length === 0 ? (
                        <tr>
                          <td colSpan={5}>
                            <div class="empty-table-state">
                              <div class="empty-state-icon">
                                <Sparkles size={22} />
                              </div>
                              <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>
                                No washes for this date
                              </div>
                              <div style={{ fontSize: '11px' }}>
                                Entries will appear here in real-time as attendants scan vehicles.
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        todayWashes.slice(0, 10).map(wash => (
                          <tr key={wash.id}>
                            {/* Realistic IND Plate Badge */}
                            <td>
                              <div class="plate-badge" style={{ opacity: wash.voided ? 0.6 : 1 }}>
                                <div class="plate-badge-ind">
                                  <span>I</span>
                                  <span>N</span>
                                  <span>D</span>
                                </div>
                                <div class="plate-badge-number" style={{ textDecoration: wash.voided ? 'line-through' : 'none' }}>
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
                              <span class={`amount-text ${wash.status === 'paid' && !wash.voided ? 'paid' : ''}`} style={{ textDecoration: wash.voided ? 'line-through' : 'none' }}>
                                ₹{wash.amount}
                              </span>
                            </td>

                            {/* Status */}
                            <td>
                              <div>
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
          </div>
        )}
      </main>
    </div>
  );
};
