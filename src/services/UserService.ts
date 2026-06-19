import { authenticationService } from './AuthenticationService';
import type { UserProfile } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

interface GetUserProfileResponse {
  profileComplete: boolean;
  name?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  suburb?: string;
  postcode?: string;
}

export async function getUserProfile(): Promise<GetUserProfileResponse> {
  if (!API_URL) return { profileComplete: false };

  const idToken = await authenticationService.getIdToken();

  const response = await fetch(`${API_URL}/users/me`, {
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Failed to load profile (${response.status})`);
  }

  return response.json() as Promise<GetUserProfileResponse>;
}

export async function putUserProfile(name: string, profile: UserProfile): Promise<void> {
  if (!API_URL) {
    console.log('[UserService] No VITE_API_URL — skipping profile persist:', { name, ...profile });
    return;
  }

  const idToken = await authenticationService.getIdToken();

  const response = await fetch(`${API_URL}/users/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ name, ...profile }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Profile update failed (${response.status})`);
  }
}
