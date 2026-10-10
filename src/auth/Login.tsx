import { h } from 'preact';
import { useState } from 'preact/hooks';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { route } from 'preact-router';
import { LogIn } from 'lucide-preact';

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
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="container items-center" style="justify-content: center; height: 100vh;">
      <div class="glass-panel" style="width: 100%; max-width: 400px;">
        <div class="text-center mb-4">
          <h2>Wash Ledger</h2>
          <p class="text-muted mt-4">Sign in to your account</p>
        </div>
        
        {error && <div style="color: var(--danger); margin-bottom: 16px; text-align: center;">{error}</div>}
        
        <form onSubmit={handleLogin} class="flex-col gap-4">
          <div>
            <label class="text-muted fw-bold" style="font-size: 0.875rem; margin-bottom: 8px; display: block;">Email</label>
            <input 
              type="email" 
              class="input-glass" 
              value={email}
              onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
              required
            />
          </div>
          <div>
            <label class="text-muted fw-bold" style="font-size: 0.875rem; margin-bottom: 8px; display: block;">Password</label>
            <input 
              type="password" 
              class="input-glass" 
              value={password}
              onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
              required
            />
          </div>
          <button type="submit" class="btn btn-primary btn-large mt-4" disabled={loading} style="width: 100%;">
            <LogIn size={24} />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
