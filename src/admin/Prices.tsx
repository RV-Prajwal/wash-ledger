import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { getServices, updateService } from '../data/services';
import type { Service } from '../data/types';
import { ArrowLeft, Save, Edit2 } from 'lucide-preact';

export const Prices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);

  const loadServices = async () => {
    setLoading(true);
    const data = await getServices(false); // get all including inactive if we want, but activeOnly=false gets all
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
    <div class="container">
      <header class="header" style={{ borderRadius: '16px', margin: '-16px -16px 16px -16px', padding: '16px 24px' }}>
        <div class="flex items-center gap-4">
          <button class="btn" onClick={() => route('/admin')} style={{ minHeight: '40px', padding: '0 12px' }}>
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: '1.25rem' }}>Prices</h2>
        </div>
      </header>

      {loading ? (
        <div class="glass-panel text-center text-muted">Loading...</div>
      ) : (
        <div class="flex-col gap-4">
          {['Bike', 'Car'].map(type => (
            <div key={type}>
              <h3 class="mb-4">{type} Services</h3>
              <div class="flex-col gap-2">
                {services.filter(s => s.vehicleType === type).map(s => (
                  <div key={s.id} class="glass-panel flex items-center justify-between" style={{ padding: '16px' }}>
                    <div>
                      <div class="fw-bold">{s.name}</div>
                      <div class="text-muted" style={{ fontSize: '0.875rem' }}>
                        {s.active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    
                    {editingId === s.id ? (
                      <div class="flex items-center gap-2">
                        <input 
                          type="number" 
                          class="input-glass" 
                          value={editPrice}
                          onChange={(e) => setEditPrice(Number((e.target as HTMLInputElement).value))}
                          style={{ width: '80px', minHeight: '36px', padding: '4px 8px' }}
                        />
                        <button class="btn btn-primary" onClick={() => handleSave(s.id)} style={{ minHeight: '36px', padding: '0 12px' }}>
                          <Save size={16} />
                        </button>
                      </div>
                    ) : (
                      <div class="flex items-center gap-4">
                        <div class="fw-bold" style={{ fontSize: '1.2rem' }}>₹{s.price}</div>
                        <button class="btn" onClick={() => handleEdit(s)} style={{ minHeight: '36px', padding: '0 12px' }}>
                          <Edit2 size={16} />
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
    </div>
  );
};
