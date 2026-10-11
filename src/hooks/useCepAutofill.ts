import { useCallback, useEffect, useRef, useState } from 'react';
import { cepDigits, formatCepInput, lookupCep } from '../services/CepService';

export type CepLookupStatus = 'idle' | 'loading' | 'filled' | 'not_found';

interface Fill {
  address?: string;
  suburb?: string;
}

/**
 * Looks the CEP up as soon as it is complete and offers the street and
 * neighbourhood to the form.
 *
 * A field is only overwritten when it is empty or still holds what a previous
 * lookup put there, so fixing a mistyped CEP replaces the old suggestion but
 * never clobbers something the person typed. Late answers for an outdated CEP
 * are ignored.
 */
export function useCepAutofill(
  current: { address: string; suburb: string },
  onFill: (fill: Fill) => void,
) {
  const [status, setStatus] = useState<CepLookupStatus>('idle');
  const requestId = useRef(0);
  const lastFilled = useRef<Required<Fill>>({ address: '', suburb: '' });
  const currentRef = useRef(current);
  const onFillRef = useRef(onFill);
  currentRef.current = current;
  onFillRef.current = onFill;

  // Invalidate any in-flight lookup if the component goes away.
  useEffect(() => () => { requestId.current++; }, []);

  /** Call from the CEP input's onChange; returns the value to store (formatted as typed). */
  const handleCepChange = useCallback((raw: string): string => {
    const formatted = formatCepInput(raw);
    const id = ++requestId.current;

    const digits = cepDigits(formatted);
    if (!digits) {
      setStatus('idle');
      return formatted;
    }

    setStatus('loading');
    lookupCep(digits).then(result => {
      if (id !== requestId.current) return; // a newer CEP was typed meanwhile

      const fill: Fill = {};
      const { address, suburb } = currentRef.current;
      if (result?.street && (!address.trim() || address === lastFilled.current.address)) {
        fill.address = result.street;
      }
      if (result?.neighborhood && (!suburb.trim() || suburb === lastFilled.current.suburb)) {
        fill.suburb = result.neighborhood;
      }

      if (fill.address !== undefined) lastFilled.current.address = fill.address;
      if (fill.suburb !== undefined) lastFilled.current.suburb = fill.suburb;

      // A city-wide CEP has no street or neighbourhood to offer.
      const found = !!(result && (result.street || result.neighborhood));
      setStatus(found ? 'filled' : 'not_found');
      if (fill.address !== undefined || fill.suburb !== undefined) onFillRef.current(fill);
    });

    return formatted;
  }, []);

  return { status, handleCepChange };
}
