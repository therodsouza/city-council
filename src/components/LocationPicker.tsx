import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';

interface Props {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
}

// Brazil as a whole: with no pin yet there is nothing closer to centre on.
const BRAZIL_CENTER = { lat: -14.235, lng: -51.925 };
const COUNTRY_ZOOM = 4;
const PIN_ZOOM = 17;
const MAP_STYLE = { width: '100%', height: '100%' };
const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

/** Click the map or drag the pin to say exactly where the problem is. Renders nothing without a Maps key. */
export default function LocationPicker(props: Props) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey) return null;
  return <Picker {...props} apiKey={apiKey} />;
}

function Picker({ lat, lng, onChange, apiKey }: Props & { apiKey: string }) {
  // Same loader id as RequestMap, so the script is only added to the page once.
  const { isLoaded, loadError } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: apiKey });
  const hasPin = lat !== undefined && lng !== undefined;
  // A stable object: a new one on every render would snap the map back after the person pans it.
  const center = useMemo(() => (hasPin ? { lat, lng } : BRAZIL_CENTER), [hasPin, lat, lng]);

  if (loadError) return null;

  return (
    <div className="h-72 w-full border border-border rounded-sm overflow-hidden bg-muted/30">
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={MAP_STYLE}
          center={center}
          zoom={hasPin ? PIN_ZOOM : COUNTRY_ZOOM}
          options={MAP_OPTIONS}
          onClick={e => e.latLng && onChange(e.latLng.lat(), e.latLng.lng())}
        >
          {hasPin && (
            <MarkerF
              position={center}
              draggable
              onDragEnd={e => e.latLng && onChange(e.latLng.lat(), e.latLng.lng())}
            />
          )}
        </GoogleMap>
      ) : (
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
