import { h } from 'preact';
import { useState } from 'preact/hooks';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { route } from 'preact-router';
import { LogIn, AlertCircle, Mail, Lock } from 'lucide-preact';
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
    <div 
      class="app-shell" 
      style={{ 
        backgroundColor: '#ffffff', 
        height: '100dvh', 
        maxHeight: '100dvh', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Top Hero Banner - proportional height */}
      <div style={{ position: 'relative', width: '100%', height: '34vh', minHeight: '190px', maxHeight: '250px', overflow: 'hidden', background: '#0f172a', flexShrink: 0 }}>
        <img 
          src={loginHeroImg} 
          alt="CEAT Vehicle Wash & Care" 
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', display: 'block' }}
        />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, #ffffff 0%, rgba(255,255,255,0.02) 40%, rgba(15,23,42,0.2) 70%, rgba(15,23,42,0.65) 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 'max(14px, var(--safe-top)) 16px 12px 16px'
        }}>
          {/* Top Tag Badge */}
          <div style={{
            alignSelf: 'center',
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(10px)',
            color: '#ffffff',
            padding: '6px 18px',
            borderRadius: '24px',
            fontSize: '11px',
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

      {/* Main Login Form Container - fits remaining viewport without scrolling */}
      <div style={{ 
        flex: 1, 
        padding: '8px 22px calc(14px + var(--safe-bottom)) 22px', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden'
      }}>
        {/* Form area */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
          {/* Title and Tagline */}
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px', lineHeight: '1.15' }}>
              India’s #1
            </h1>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px', marginTop: '2px' }}>
              Car & Bike Care App
            </h2>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              margin: '12px 0 6px 0',
              color: 'var(--text-muted)',
              fontSize: '12px',
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
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px'
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Email Field with Icon */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="email" 
                  class="input-glass" 
                  placeholder="name@wash.ceat.in"
                  value={email}
                  onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                  style={{ paddingLeft: '44px', minHeight: '48px', fontSize: '15px' }}
                  required
                />
              </div>
            </div>

            {/* Password Field with Icon */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: '5px', display: 'block' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={17} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="password" 
                  class="input-glass" 
                  placeholder="••••••••"
                  value={password}
                  onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                  style={{ paddingLeft: '44px', minHeight: '48px', fontSize: '15px' }}
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
                minHeight: '50px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontWeight: '800',
                fontSize: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                marginTop: '6px',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                transition: 'transform 0.15s ease'
              }}
            >
              <LogIn size={18} />
              <span>{loading ? 'Authenticating...' : 'Login / Sign In'}</span>
            </button>
          </form>
        </div>

        {/* Footer legal disclaimer */}
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-subtle)', marginTop: '8px', lineHeight: '1.35', flexShrink: 0 }}>
          By proceeding you agree to the <br />
          <strong style={{ color: 'var(--text-muted)' }}>Terms & Conditions</strong> and <strong style={{ color: 'var(--text-muted)' }}>Privacy Policy</strong>
        </p>
      </div>
    </div>
  );
};
