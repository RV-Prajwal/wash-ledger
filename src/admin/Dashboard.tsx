import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { getDailyStats } from '../data/stats';
import type { DailyStats } from '../data/types';
import { ArrowLeft, ArrowRight, Home, List, Tag, Users } from 'lucide-preact';

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

  return (
    <div class="container">
      <header class="header" style={{ borderRadius: '16px', margin: '-16px -16px 16px -16px', padding: '16px 24px' }}>
        <div class="flex items-center gap-4">
          <button class="btn" onClick={() => route('/')} style={{ minHeight: '40px', padding: '0 12px' }}>
            <Home size={20} />
          </button>
          <h2 style={{ fontSize: '1.25rem' }}>Dashboard</h2>
        </div>
      </header>

      {/* Admin Navigation */}
      <div class="grid-2 mb-4">
        <button class="btn" onClick={() => route('/admin/ledger')}>
          <List size={20} /> Ledger
        </button>
        <button class="btn" onClick={() => route('/admin/prices')}>
          <Tag size={20} /> Prices
        </button>
      </div>
      <button 
        class="btn mb-4" 
        style={{ width: '100%', background: 'var(--glass-bg)' }}
        onClick={() => route('/admin/workers')}
      >
        <Users size={20} /> Manage Workers
      </button>

      <div class="glass-panel flex items-center justify-between mb-4">
        <button class="btn" onClick={() => changeDay(-1)} style={{ padding: '0 12px', minHeight: '40px' }}><ArrowLeft size={20} /></button>
        <div class="fw-bold" style={{ fontSize: '1.2rem' }}>{date.toDateString()}</div>
        <button class="btn" onClick={() => changeDay(1)} style={{ padding: '0 12px', minHeight: '40px' }} disabled={dateKey === getISTDateKey(new Date())}><ArrowRight size={20} /></button>
      </div>

      {loading ? (
        <div class="glass-panel text-center text-muted">Loading...</div>
      ) : !stats ? (
        <div class="glass-panel text-center text-muted">No data for this day.</div>
      ) : (
        <div class="flex-col gap-4">
          <div class="grid-2">
            <div class="glass-panel text-center">
              <div class="text-muted mb-2">Total Washes</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.count || 0}</div>
            </div>
            <div class="glass-panel text-center">
              <div class="text-muted mb-2">Revenue</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)' }}>₹{stats.revenue || 0}</div>
            </div>
          </div>
          
          <div class="glass-panel">
            <h3 class="mb-4 text-center">Pending Collection</h3>
            <div class="text-center" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>
              ₹{stats.pendingAmount || 0}
            </div>
          </div>

          <div class="grid-2">
            <div class="glass-panel">
              <h4 class="mb-4 text-center text-muted">By Vehicle</h4>
              <div class="flex justify-between mb-2">
                <span>Bikes</span>
                <span class="fw-bold">{stats.breakdownByVehicle?.Bike || 0}</span>
              </div>
              <div class="flex justify-between">
                <span>Cars</span>
                <span class="fw-bold">{stats.breakdownByVehicle?.Car || 0}</span>
              </div>
            </div>

            <div class="glass-panel">
              <h4 class="mb-4 text-center text-muted">By Payment</h4>
              <div class="flex justify-between mb-2">
                <span>Cash</span>
                <span class="fw-bold">{stats.breakdownByMode?.Cash || 0}</span>
              </div>
              <div class="flex justify-between mb-2">
                <span>UPI</span>
                <span class="fw-bold">{stats.breakdownByMode?.UPI || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
