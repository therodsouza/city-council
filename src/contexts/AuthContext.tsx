import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { authenticationService } from '../services/AuthenticationService';
import type { GoogleUserProfile } from '../types';

interface User {
  id: string;
  name: string;
  email: string;
  photo: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  completeImplicitAuth: (idToken: string, accessToken: string, state: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toUser = (profile: GoogleUserProfile): User => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  photo: profile.picture ?? '',
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (await authenticationService.isAuthenticated()) {
          const profile = await authenticationService.getCurrentUser();
          if (!cancelled && profile) setUser(toUser(profile));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    authenticationService.onReAuthenticationRequired(() => {
      setUser(null);
    });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async () => {
    setError(null);
    const url = await authenticationService.initiateGoogleAuth();
    window.location.assign(url);
  }, []);

  const logout = useCallback(async () => {
    await authenticationService.logout();
    setUser(null);
  }, []);

  const completeImplicitAuth = useCallback(async (idToken: string, accessToken: string, state: string) => {
    setError(null);
    try {
      const profile = await authenticationService.completeGoogleAuthImplicit(idToken, accessToken, state);
      setUser(toUser(profile));
    } catch (e: any) {
      setError(e?.message ?? 'Authentication failed');
      throw e;
    }
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    completeImplicitAuth,
  }), [user, isLoading, error, login, logout, completeImplicitAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { User };
