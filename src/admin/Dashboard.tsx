import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { route } from 'preact-router';
import { 
  getPeriodStats, stepDateForPeriod, isPeriodCurrentOrFuture 
} from '../data/stats';
import { getUserFriendlyError } from '../utils/errors';
import type { DailyStats, StatsPeriod, PeriodStatsResult, Wash } from '../data/types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ArrowLeft, ArrowRight, Home, List, Tag, Users, 
  AlertCircle, Car, Bike, CreditCard, Banknote, 
  Sparkles, CheckCircle2, Clock, ChevronRight, 
  Calendar, RotateCcw, TrendingUp
} from 'lucide-preact';
import heroImg from '../assets/wash-hero.jpg';

export const Dashboard = () => {
  const [period, setPeriod] = useState<StatsPeriod>('day');
  const [date, setDate] = useState<Date>(new Date());
  const [statsData, setStatsData] = useState<PeriodStatsResult | null>(null);
  const [todayWashes, setTodayWashes] = useState<Wash[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Helper to get date string YYYY-MM-DD in IST
  const getISTDateKey = (d: Date) => {
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(d.getTime() + istOffset);
    return istTime.toISOString().split('T')[0];
  };

  const currentDateKey = getISTDateKey(date);
  const isCurrentPeriod = isPeriodCurrentOrFuture(date, period);

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      // 1. Fetch period statistics (includes fallback to washes collection for breakdowns)
      const res = await getPeriodStats(period, date);
      setStatsData(res);

      // 2. If viewing single day, fetch individual wash records for live feed & audit
      if (period === 'day') {
        const q = query(
          collection(db, 'washes'),
          where('dateKey', '==', res.startDateKey)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Wash));
        list.sort((a, b) => new Date(b.deviceTime).getTime() - new Date(a.deviceTime).getTime());
        setTodayWashes(list);
      } else {
        setTodayWashes([]);
      }
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      setLoadError(getUserFriendlyError(err, 'Unable to load operations data. Please check your connection.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period, date]);

  const handleStep = (delta: number) => {
    const nextDate = stepDateForPeriod(date, period, delta);
    setDate(nextDate);
  };

  const handleResetToCurrent = () => {
    setDate(new Date());
  };

  const handleJumpToDay = (dateKey: string) => {
    const parts = dateKey.split('-');
    if (parts.length === 3) {
      const targetDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      setDate(targetDate);
      setPeriod('day');
    }
  };

  // Accurate calculations with fallback to today's washes if stats doc was empty
  const totalWashesCount = useMemo(() => {
    if (period === 'day' && todayWashes.length > 0 && (!statsData || statsData.count === 0)) {
      return todayWashes.length;
    }
    return statsData?.count ?? 0;
  }, [statsData, todayWashes, period]);

  const totalRevenueAmount = useMemo(() => {
    if (period === 'day' && todayWashes.length > 0 && (!statsData || statsData.revenue === 0)) {
      return todayWashes.reduce((sum, w) => w.status === 'paid' && !w.voided ? sum + w.amount : sum, 0);
    }
    return statsData?.revenue ?? 0;
  }, [statsData, todayWashes, period]);

  const pendingAmount = useMemo(() => {
    if (period === 'day' && todayWashes.length > 0 && (!statsData || statsData.pendingAmount === 0)) {
      return todayWashes.reduce((sum, w) => w.status === 'pending' && !w.voided ? sum + w.amount : sum, 0);
    }
    return statsData?.pendingAmount ?? 0;
  }, [statsData, todayWashes, period]);

  const bikeCount = useMemo(() => {
    if (period === 'day' && todayWashes.length > 0 && (!statsData || (statsData.breakdownByVehicle.Bike === 0 && statsData.breakdownByVehicle.Car === 0))) {
      return todayWashes.filter(w => w.vehicleType === 'Bike').length;
    }
    return statsData?.breakdownByVehicle?.Bike ?? 0;
  }, [statsData, todayWashes, period]);

  const carCount = useMemo(() => {
    if (period === 'day' && todayWashes.length > 0 && (!statsData || (statsData.breakdownByVehicle.Bike === 0 && statsData.breakdownByVehicle.Car === 0))) {
      return todayWashes.filter(w => w.vehicleType === 'Car').length;
    }
    return statsData?.breakdownByVehicle?.Car ?? 0;
  }, [statsData, todayWashes, period]);

  const totalVehicles = bikeCount + carCount;
  const bikePercent = totalVehicles > 0 ? Math.round((bikeCount / totalVehicles) * 100) : 0;
  const carPercent = totalVehicles > 0 ? 100 - bikePercent : 0;

  const cashCount = useMemo(() => {
    if (period === 'day' && todayWashes.length > 0 && (!statsData || (statsData.breakdownByMode.Cash === 0 && statsData.breakdownByMode.UPI === 0))) {
      return todayWashes.filter(w => w.paymentMode === 'Cash').length;
    }
    return statsData?.breakdownByMode?.Cash ?? 0;
  }, [statsData, todayWashes, period]);

  const upiCount = useMemo(() => {
    if (period === 'day' && todayWashes.length > 0 && (!statsData || (statsData.breakdownByMode.Cash === 0 && statsData.breakdownByMode.UPI === 0))) {
      return todayWashes.filter(w => w.paymentMode === 'UPI').length;
    }
    return statsData?.breakdownByMode?.UPI ?? 0;
  }, [statsData, todayWashes, period]);

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

  const periodTitleMap: Record<StatsPeriod, string> = {
    day: 'Daily Operations',
    month: 'Monthly Performance',
    quarter: 'Quarterly Financials',
    year: 'Annual Overview'
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
            <span class="hero-pill">{periodTitleMap[period]}</span>
            <div class="hero-text-content">
              <h2 class="hero-headline" style={{ fontSize: '17px' }}>
                {period === 'day' ? 'Daily Wash Ledger' : `${period.charAt(0).toUpperCase() + period.slice(1)} Revenue & Analytics`}
              </h2>
              <p class="hero-tagline">Real-time revenue, volume breakdown & audits</p>
            </div>
          </div>
        </section>

        {/* Quick Admin Navigation Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
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

        {/* Period Selector & Date Navigator Card */}
        <div class="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Segmented Period Tabs */}
          <div class="period-segmented-control">
            <button 
              class={`period-segment-btn ${period === 'day' ? 'active' : ''}`}
              onClick={() => setPeriod('day')}
            >
              Day
            </button>
            <button 
              class={`period-segment-btn ${period === 'month' ? 'active' : ''}`}
              onClick={() => setPeriod('month')}
            >
              Month
            </button>
            <button 
              class={`period-segment-btn ${period === 'quarter' ? 'active' : ''}`}
              onClick={() => setPeriod('quarter')}
            >
              Quarter
            </button>
            <button 
              class={`period-segment-btn ${period === 'year' ? 'active' : ''}`}
              onClick={() => setPeriod('year')}
            >
              Year
            </button>
          </div>

          {/* Date / Period Navigator Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '2px' }}>
            <button 
              class="icon-btn" 
              onClick={() => handleStep(-1)} 
              style={{ minWidth: '38px', minHeight: '38px' }}
              title={`Previous ${period}`}
            >
              <ArrowLeft size={18} />
            </button>
            
            <div style={{ textAlign: 'center', flex: 1, padding: '0 8px' }}>
              <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)', letterSpacing: '-0.2px' }}>
                {statsData?.label || 'Loading...'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>
                {statsData?.subLabel}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {!isCurrentPeriod && (
                <button 
                  class="icon-btn" 
                  onClick={handleResetToCurrent}
                  style={{ minWidth: '34px', minHeight: '34px', color: 'var(--primary)' }}
                  title="Reset to Current Date"
                >
                  <RotateCcw size={15} />
                </button>
              )}

              <button 
                class="icon-btn" 
                onClick={() => handleStep(1)} 
                style={{ minWidth: '38px', minHeight: '38px' }}
                disabled={isCurrentPeriod}
                title={`Next ${period}`}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {loadError && (
          <div class="glass-panel" style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '13px' }}>{loadError}</span>
            </div>
            <button 
              class="btn btn-primary" 
              style={{ minHeight: '32px', padding: '0 10px', fontSize: '11px', whiteSpace: 'nowrap' }} 
              onClick={loadData}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div class="glass-panel text-center text-muted" style={{ padding: '36px 16px' }}>
            Loading {period} operations & revenue...
          </div>
        ) : (
          <div class="dashboard-stack">
            {/* Primary KPI Cards */}
            <div class="grid-2">
              <div class="glass-panel" style={{ padding: '16px' }}>
                <span class="metric-label">
                  {period === 'day' ? 'Total Washes' : `${period.toUpperCase()} Washes`}
                </span>
                <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary)', marginTop: '4px', lineHeight: 1.1 }}>
                  {totalWashesCount}
                </div>
                {period !== 'day' && statsData && statsData.activeDaysCount > 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '6px' }}>
                    Avg. {statsData.avgDailyWashes} / active day
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '6px' }}>
                    {period === 'day' ? 'Logged today' : 'No washes recorded'}
                  </div>
                )}
              </div>

              <div class="glass-panel" style={{ padding: '16px' }}>
                <span class="metric-label">
                  {period === 'day' ? 'Revenue Collected' : `${period.toUpperCase()} Revenue`}
                </span>
                <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--success)', marginTop: '4px', lineHeight: 1.1 }}>
                  ₹{totalRevenueAmount.toLocaleString('en-IN')}
                </div>
                {period !== 'day' && statsData && statsData.activeDaysCount > 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '6px' }}>
                    Avg. ₹{statsData.avgDailyRevenue.toLocaleString('en-IN')} / day
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '6px' }}>
                    {period === 'day' ? 'Net collected today' : 'No collections'}
                  </div>
                )}
              </div>
            </div>

            {/* Secondary Metrics: Active Days & Pending Collection in balanced 2-column layout */}
            {period !== 'day' ? (
              <div class="grid-2">
                <div class="metric-card-secondary">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={15} color="var(--primary)" />
                    <span class="metric-label">Active Days</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>
                    {statsData?.activeDaysCount ?? 0} <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>days</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>
                    With logged washes
                  </div>
                </div>

                <div 
                  class="metric-card-secondary" 
                  style={{ 
                    background: pendingAmount > 0 ? 'var(--warning-bg)' : 'var(--surface)',
                    borderColor: pendingAmount > 0 ? 'var(--warning-border)' : 'var(--border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={15} color={pendingAmount > 0 ? 'var(--warning)' : 'var(--text-muted)'} />
                      <span class="metric-label" style={{ color: pendingAmount > 0 ? '#b45309' : undefined }}>Pending</span>
                    </div>
                    {pendingAmount > 0 && (
                      <button 
                        class="btn btn-primary"
                        style={{ minHeight: '22px', padding: '0 8px', fontSize: '10px', borderRadius: '4px' }}
                        onClick={() => route('/admin/ledger')}
                      >
                        Review
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: pendingAmount > 0 ? '#b45309' : 'var(--text-main)', marginTop: '4px' }}>
                    ₹{pendingAmount.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '10px', color: pendingAmount > 0 ? '#b45309' : 'var(--text-muted)', fontWeight: '600', marginTop: '2px' }}>
                    {pendingAmount > 0 ? 'Uncollected washes' : 'All clear'}
                  </div>
                </div>
              </div>
            ) : (
              /* Single Day Pending Collection Card */
              pendingAmount > 0 && (
                <div class="glass-panel" style={{ 
                  padding: '12px 16px', 
                  background: 'var(--warning-bg)',
                  border: '1px solid var(--warning-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle size={22} color="var(--warning)" />
                    <div>
                      <div class="metric-label" style={{ color: '#b45309' }}>
                        Pending Collection
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#b45309' }}>
                        ₹{pendingAmount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                  <button 
                    class="btn btn-primary"
                    style={{ minHeight: '34px', padding: '0 12px', fontSize: '12px' }}
                    onClick={() => route('/admin/ledger')}
                  >
                    Review
                  </button>
                </div>
              )
            )}

            {/* Breakdown by Vehicle */}
            <div class="glass-panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px' }}>
                Vehicle Breakdown
              </div>
              <div class="grid-2" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(249, 115, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bike size={20} color="var(--accent-orange)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Bikes</div>
                    <div style={{ fontWeight: '800', fontSize: '18px', color: 'var(--text-main)' }}>{bikeCount}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(2, 86, 208, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Car size={20} color="var(--primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Cars</div>
                    <div style={{ fontWeight: '800', fontSize: '18px', color: 'var(--text-main)' }}>{carCount}</div>
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ width: '100%', height: '8px', background: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${bikePercent}%`, background: 'var(--accent-orange)' }} title={`Bikes: ${bikePercent}%`}></div>
                <div style={{ width: `${carPercent}%`, background: 'var(--primary)' }} title={`Cars: ${carPercent}%`}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: '600' }}>
                <span>Bikes ({bikePercent}%)</span>
                <span>Cars ({carPercent}%)</span>
              </div>
            </div>

            {/* Breakdown by Payment Mode */}
            <div class="glass-panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px' }}>
                Payment Method
              </div>
              <div class="grid-2" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(5, 150, 105, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Banknote size={20} color="#059669" />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Cash</div>
                    <div style={{ fontWeight: '800', fontSize: '18px', color: 'var(--text-main)' }}>{cashCount}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(2, 86, 208, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={20} color="var(--primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>UPI / QR</div>
                    <div style={{ fontWeight: '800', fontSize: '18px', color: 'var(--text-main)' }}>{upiCount}</div>
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ width: '100%', height: '8px', background: 'var(--border-light)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${cashPercent}%`, background: '#059669' }} title={`Cash: ${cashPercent}%`}></div>
                <div style={{ width: `${upiPercent}%`, background: 'var(--primary)' }} title={`UPI: ${upiPercent}%`}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: '600' }}>
                <span>Cash ({cashPercent}%)</span>
                <span>UPI ({upiPercent}%)</span>
              </div>
            </div>

            {/* PERIOD FEED SECTION: Live Feed (Day) or Daily Performance (Month/Quarter/Year) */}
            {period === 'day' ? (
              /* Single Day: Live Wash Feed */
              <section class="history-section">
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
            ) : (
              /* Month / Quarter / Year: Daily Performance Breakdown Table */
              <section class="history-section">
                <div class="section-header">
                  <h3 class="section-title">
                    Daily Revenue Breakdown
                    <span class="count-pill">{statsData?.dailyPoints.length ?? 0} days</span>
                  </h3>
                  <button 
                    class="btn" 
                    style={{ minHeight: '30px', padding: '0 8px', fontSize: '11px', gap: '4px' }}
                    onClick={() => route('/admin/ledger')}
                  >
                    <span>Full Ledger</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                <div class="table-card">
                  <div class="table-wrapper">
                    <table class="wash-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Washes</th>
                          <th>Vehicle Mix</th>
                          <th>Revenue</th>
                          <th style={{ textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!statsData || statsData.dailyPoints.length === 0) ? (
                          <tr>
                            <td colSpan={5}>
                              <div class="empty-table-state">
                                <div class="empty-state-icon">
                                  <Calendar size={22} />
                                </div>
                                <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>
                                  No activity recorded in this {period}
                                </div>
                                <div style={{ fontSize: '11px' }}>
                                  Aggregated performance will populate here as daily washes are completed.
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          statsData.dailyPoints.map(point => (
                            <tr 
                              key={point.dateKey} 
                              class="period-day-row"
                              onClick={() => handleJumpToDay(point.dateKey)}
                              title="Click to view full details for this day"
                            >
                              {/* Date */}
                              <td>
                                <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '13px' }}>
                                  {point.formattedDate}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                  {point.dateKey}
                                </div>
                              </td>

                              {/* Washes */}
                              <td>
                                <span class="count-pill" style={{ fontSize: '12px', padding: '3px 8px' }}>
                                  {point.count}
                                </span>
                              </td>

                              {/* Vehicle Mix */}
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700' }}>
                                  <span style={{ color: 'var(--accent-orange)' }}>
                                    {point.bikeCount} 🏍️
                                  </span>
                                  <span style={{ color: 'var(--primary)' }}>
                                    {point.carCount} 🚗
                                  </span>
                                </div>
                              </td>

                              {/* Revenue */}
                              <td>
                                <div style={{ fontWeight: '800', fontSize: '14px', color: '#059669' }}>
                                  ₹{point.revenue.toLocaleString('en-IN')}
                                </div>
                                {point.pendingAmount > 0 && (
                                  <div style={{ fontSize: '10px', color: '#b45309', fontWeight: '600' }}>
                                    +₹{point.pendingAmount} pend.
                                  </div>
                                )}
                              </td>

                              {/* Action: Jump to Day */}
                              <td style={{ textAlign: 'right' }}>
                                <button 
                                  class="btn" 
                                  style={{ minHeight: '28px', padding: '0 8px', fontSize: '11px', gap: '2px', color: 'var(--primary)' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleJumpToDay(point.dateKey);
                                  }}
                                >
                                  <span>View</span>
                                  <ChevronRight size={12} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
