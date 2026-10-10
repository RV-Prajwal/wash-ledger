import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { getServices } from '../data/services';
import { saveWash, checkRecentDuplicate } from '../data/washes';
import type { Service, Wash, PaymentMode, WashStatus } from '../data/types';
import { useAuth } from '../auth/AuthGuard';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-preact';

export const Confirm = () => {
  const { user } = useAuth();
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState<'Bike' | 'Car'>('Bike');
  const [services, setServices] = useState<Service[]>([]);
  
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [price, setPrice] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [status, setStatus] = useState<WashStatus>('paid');
  
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState('');
  
  const [lowConfidence, setLowConfidence] = useState(false);
  
  useEffect(() => {
    getServices().then(data => setServices(data));
    
    const searchParams = new URLSearchParams(window.location.search);
    const initialPlate = searchParams.get('plate');
    const isLowConfidence = searchParams.get('lowConfidence') === 'true';
    
    if (initialPlate) {
      setPlate(validatePlate(initialPlate));
    }
    if (isLowConfidence) {
      setLowConfidence(true);
      setWarning('Check the plate number. Model confidence was low.');
    }
  }, []);

  // Update available services and price when vehicle type changes
  const filteredServices = services.filter(s => s.vehicleType === vehicleType);
  
  useEffect(() => {
    if (filteredServices.length > 0 && !filteredServices.find(s => s.id === selectedServiceId)) {
      setSelectedServiceId(filteredServices[0].id);
      setPrice(filteredServices[0].price);
    }
  }, [vehicleType, filteredServices, selectedServiceId]);

  const handleServiceChange = (e: Event) => {
    const id = (e.target as HTMLSelectElement).value;
    setSelectedServiceId(id);
    const service = services.find(s => s.id === id);
    if (service) setPrice(service.price);
  };

  const validatePlate = (p: string) => {
    // Basic formatting: uppercase, no spaces
    return p.toUpperCase().replace(/[^A-Z0-9]/g, '');
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (!user) return;
    
    const formattedPlate = validatePlate(plate);
    if (formattedPlate.length < 4) {
      alert('Please enter a valid plate number.');
      return;
    }

    setLoading(true);
    
    // Check duplicate warning (ignore low confidence warning for this check)
    if (!warning || lowConfidence) {
      const isDuplicate = await checkRecentDuplicate(formattedPlate, user.uid);
      if (isDuplicate) {
        setWarning('This plate was recorded recently. Save again to confirm.');
        setLowConfidence(false); // Switch to duplicate warning
        setLoading(false);
        return;
      }
    }

    try {
      const service = services.find(s => s.id === selectedServiceId);
      if (!service) throw new Error('No service selected');

      await saveWash({
        plate: formattedPlate,
        vehicleType,
        serviceId: service.id,
        serviceName: service.name,
        amount: price,
        paymentMode,
        status,
      }, user.uid);

      // Vibrate on success
      if ('vibrate' in navigator) navigator.vibrate(200);
      
      route('/', true);
    } catch (err: any) {
      alert('Error saving wash: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div class="container">
      <header class="flex items-center gap-4 mb-4">
        <button class="btn" onClick={() => route('/')} style={{ minHeight: '48px', padding: '0 12px' }}>
          <ArrowLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.5rem' }}>Record Wash</h2>
      </header>

      {warning && (
        <div class="glass-panel mb-4 flex items-center gap-2" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
          <AlertTriangle size={24} />
          <div>{warning}</div>
        </div>
      )}

      <form onSubmit={handleSave} class="flex-col gap-4">
        <div class="glass-panel" style={lowConfidence ? { borderColor: 'var(--danger)' } : {}}>
          <label class="text-muted fw-bold mb-4" style={{ display: 'block' }}>Vehicle Plate</label>
          <input 
            type="text" 
            class="input-glass" 
            value={plate}
            onInput={(e) => {
              setPlate(validatePlate((e.target as HTMLInputElement).value));
              setWarning('');
              setLowConfidence(false);
            }}
            placeholder="KA01AB1234"
            style={{ fontSize: '1.5rem', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '2px', color: lowConfidence ? 'var(--danger)' : 'inherit' }}
            required
          />
        </div>

        <div class="grid-2">
          <button 
            type="button" 
            class={`btn ${vehicleType === 'Bike' ? 'btn-primary' : ''}`}
            onClick={() => setVehicleType('Bike')}
          >
            Bike
          </button>
          <button 
            type="button" 
            class={`btn ${vehicleType === 'Car' ? 'btn-primary' : ''}`}
            onClick={() => setVehicleType('Car')}
          >
            Car
          </button>
        </div>

        <div class="glass-panel flex-col gap-4">
          <div>
            <label class="text-muted fw-bold mb-4" style={{ display: 'block' }}>Service Type</label>
            <select class="input-glass" value={selectedServiceId} onChange={handleServiceChange} required>
              {filteredServices.map(s => (
                <option key={s.id} value={s.id}>{s.name} - ₹{s.price}</option>
              ))}
            </select>
          </div>

          <div>
            <label class="text-muted fw-bold mb-4" style={{ display: 'block' }}>Amount (₹)</label>
            <input 
              type="number" 
              class="input-glass" 
              value={price}
              onInput={(e) => setPrice(Number((e.target as HTMLInputElement).value))}
              required
              min="0"
            />
          </div>
        </div>

        <div class="grid-2">
          <button 
            type="button" 
            class={`btn ${paymentMode === 'Cash' ? 'btn-primary' : ''}`}
            onClick={() => setPaymentMode('Cash')}
          >
            Cash
          </button>
          <button 
            type="button" 
            class={`btn ${paymentMode === 'UPI' ? 'btn-primary' : ''}`}
            onClick={() => setPaymentMode('UPI')}
          >
            UPI
          </button>
        </div>

        <div class="glass-panel flex items-center justify-between" style={{ padding: '16px' }}>
          <span class="fw-bold">Payment Status</span>
          <div class="flex gap-2">
            <button 
              type="button" 
              class={`btn ${status === 'paid' ? 'btn-primary' : ''}`}
              style={{ padding: '8px 16px', minHeight: '36px' }}
              onClick={() => setStatus('paid')}
            >
              Paid
            </button>
            <button 
              type="button" 
              class={`btn ${status === 'pending' ? 'btn-primary' : ''}`}
              style={{ padding: '8px 16px', minHeight: '36px', background: status === 'pending' ? 'var(--danger)' : 'var(--glass-bg)', color: status === 'pending' ? 'white' : 'var(--text-main)' }}
              onClick={() => setStatus('pending')}
            >
              Pending
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          class="btn btn-primary btn-large mt-4" 
          disabled={loading}
          style={{ width: '100%', borderRadius: '24px' }}
        >
          <Save size={24} />
          {loading ? 'Saving...' : 'Save Wash'}
        </button>
      </form>
    </div>
  );
};
