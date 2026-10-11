/**
 * CEP (Brazilian postal code) lookup against free public services, called
 * straight from the browser (both allow any origin and need no key).
 *
 * Providers are tried in order, each with a short timeout. OpenCEP serves static
 * files from a CDN; ViaCEP is the fallback. They return the same field names.
 * Lookup is a convenience only: it never throws, and a miss simply means the
 * person types the address themselves.
 *
 * Coordinates are deliberately not used: a CEP can cover a whole street or town,
 * so it is not the location of the issue.
 */

export interface CepAddress {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

const PROVIDERS: Array<(digits: string) => string> = [
  digits => `https://opencep.com/v1/${digits}`,
  digits => `https://viacep.com.br/ws/${digits}/json/`,
];

const TIMEOUT_MS = 4000;

const cache = new Map<string, CepAddress | null>();

/** The 8 digits of a CEP written as `01310-100`, `01310100`, etc., or null if it is not one. */
export function cepDigits(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  return digits.length === 8 ? digits : null;
}

/** Formats user input as they type: digits only, hyphen after the fifth (`01310-100`). */
export function formatCepInput(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

interface ProviderBody {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string; // ViaCEP: HTTP 200 with { "erro": "true" } for an unknown CEP
  error?: boolean;
}

async function fetchFromProvider(url: string): Promise<CepAddress | null> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) return null;

  const body = await response.json() as ProviderBody;
  if (body.erro || body.error) return null;

  const address: CepAddress = {
    street: (body.logradouro ?? '').trim(),
    neighborhood: (body.bairro ?? '').trim(),
    city: (body.localidade ?? '').trim(),
    state: (body.uf ?? '').trim(),
  };
  return address.street || address.neighborhood || address.city ? address : null;
}

/** Looks up a CEP; resolves to null when no provider knows it or all are unreachable. */
export async function lookupCep(cep: string): Promise<CepAddress | null> {
  const digits = cepDigits(cep);
  if (!digits) return null;
  if (cache.has(digits)) return cache.get(digits) ?? null;

  for (const providerUrl of PROVIDERS) {
    try {
      const address = await fetchFromProvider(providerUrl(digits));
      if (address) {
        cache.set(digits, address);
        return address;
      }
    } catch {
      // Timeout, network or parse failure: try the next provider.
    }
  }
  // Not cached: a miss may be a temporary outage.
  return null;
}
