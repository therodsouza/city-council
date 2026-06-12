export type Step = 1 | 2 | 3 | 4;

export interface FormData {
  address: string;
  suburb: string;
  postcode: string;
  lat?: number;
  lng?: number;
  locationNote: string;
  siteType: string;
  category: string;
  severity: string;
  description: string;
  name: string;
  email: string;
  phone: string;
  receiveUpdates: boolean;
  agreeTerms: boolean;
}
