import { authenticationService } from './AuthenticationService';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export interface ReverseGeocodeResult {
  address: string;
  suburb: string;
  postcode: string;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not configured.');
  }

  const idToken = await authenticationService.getIdToken();

  const url = new URL(`${API_URL}/geocode/reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lng));

  const response = await fetch(url.toString(), {
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Reverse geocode failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<ReverseGeocodeResult>;
}
