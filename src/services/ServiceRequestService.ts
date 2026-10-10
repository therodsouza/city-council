import { FormData as AppFormData } from '../types/form';
import { authenticationService } from './AuthenticationService';

export interface ServiceRequestPayload {
  submittedAt: string;
  location: {
    address: string;
    suburb: string;
    postcode: string;
    lat?: number;
    lng?: number;
    siteType: string;
    notes: string;
  };
  issue: {
    category: string;
    severity: string;
    description: string;
  };
  contact: {
    name: string;
    email: string;
    phone: string;
    receiveUpdates: boolean;
  };
}

export function buildServiceRequestPayload(form: AppFormData): ServiceRequestPayload {
  return {
    submittedAt: new Date().toISOString(),
    location: {
      address: form.address,
      suburb: form.suburb,
      postcode: form.postcode,
      ...(form.lat !== undefined && form.lng !== undefined
        ? { lat: form.lat, lng: form.lng }
        : {}),
      siteType: form.siteType,
      notes: form.locationNote,
    },
    issue: {
      category: form.category,
      severity: form.severity,
      description: form.description,
    },
    contact: {
      name: form.name,
      email: form.email,
      phone: form.phone,
      receiveUpdates: form.receiveUpdates,
    },
  };
}

export interface ServiceRequestListItem {
  id: string;
  referenceNumber: string;
  submittedAt: string;
  createdAt: string;
  status?: string;
  address: string;
  suburb: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  siteType: string;
  locationNotes: string | null;
  category: string;
  severity: string;
  issueDescription: string;
  contactName: string;
  contactEmail: string;
  receiveUpdates: boolean;
  imagePath: string | null;
  geohash?: string;
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export async function submitServiceRequest(
  payload: ServiceRequestPayload,
  photoFile?: File | null,
): Promise<string> {
  if (!API_URL) {
    console.log('[ServiceRequest] No VITE_API_URL configured — payload:', payload);
    return `SR-DEV-${String(Math.floor(Math.random() * 90000) + 10000)}`;
  }

  const idToken = await authenticationService.getIdToken();

  const body = new FormData();
  body.append(
    'data',
    new Blob([JSON.stringify(payload)], { type: 'application/json' }),
    'data.json',
  );
  if (photoFile) {
    body.append('photo', photoFile, photoFile.name);
  }

  const response = await fetch(`${API_URL}/service-requests`, {
    method: 'POST',
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
    body,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? `Submission failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { referenceNumber: string };
  return data.referenceNumber;
}

interface ServiceRequestPage {
  items: ServiceRequestListItem[];
  nextToken?: string | null;
}

const LIST_PAGE_SIZE = 100;
const MAX_LIST_PAGES = 50;

/**
 * Loads every request the caller may see. The API returns pages
 * ({ items, nextToken }); older deployments returned a bare array, which is
 * still accepted so the frontend can be deployed before or after the API.
 */
export async function getServiceRequests(): Promise<ServiceRequestListItem[]> {
  if (!API_URL) {
    return [];
  }

  const idToken = await authenticationService.getIdToken();
  const requests: ServiceRequestListItem[] = [];
  let nextToken: string | null = null;

  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const query: string = `limit=${LIST_PAGE_SIZE}` + (nextToken ? `&nextToken=${encodeURIComponent(nextToken)}` : '');
    const response = await fetch(`${API_URL}/service-requests?${query}`, {
      headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message ?? `Failed to load requests: ${response.status} ${response.statusText}`);
    }

    const body = await response.json() as ServiceRequestListItem[] | ServiceRequestPage;
    if (Array.isArray(body)) {
      return body;
    }
    requests.push(...(body.items ?? []));
    nextToken = body.nextToken ?? null;
    if (!nextToken) {
      break;
    }
  }

  return requests;
}
