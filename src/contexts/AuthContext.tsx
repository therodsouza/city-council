import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { authenticationService } from '../services/AuthenticationService';
import { getUserProfile } from '../services/UserService';
import type { GoogleUserProfile } from '../types';

export interface UserProfile {
  dateOfBirth: string;
  gender: string;
  phone: string;
  address: string;
  suburb: string;
  postcode: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  photo: string;
  profileComplete: boolean;
  profile: UserProfile | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  completeImplicitAuth: (idToken: string, accessToken: string, state: string) => Promise<void>;
  completeProfile: (profile: UserProfile) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toUser = (profile: GoogleUserProfile): User => ({
  id: profile.id,
  name: profile.name,
  email: profile.email,
  photo: profile.picture ?? '',
  profileComplete: false,
  profile: null,
});

async function hydrateUser(googleProfile: GoogleUserProfile): Promise<User> {
  const base = toUser(googleProfile);
  try {
    const saved = await getUserProfile();
    if (!saved.profileComplete) return base;
    return {
      ...base,
      profileComplete: true,
      profile: {
        dateOfBirth: saved.dateOfBirth ?? '',
        gender: saved.gender ?? '',
        phone: saved.phone ?? '',
        address: saved.address ?? '',
        suburb: saved.suburb ?? '',
        postcode: saved.postcode ?? '',
      },
    };
  } catch {
    return base;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (await authenticationService.isAuthenticated()) {
          const googleProfile = await authenticationService.getCurrentUser();
          if (!cancelled && googleProfile) setUser(await hydrateUser(googleProfile));
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
    setError(null);
  }, []);

  const completeProfile = useCallback((profile: UserProfile) => {
    setUser((prev) => prev ? { ...prev, profileComplete: true, profile } : prev);
  }, []);

  const completeImplicitAuth = useCallback(async (idToken: string, accessToken: string, state: string) => {
    setError(null);
    try {
      const googleProfile = await authenticationService.completeGoogleAuthImplicit(idToken, accessToken, state);
      setUser(await hydrateUser(googleProfile));
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
    completeProfile,
  }), [user, isLoading, error, login, logout, completeImplicitAuth, completeProfile]);

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
