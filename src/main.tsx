import { render } from 'preact';
import { Router, Route } from 'preact-router';
import { AuthGuard } from './auth/AuthGuard';
import { Login } from './auth/Login';
import { Home } from './worker/Home';
import { Confirm } from './worker/Confirm';
import { Dashboard } from './admin/Dashboard';
import { Ledger } from './admin/Ledger';
import { Prices } from './admin/Prices';
import { ScanScreen } from './worker/Scan';
import { DevTest } from './worker/DevTest';
import { TestHarness } from './worker/TestHarness';
import { Workers } from './admin/Workers';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

export function App() {
  return (
    <ErrorBoundary>
      <Router>
      <Route path="/login" component={Login} />
      <Route path="/dev-test" component={DevTest} />
      <Route path="/test-harness" component={TestHarness} />
      
      {/* Worker Routes */}
      <Route path="/" component={() => (
        <AuthGuard>
          <Home />
        </AuthGuard>
      )} />
      <Route path="/scan" component={() => (
        <AuthGuard>
          <ScanScreen />
        </AuthGuard>
      )} />
      <Route path="/confirm" component={() => (
        <AuthGuard>
          <Confirm />
        </AuthGuard>
      )} />
      
      {/* Admin Routes */}
      <Route path="/admin" component={() => (
        <AuthGuard requireAdmin>
          <Dashboard />
        </AuthGuard>
      )} />
      <Route path="/admin/ledger" component={() => (
        <AuthGuard requireAdmin>
          <Ledger />
        </AuthGuard>
      )} />
      <Route path="/admin/prices" component={() => (
        <AuthGuard requireAdmin>
          <Prices />
        </AuthGuard>
      )} />
      <Route path="/admin/workers" component={() => (
        <AuthGuard requireAdmin>
          <Workers />
        </AuthGuard>
      )} />
      </Router>
    </ErrorBoundary>
  );
}

render(<App />, document.getElementById('app')!);
