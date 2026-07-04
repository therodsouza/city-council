import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type GeoStatus = 'idle' | 'requesting' | 'error';

interface UseGeolocationReturn {
  status: GeoStatus;
  error: string | null;
  request: (onCoords: (coords: GeolocationCoordinates) => void) => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const { t } = useTranslation();
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  function request(onCoords: (coords: GeolocationCoordinates) => void) {
    if (!navigator.geolocation) {
      setStatus('error');
      setError(t('geo.not_supported'));
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
            ? t('geo.denied')
            : t('geo.unavailable'),
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return { status, error, request };
}
