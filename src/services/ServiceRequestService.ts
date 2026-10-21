import { FormData as AppFormData } from '../types/form';
import { authenticationService } from './AuthenticationService';
import { ApiError, toApiError } from './ApiError';
import type { Severity, Status } from '../components/requestUi';

/**
 * How the API obtains the point of a request (`location.coordinates`):
 * - `custom`: the point the person chose, from "Use my location" or a pin on the map;
 * - `venue`: a predefined sports venue; the API copies its point and address, so the address
 *   fields of the location must then be empty;
 * - `address`: no point of our own, the API locates the typed address (best effort).
 */
export type GeoSource =
  | { type: 'custom'; lat: number; lng: number }
  | { type: 'venue'; venueId: string }
  | { type: 'address' };

export interface ServiceRequestPayload {
  submittedAt: string;
  location: {
    coordinates: GeoSource;
    address: string;
    suburb: string;
    postcode: string;
    siteType: string;
    notes: string;
  };
  issue: {
    category: string;
    description: string;
  };
  contact: {
    name: string;
    email?: string;
    phone: string;
    receiveUpdates: boolean;
  };
}

export function buildServiceRequestPayload(
  form: AppFormData,
  { anonymous = false }: { anonymous?: boolean } = {},
): ServiceRequestPayload {
  const email = form.email.trim();
  return {
    submittedAt: new Date().toISOString(),
    location: {
      coordinates: form.lat !== undefined && form.lng !== undefined
        ? { type: 'custom', lat: form.lat, lng: form.lng }
        : { type: 'address' },
      address: form.address,
      suburb: form.suburb,
      postcode: form.postcode,
      siteType: form.siteType,
      notes: form.locationNote,
    },
    issue: {
      category: form.category,
      description: form.description,
    },
    contact: {
      name: form.name,
      // Anonymous requests treat email as optional; omit it rather than send an empty string.
      ...(anonymous && !email ? {} : { email: form.email }),
      phone: form.phone,
      receiveUpdates: form.receiveUpdates && (!anonymous || !!email),
    },
  };
}

export interface ServiceRequestListItem {
  id: string;
  referenceNumber: string;
  submittedAt: string;
  createdAt: string;
  /** Absent on responses from API versions that predate statuses; read it with `toStatus`. */
  status?: Status;
  updatedAt?: string | null;
  address: string;
  suburb: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  siteType: string;
  locationNotes: string | null;
  category: string;
  /** Set by an administrator. Absent or empty until the request is assessed; read it with `toSeverity`. */
  severity?: Severity | null;
  issueDescription: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  /** Verified mobile number of an anonymous submitter; visible to administrators only. Superseded by `verifiedContact`. */
  ownerPhone?: string | null;
  /** What an anonymous submitter verified (phone or email); visible to administrators only. */
  verifiedContact?: { channel: 'sms' | 'email'; value: string } | null;
  submittedBy?: 'user' | 'anonymous' | null;
  receiveUpdates: boolean;
  imagePath: string | null;
  geohash?: string;
}

export interface StatusChange {
  /** Present on status entries; severity entries leave it out. */
  status?: Status;
  /** Present on severity entries: the severity the admin set. */
  severity?: Severity;
  changedAt: string;
  changedBySub?: string | null;
  changedByEmail?: string | null;
  note?: string | null;
}

/** One request in full, as returned by `GET /service-requests/{id}`. */
export interface ServiceRequestDetail extends ServiceRequestListItem {
  /** Temporary link to the photo (15 minutes); absent when there is no photo. */
  imageUrl?: string | null;
  /** Oldest first. */
  statusHistory?: StatusChange[] | null;
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

function buildSubmitBody(payload: ServiceRequestPayload, photoFile?: File | null): FormData {
  const body = new FormData();
  body.append(
    'data',
    new Blob([JSON.stringify(payload)], { type: 'application/json' }),
    'data.json',
  );
  if (photoFile) {
    body.append('photo', photoFile, photoFile.name);
  }
  return body;
}

export async function submitServiceRequest(
  payload: ServiceRequestPayload,
  photoFile?: File | null,
): Promise<string> {
  if (!API_URL) {
    console.log('[ServiceRequest] No VITE_API_URL configured — payload:', payload);
    return `SR-DEV-${String(Math.floor(Math.random() * 90000) + 10000)}`;
  }

  const idToken = await authenticationService.getIdToken();

  const response = await fetch(`${API_URL}/service-requests`, {
    method: 'POST',
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
    body: buildSubmitBody(payload, photoFile),
  });

  if (!response.ok) throw await toApiError(response, 'Submission failed');

  const data = await response.json() as { referenceNumber: string };
  return data.referenceNumber;
}

/**
 * Submits without an account, using the token from a confirmed phone verification.
 * Public endpoint: no Authorization header. Throws ApiError on any non-2xx response.
 */
export async function submitAnonymousServiceRequest(
  payload: ServiceRequestPayload,
  photoFile: File | null | undefined,
  verificationToken: string,
): Promise<string> {
  if (!API_URL) {
    console.log('[ServiceRequest] No VITE_API_URL configured — anonymous payload:', payload);
    return `SR-DEV-${String(Math.floor(Math.random() * 90000) + 10000)}`;
  }

  const response = await fetch(`${API_URL}/anonymous/service-requests`, {
    method: 'POST',
    headers: { 'X-Verification-Token': verificationToken },
    body: buildSubmitBody(payload, photoFile),
  });

  if (!response.ok) throw await toApiError(response, 'Submission failed');

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

async function authHeaders(): Promise<Record<string, string>> {
  const idToken = await authenticationService.getIdToken();
  return idToken ? { Authorization: `Bearer ${idToken}` } : {};
}

/** One request in full. Throws ApiError; `status` 404 means it does not exist or is not visible to the caller. */
export async function getServiceRequest(id: string): Promise<ServiceRequestDetail> {
  if (!API_URL) throw new ApiError(404, 'No API configured');

  const response = await fetch(`${API_URL}/service-requests/${encodeURIComponent(id)}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw await toApiError(response, 'Failed to load request');
  return await response.json() as ServiceRequestDetail;
}

/**
 * Admin only. Sets the status and appends a history entry; resolves to the updated request.
 * Sending the current status is accepted by the API only with a note.
 */
export async function updateServiceRequestStatus(
  id: string,
  status: Status,
  note?: string,
): Promise<ServiceRequestDetail> {
  if (!API_URL) throw new ApiError(404, 'No API configured');

  const trimmed = note?.trim();
  const response = await fetch(`${API_URL}/service-requests/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify(trimmed ? { status, note: trimmed } : { status }),
  });
  if (!response.ok) throw await toApiError(response, 'Failed to update status');
  return await response.json() as ServiceRequestDetail;
}

/**
 * Admin only. Sets the severity and appends a history entry; resolves to the updated request.
 * A severity cannot be cleared once set.
 */
export async function updateServiceRequestSeverity(
  id: string,
  severity: Severity,
  note?: string,
): Promise<ServiceRequestDetail> {
  if (!API_URL) throw new ApiError(404, 'No API configured');

  const trimmed = note?.trim();
  const response = await fetch(`${API_URL}/service-requests/${encodeURIComponent(id)}/severity`, {
    method: 'PATCH',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify(trimmed ? { severity, note: trimmed } : { severity }),
  });
  if (!response.ok) throw await toApiError(response, 'Failed to update severity');
  return await response.json() as ServiceRequestDetail;
}
