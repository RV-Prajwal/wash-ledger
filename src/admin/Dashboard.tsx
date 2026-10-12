import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { getDailyStats } from '../data/stats';
import type { DailyStats } from '../data/types';
import { 
  ArrowLeft, ArrowRight, Home, List, Tag, Users, 
  IndianRupee, TrendingUp, AlertCircle, Car, Bike, CreditCard, Banknote
} from 'lucide-preact';

export const Dashboard = () => {
  const [date, setDate] = useState(new Date());
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to get date string YYYY-MM-DD in IST
  const getISTDateKey = (d: Date) => {
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(d.getTime() + istOffset);
    return istTime.toISOString().split('T')[0];
  };

  const dateKey = getISTDateKey(date);

  useEffect(() => {
    setLoading(true);
    getDailyStats(dateKey).then(data => {
      setStats(data);
      setLoading(false);
    });
  }, [dateKey]);

  const changeDay = (days: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    setDate(newDate);
  };

  const isToday = dateKey === getISTDateKey(new Date());

  const totalVehicles = (stats?.breakdownByVehicle?.Bike || 0) + (stats?.breakdownByVehicle?.Car || 0);
  const bikePercent = totalVehicles > 0 ? Math.round(((stats?.breakdownByVehicle?.Bike || 0) / totalVehicles) * 100) : 0;
  const carPercent = totalVehicles > 0 ? 100 - bikePercent : 0;

  const totalModes = (stats?.breakdownByMode?.Cash || 0) + (stats?.breakdownByMode?.UPI || 0);
  const cashPercent = totalModes > 0 ? Math.round(((stats?.breakdownByMode?.Cash || 0) / totalModes) * 100) : 0;
  const upiPercent = totalModes > 0 ? 100 - cashPercent : 0;

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
              <span class="status-dot"></span> Center Overview
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="app-content safe-bottom-padding">
        {/* Quick Admin Navigation Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <button 
            class="secondary-action-btn" 
            onClick={() => route('/admin/ledger')}
            style={{ flexDirection: 'column', padding: '10px 4px', minHeight: '64px', gap: '4px' }}
          >
            <List size={20} color="var(--primary)" />
            <span style={{ fontSize: '11px', fontWeight: '700' }}>Ledger</span>
          </button>
          <button 
            class="secondary-action-btn" 
            onClick={() => route('/admin/prices')}
            style={{ flexDirection: 'column', padding: '10px 4px', minHeight: '64px', gap: '4px' }}
          >
            <Tag size={20} color="var(--accent-orange)" />
            <span style={{ fontSize: '11px', fontWeight: '700' }}>Prices</span>
          </button>
          <button 
            class="secondary-action-btn" 
            onClick={() => route('/admin/workers')}
            style={{ flexDirection: 'column', padding: '10px 4px', minHeight: '64px', gap: '4px' }}
          >
            <Users size={20} color="#7c3aed" />
            <span style={{ fontSize: '11px', fontWeight: '700' }}>Workers</span>
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
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>
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
            Loading center analytics...
          </div>
        ) : !stats ? (
          <div class="glass-panel text-center text-muted" style={{ padding: '36px 16px' }}>
            No washes recorded for this date.
          </div>
        ) : (
          <div class="flex-col gap-3">
            {/* KPI Cards */}
            <div class="grid-2">
              <div class="glass-panel" style={{ padding: '14px' }}>
                <span class="metric-label">Total Washes</span>
                <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary)', marginTop: '4px' }}>
                  {stats.count || 0}
                </div>
              </div>

              <div class="glass-panel" style={{ padding: '14px' }}>
                <span class="metric-label">Revenue Collected</span>
                <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--success)', marginTop: '4px' }}>
                  ₹{stats.revenue || 0}
                </div>
              </div>
            </div>

            {/* Pending Amount Alert Card */}
            <div class="glass-panel" style={{ 
              padding: '14px 16px', 
              background: stats.pendingAmount ? 'var(--warning-bg)' : 'var(--surface)',
              border: stats.pendingAmount ? '1px solid var(--warning-border)' : '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={22} color={stats.pendingAmount ? 'var(--warning)' : 'var(--text-muted)'} />
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Pending Collection
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: stats.pendingAmount ? '#b45309' : 'var(--text-main)' }}>
                    ₹{stats.pendingAmount || 0}
                  </div>
                </div>
              </div>
              {stats.pendingAmount > 0 && (
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
            <div class="glass-panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px' }}>
                Vehicle Breakdown
              </div>
              <div class="grid-2" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bike size={18} color="var(--accent-orange)" />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bikes</div>
                    <div style={{ fontWeight: '800', fontSize: '16px' }}>{stats.breakdownByVehicle?.Bike || 0}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Car size={18} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cars</div>
                    <div style={{ fontWeight: '800', fontSize: '16px' }}>{stats.breakdownByVehicle?.Car || 0}</div>
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
            <div class="glass-panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px', letterSpacing: '0.5px' }}>
                Payment Method
              </div>
              <div class="grid-2" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Banknote size={18} color="#059669" />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cash</div>
                    <div style={{ fontWeight: '800', fontSize: '16px' }}>{stats.breakdownByMode?.Cash || 0}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={18} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>UPI / QR</div>
                    <div style={{ fontWeight: '800', fontSize: '16px' }}>{stats.breakdownByMode?.UPI || 0}</div>
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
          </div>
        )}
      </main>
    </div>
  );
};
