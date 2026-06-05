import { FormData as AppFormData } from '../types/form';

export interface ServiceRequestPayload {
  referenceNumber: string;
  submittedAt: string;
  location: {
    address: string;
    suburb: string;
    postcode: string;
    siteType: string;
    notes: string;
  };
  issue: {
    category: string;
    severity: string;
    description: string;
    photoName?: string;
  };
  contact: {
    name: string;
    email: string;
    phone: string;
    receiveUpdates: boolean;
  };
}

export function buildServiceRequestPayload(
  form: AppFormData,
  referenceNumber: string,
): ServiceRequestPayload {
  return {
    referenceNumber,
    submittedAt: new Date().toISOString(),
    location: {
      address: form.address,
      suburb: form.suburb,
      postcode: form.postcode,
      siteType: form.siteType,
      notes: form.locationNote,
    },
    issue: {
      category: form.category,
      severity: form.severity,
      description: form.description,
      ...(form.photoName ? { photoName: form.photoName } : {}),
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
): Promise<void> {
  if (!API_URL) {
    console.log('[ServiceRequest] No VITE_API_URL configured — payload:', payload);
    return;
  }

  const body = new FormData();
  body.append('data', JSON.stringify(payload));
  if (photoFile) {
    body.append('photo', photoFile, photoFile.name);
  }

  const response = await fetch(`${API_URL}/service-requests`, {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    throw new Error(`Submission failed: ${response.status} ${response.statusText}`);
  }
}
