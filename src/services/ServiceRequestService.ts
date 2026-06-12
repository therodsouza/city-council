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
