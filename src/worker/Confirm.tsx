import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { getServices } from '../data/services';
import { saveWash, checkRecentDuplicate } from '../data/washes';
import type { Service, Wash, PaymentMode, WashStatus } from '../data/types';
import { useAuth } from '../auth/AuthGuard';
import { ArrowLeft, Save, AlertTriangle, AlertCircle, Car, Bike, Check, Clock, IndianRupee } from 'lucide-preact';
import { getUserFriendlyError } from '../utils/errors';

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
  const [errorMessage, setErrorMessage] = useState('');
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
      setWarning('Low scan confidence. Please verify the plate characters carefully.');
    }
  }, []);

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
    return p.toUpperCase().replace(/[^A-Z0-9]/g, '');
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (!user) return;
    
    const formattedPlate = validatePlate(plate);
    if (formattedPlate.length < 4) {
      setErrorMessage('Please enter a valid license plate number (minimum 4 characters).');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    
    try {
      if (!warning || lowConfidence) {
        try {
          const isDuplicate = await checkRecentDuplicate(formattedPlate, user.uid);
          if (isDuplicate) {
            setWarning('This plate was recorded within the last 15 minutes. Tap "Save Wash" again if you wish to record another wash.');
            setLowConfidence(false);
            setLoading(false);
            return;
          }
        } catch (dupErr) {
          console.warn('Duplicate check skipped due to offline mode:', dupErr);
        }
      }

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

      if ('vibrate' in navigator) navigator.vibrate(200);
      route('/', true);
    } catch (err: any) {
      setErrorMessage(getUserFriendlyError(err, 'Failed to save wash entry. Please try again.'));
      setLoading(false);
    }
  };

  return (
    <div class="app-shell">
      {/* Mobile Top Header */}
      <header class="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            class="icon-btn" 
            onClick={() => route('/')}
            title="Back to Home"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div class="brand-title">Record Wash</div>
            <div class="brand-subtitle">Verify details & confirm entry</div>
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
            gap: '10px'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>{errorMessage}</div>
          </div>
        )}

        {warning && (
          <div style={{
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning-border)',
            color: '#b45309',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <div>{warning}</div>
          </div>
        )}

        <form onSubmit={handleSave} class="flex-col gap-4">
          {/* License Plate Display / Input with realistic IND badge framing */}
          <div class="glass-panel" style={{ padding: '16px' }}>
            <label class="text-muted fw-bold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
              License Plate Number
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: lowConfidence ? '2px solid var(--danger)' : '2px solid #0f172a',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              background: '#ffffff',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                background: '#0256d0',
                color: '#ffffff',
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '10px',
                letterSpacing: '-0.5px',
                userSelect: 'none'
              }}>
                <span>I</span>
                <span>N</span>
                <span>D</span>
              </div>
              <input 
                type="text" 
                value={plate}
                onInput={(e) => {
                  setPlate(validatePlate((e.target as HTMLInputElement).value));
                  setWarning('');
                  setLowConfidence(false);
                }}
                placeholder="KA01AB1234"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  padding: '12px 16px',
                  fontSize: '22px',
                  fontWeight: '800',
                  fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  color: lowConfidence ? 'var(--danger)' : '#0f172a'
                }}
                required
              />
            </div>
            {lowConfidence && (
              <p style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '6px', textAlign: 'center' }}>
                Please edit any misread characters before saving.
              </p>
            )}
          </div>

          {/* Vehicle Type Selection */}
          <div>
            <label class="text-muted fw-bold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
              Vehicle Type
            </label>
            <div class="grid-2">
              <button 
                type="button" 
                class={`btn ${vehicleType === 'Bike' ? 'btn-primary' : ''}`}
                style={{ minHeight: '52px', fontSize: '15px' }}
                onClick={() => setVehicleType('Bike')}
              >
                <Bike size={20} />
                <span>Bike / Two-Wheeler</span>
              </button>
              <button 
                type="button" 
                class={`btn ${vehicleType === 'Car' ? 'btn-primary' : ''}`}
                style={{ minHeight: '52px', fontSize: '15px' }}
                onClick={() => setVehicleType('Car')}
              >
                <Car size={20} />
                <span>Car / 4-Wheeler</span>
              </button>
            </div>
          </div>

          {/* Service & Price */}
          <div class="glass-panel flex-col gap-4">
            <div>
              <label class="text-muted fw-bold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                Wash Package
              </label>
              <select 
                class="input-glass" 
                value={selectedServiceId} 
                onChange={handleServiceChange} 
                required
                style={{ fontWeight: '600' }}
              >
                {filteredServices.map(s => (
                  <option key={s.id} value={s.id}>{s.name} — ₹{s.price}</option>
                ))}
              </select>
            </div>

            <div>
              <label class="text-muted fw-bold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }}>
                Charge Amount (₹)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: 'var(--text-muted)', fontSize: '16px' }}>
                  ₹
                </span>
                <input 
                  type="number" 
                  class="input-glass" 
                  style={{ paddingLeft: '34px', fontSize: '18px', fontWeight: '800' }}
                  value={price}
                  onInput={(e) => setPrice(Number((e.target as HTMLInputElement).value))}
                  required
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <label class="text-muted fw-bold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
              Payment Method
            </label>
            <div class="grid-2">
              <button 
                type="button" 
                class={`btn ${paymentMode === 'Cash' ? 'btn-primary' : ''}`}
                style={{ minHeight: '48px' }}
                onClick={() => setPaymentMode('Cash')}
              >
                <span>Cash Payment</span>
              </button>
              <button 
                type="button" 
                class={`btn ${paymentMode === 'UPI' ? 'btn-primary' : ''}`}
                style={{ minHeight: '48px' }}
                onClick={() => setPaymentMode('UPI')}
              >
                <span>UPI / QR</span>
              </button>
            </div>
          </div>

          {/* Payment Status */}
          <div class="glass-panel flex items-center justify-between" style={{ padding: '14px 16px' }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '14px' }}>Payment Collected?</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status of the wash payment</div>
            </div>
            <div class="flex gap-2">
              <button 
                type="button" 
                class={`btn ${status === 'paid' ? 'btn-primary' : ''}`}
                style={{ padding: '8px 16px', minHeight: '40px', fontSize: '13px' }}
                onClick={() => setStatus('paid')}
              >
                <Check size={16} /> Paid
              </button>
              <button 
                type="button" 
                class={`btn ${status === 'pending' ? 'btn-primary' : ''}`}
                style={{ 
                  padding: '8px 16px', 
                  minHeight: '40px', 
                  fontSize: '13px',
                  background: status === 'pending' ? 'var(--warning)' : 'var(--surface)',
                  color: status === 'pending' ? '#ffffff' : 'var(--text-main)',
                  borderColor: status === 'pending' ? 'var(--warning)' : 'var(--border)'
                }}
                onClick={() => setStatus('pending')}
              >
                <Clock size={16} /> Pending
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <button 
            type="submit" 
            class="scan-cta-btn" 
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            <Save size={22} />
            <span style={{ fontSize: '17px', fontWeight: '800' }}>
              {loading ? 'Saving Wash...' : 'Save & Complete Wash'}
            </span>
          </button>
        </form>
      </main>
    </div>
  );
};
