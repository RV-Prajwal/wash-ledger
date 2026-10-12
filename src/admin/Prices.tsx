import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { getServices, updateService } from '../data/services';
import type { Service } from '../data/types';
import { ArrowLeft, Save, Edit2, Car, Bike, Check } from 'lucide-preact';

export const Prices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);

  const loadServices = async () => {
    setLoading(true);
    const data = await getServices(false);
    setServices(data);
    setLoading(false);
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleEdit = (s: Service) => {
    setEditingId(s.id);
    setEditPrice(s.price);
  };

  const handleSave = async (id: string) => {
    try {
      await updateService(id, { price: editPrice });
      setEditingId(null);
      loadServices();
    } catch (err) {
      alert('Failed to update price');
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
            <div class="brand-title">Wash Pricing</div>
            <div class="brand-subtitle">Configure package rates</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main class="app-content safe-bottom-padding">
        {loading ? (
          <div class="glass-panel text-center text-muted" style={{ padding: '36px 16px' }}>
            Loading wash rates...
          </div>
        ) : (
          <div class="flex-col gap-4">
            {(['Bike', 'Car'] as const).map(type => (
              <div key={type} class="flex-col gap-2">
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  fontSize: '13px', 
                  fontWeight: '800', 
                  textTransform: 'uppercase', 
                  color: 'var(--text-muted)', 
                  letterSpacing: '0.5px',
                  paddingLeft: '4px'
                }}>
                  {type === 'Bike' ? (
                    <Bike size={18} color="var(--accent-orange)" />
                  ) : (
                    <Car size={18} color="var(--primary)" />
                  )}
                  <span>{type} Packages</span>
                </div>

                <div class="flex-col gap-2">
                  {services.filter(s => s.vehicleType === type).map(s => (
                    <div key={s.id} class="glass-panel" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)' }}>
                          {s.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {s.active ? (
                            <span style={{ color: 'var(--success)', fontWeight: '700' }}>● Active</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Inactive</span>
                          )}
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
                              style={{ width: '88px', minHeight: '38px', padding: '4px 8px 4px 22px', fontSize: '15px', fontWeight: '800' }}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ fontWeight: '900', fontSize: '16px', color: 'var(--text-main)' }}>
                            ₹{s.price}
                          </div>
                          <button 
                            class="icon-btn" 
                            onClick={() => handleEdit(s)} 
                            style={{ minWidth: '34px', minHeight: '34px' }}
                            title="Edit Price"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
