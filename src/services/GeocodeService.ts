const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export interface ReverseGeocodeResult {
  address: string;
  suburb: string;
  postcode: string;
}

// GET /geocode/reverse?lat={lat}&lng={lng}
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not configured.');
  }
  const url = new URL(`${API_URL}/geocode/reverse`);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lng));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Reverse geocode failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<ReverseGeocodeResult>;
}
