import { h } from 'preact';
import { useState } from 'preact/hooks';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { route } from 'preact-router';
import { LogIn, AlertCircle, Mail, Lock, Zap, Wifi, HelpCircle } from 'lucide-preact';
import loginHeroImg from '../assets/login-hero.jpg';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      route('/', true);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="app-shell" style={{ backgroundColor: '#ffffff', minHeight: '100dvh' }}>
      {/* Top Hero Banner matching the user's reference mockup */}
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden', background: '#0f172a' }}>
        <img 
          src={loginHeroImg} 
          alt="CEAT Vehicle Wash & Care" 
          style={{ width: '100%', height: '340px', objectFit: 'cover', objectPosition: 'center 40%', display: 'block' }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, #ffffff 0%, rgba(255,255,255,0.02) 45%, rgba(15,23,42,0.2) 75%, rgba(15,23,42,0.65) 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 'max(20px, var(--safe-top)) 16px 16px 16px'
        }}>
          {/* Top Tag Badge */}
          <div style={{
            alignSelf: 'center',
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            padding: '7px 20px',
            borderRadius: '24px',
            fontSize: '12px',
            fontWeight: '800',
            letterSpacing: '0.5px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⏱ At Your Time</span>
            <span>•</span>
            <span>At Your Place 📍</span>
          </div>

          <div></div>
        </div>
      </div>

      {/* Main Login Form Container */}
      <div style={{ 
        flex: 1, 
        padding: '20px 22px calc(24px + var(--safe-bottom)) 22px', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1, 
          justifyContent: 'center',
          paddingTop: '8px'
        }}>
          {/* Title and Tagline */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px', lineHeight: '1.2' }}>
              India’s #1
            </h1>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px', marginTop: '4px' }}>
              Car & Bike Care App
            </h2>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              margin: '20px 0 14px 0',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              <span>Log in to Wash Ledger</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} class="flex-col" style={{ gap: '16px', marginTop: '6px' }}>
            {/* Email Field with Icon */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  class="input-glass" 
                  placeholder="name@wash.ceat.in"
                  value={email}
                  onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                  style={{ paddingLeft: '46px', minHeight: '52px', fontSize: '15px' }}
                  required
                />
              </div>
            </div>

            {/* Password Field with Icon */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  class="input-glass" 
                  placeholder="••••••••"
                  value={password}
                  onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                  style={{ paddingLeft: '46px', minHeight: '52px', fontSize: '15px' }}
                  required
                />
              </div>
            </div>

            {/* Solid High-Contrast Sign In Button */}
            <button 
              type="submit" 
              disabled={loading}
              style={{
                width: '100%',
                minHeight: '54px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontWeight: '800',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                marginTop: '10px',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                transition: 'transform 0.15s ease'
              }}
            >
              <LogIn size={20} />
              <span>{loading ? 'Authenticating...' : 'Login / Sign In'}</span>
            </button>
          </form>

          {/* Informative Highlights & Center Support Section */}
          <div style={{ marginTop: '28px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '10px',
              marginBottom: '14px' 
            }}>
              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
                  <Zap size={16} />
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>AI Scanning</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  Instant plate recognition via on-device camera
                </div>
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)' }}>
                  <Wifi size={16} />
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>Offline Ready</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  Log washes offline; auto-syncs when reconnected
                </div>
              </div>
            </div>

            {/* Assistance note */}
            <div style={{
              background: 'var(--primary-light)',
              border: '1px solid rgba(2, 86, 208, 0.15)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <HelpCircle size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: '#0f172a', lineHeight: '1.35' }}>
                <span style={{ fontWeight: '700' }}>Center Staff Access:</span> For account credentials or password assistance, please contact your Center Supervisor.
              </div>
            </div>
          </div>
        </div>

        {/* Footer legal disclaimer */}
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-subtle)', marginTop: '24px', lineHeight: '1.4' }}>
          By proceeding you agree to the <br />
          <strong style={{ color: 'var(--text-muted)' }}>Terms & Conditions</strong> and <strong style={{ color: 'var(--text-muted)' }}>Privacy Policy</strong>
        </p>
      </div>
    </div>
  );
};
