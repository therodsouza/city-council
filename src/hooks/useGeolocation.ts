import { useState } from 'react';

type GeoStatus = 'idle' | 'requesting' | 'error';

interface UseGeolocationReturn {
  status: GeoStatus;
  error: string | null;
  request: (onCoords: (coords: GeolocationCoordinates) => void) => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  function request(onCoords: (coords: GeolocationCoordinates) => void) {
    if (!navigator.geolocation) {
      setStatus('error');
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setStatus('requesting');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setStatus('idle');
        onCoords(pos.coords);
      },
      err => {
        setStatus('error');
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. Please allow it in your browser settings.'
            : 'Unable to retrieve your location. Please enter the address manually.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return { status, error, request };
}
