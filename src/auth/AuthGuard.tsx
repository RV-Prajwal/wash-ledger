import { h } from 'preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { route } from 'preact-router';

export type UserRole = 'admin' | 'worker' | null;

interface AuthState {
  user: User | null;
  role: UserRole;
  loading: boolean;
}

interface AuthGuardProps {
  children: ComponentChildren;
  requireAdmin?: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch role from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().active) {
            const role = userDoc.data().role as UserRole;
            setAuthState({ user, role, loading: false });
            return;
          } else {
            // User not active or no doc
            await auth.signOut();
            setAuthState({ user: null, role: null, loading: false });
          }
        } catch (e) {
          console.error("Error fetching user role", e);
          setAuthState({ user: null, role: null, loading: false });
        }
      } else {
        setAuthState({ user: null, role: null, loading: false });
      }
    });

    return unsubscribe;
  }, []);

  return authState;
};

export const AuthGuard = ({ children, requireAdmin = false }: AuthGuardProps) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div class="container items-center" style="justify-content: center; height: 100vh;">
        <div class="glass-panel">Loading...</div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login if not authenticated
    // Use a short timeout to let Preact Router render first
    setTimeout(() => route('/login', true), 0);
    return null;
  }

  if (requireAdmin && role !== 'admin') {
    setTimeout(() => route('/', true), 0);
    return null;
  }

  return <>{children}</>;
};
