import { h, Component } from 'preact';
import type { ComponentChildren } from 'preact';
import { AlertCircle, RefreshCw, Home } from 'lucide-preact';
import { getUserFriendlyError } from '../utils/errors';

interface ErrorBoundaryProps {
  children: ComponentChildren;
}

interface ErrorBoundaryState {
  hasError: boolean;
  userMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    userMessage: ''
  };

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return {
      hasError: true,
      userMessage: getUserFriendlyError(error, 'An unexpected issue occurred while displaying this page.')
    };
  }

  componentDidCatch(error: any, info: any) {
    console.error('Unhandled UI error captured by boundary:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, userMessage: '' });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--bg-main)',
          color: 'var(--text-main)',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '420px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '24px',
            padding: '32px 24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px'
            }}>
              <AlertCircle size={32} />
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-main)' }}>
              Temporary Screen Issue
            </h2>

            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '24px' }}>
              {this.state.userMessage || 'We encountered an unexpected display issue. Please try refreshing or return to the main screen.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                class="btn-primary" 
                style={{ width: '100%', minHeight: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={this.handleReload}
              >
                <RefreshCw size={18} />
                <span>Reload Screen</span>
              </button>

              <button 
                class="btn-secondary" 
                style={{ width: '100%', minHeight: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={this.handleGoHome}
              >
                <Home size={18} />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
