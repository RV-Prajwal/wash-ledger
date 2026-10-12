import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { route } from 'preact-router';
import { getServices, updateService } from '../data/services';
import type { Service } from '../data/types';
import { 
  ArrowLeft, Save, Edit2, Car, Bike, Check, 
  Tag, Sparkles, CheckCircle2, AlertCircle, Info 
} from 'lucide-preact';
import { getUserFriendlyError } from '../utils/errors';

export const Prices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'all' | 'Bike' | 'Car'>('all');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadServices = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await getServices(false);
      setServices(data);
    } catch (err) {
      setErrorMessage(getUserFriendlyError(err, 'Unable to load service packages. Please check your network connection.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleEdit = (s: Service) => {
    setEditingId(s.id);
    setEditPrice(s.price);
  };

  const handleSave = async (id: string) => {
    setErrorMessage('');
    setSuccessMessage('');

    if (isNaN(editPrice) || editPrice <= 0) {
      setErrorMessage('Please enter a valid price greater than ₹0.');
      return;
    }

    try {
      await updateService(id, { price: Number(editPrice) });
      setEditingId(null);
      await loadServices();
      setSuccessMessage('Price updated successfully.');
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (err) {
      setErrorMessage(getUserFriendlyError(err, 'Failed to update package price. Please try again.'));
    }
  };

  const bikeCount = services.filter(s => s.vehicleType === 'Bike').length;
  const carCount = services.filter(s => s.vehicleType === 'Car').length;

  const filteredServices = useMemo(() => {
    if (activeTab === 'all') return services;
    return services.filter(s => s.vehicleType === activeTab);
  }, [services, activeTab]);

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
            <div class="brand-title">Wash Pricing</div>
            <div class="brand-subtitle">{services.length} active packages</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="app-content safe-bottom-padding">
        {errorMessage && (
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
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
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
            <span>{successMessage}</span>
          </div>
        )}
        {/* Pricing Metrics Strip */}
        <section class="metrics-strip">
          <div class="metric-card">
            <span class="metric-label">All Packages</span>
            <span class="metric-value primary">{services.length}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Bike Services</span>
            <span class="metric-value" style={{ color: 'var(--accent-orange)' }}>{bikeCount}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Car Services</span>
            <span class="metric-value" style={{ color: 'var(--primary)' }}>{carCount}</span>
          </div>
        </section>

        {/* Filter Pills */}
        <div class="filter-tabs">
          <button 
            class={`filter-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Packages ({services.length})
          </button>
          <button 
            class={`filter-tab-btn ${activeTab === 'Bike' ? 'active' : ''}`}
            onClick={() => setActiveTab('Bike')}
          >
            <Bike size={14} /> Bikes ({bikeCount})
          </button>
          <button 
            class={`filter-tab-btn ${activeTab === 'Car' ? 'active' : ''}`}
            onClick={() => setActiveTab('Car')}
          >
            <Car size={14} /> Cars ({carCount})
          </button>
        </div>

        {/* Services List */}
        {loading ? (
          <div class="glass-panel text-center text-muted" style={{ padding: '36px 16px' }}>
            Loading wash rates...
          </div>
        ) : filteredServices.length === 0 ? (
          <div class="glass-panel text-center text-muted" style={{ padding: '36px 16px' }}>
            No packages found.
          </div>
        ) : (
          <div class="flex-col gap-2">
            {filteredServices.map(s => (
              <div key={s.id} class="glass-panel" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: s.vehicleType === 'Car' ? 'var(--primary-light)' : '#fff7ed',
                    color: s.vehicleType === 'Car' ? 'var(--primary)' : 'var(--accent-orange)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {s.vehicleType === 'Car' ? <Car size={20} /> : <Bike size={20} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)', letterSpacing: '-0.2px' }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{s.vehicleType}</span>
                      <span>•</span>
                      {s.active ? (
                        <span style={{ color: 'var(--success)', fontWeight: '700' }}>● Active</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Inactive</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {editingId === s.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', fontSize: '13px', color: 'var(--text-muted)' }}>
                        ₹
                      </span>
                      <input 
                        type="number" 
                        class="input-glass" 
                        value={editPrice}
                        onChange={(e) => setEditPrice(Number((e.target as HTMLInputElement).value))}
                        style={{ width: '84px', minHeight: '38px', padding: '4px 8px 4px 22px', fontSize: '15px', fontWeight: '800' }}
                        autoFocus
                      />
                    </div>
                    <button 
                      class="btn btn-primary" 
                      onClick={() => handleSave(s.id)} 
                      style={{ minHeight: '38px', padding: '0 12px' }}
                      title="Save Rate"
                    >
                      <Save size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontWeight: '900', fontSize: '17px', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
                      ₹{s.price}
                    </div>
                    <button 
                      class="icon-btn" 
                      onClick={() => handleEdit(s)} 
                      style={{ minWidth: '36px', minHeight: '36px' }}
                      title="Edit Price"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pricing Policy Guidance Card */}
        <div class="glass-panel" style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid var(--border)', marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--primary)' }}>
            <Info size={18} />
            <span style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>
              Live Price Synchronization
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Package rates updated here are pushed instantly to all attendant devices and are cached for offline wash logging.
          </div>
        </div>
      </main>
    </div>
  );
};
