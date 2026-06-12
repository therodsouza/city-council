import { useState } from 'react';
import { ArrowRight, LocateFixed, Loader2 } from 'lucide-react';
import { FormData } from '../types/form';
import { FieldLabel, TextInput, TextArea } from './FormFields';
import { useGeolocation } from '../hooks/useGeolocation';
import { reverseGeocode } from '../services/GeocodeService';

const SITE_TYPES = [
  'Road / Street',
  'Footpath / Pathway',
  'Park / Reserve',
  'Public Building',
  'Stormwater / Drain',
  'Street Lighting',
  'Public Toilet',
  'Other',
];

interface Props {
  form: FormData;
  setVal: (key: keyof FormData, value: string | boolean) => void;
  setCoords: (lat: number, lng: number) => void;
  onNext: () => void;
}

export default function StepLocation({ form, setVal, setCoords, onNext }: Props) {
  const canProceed = !!(form.address.trim() && form.suburb.trim() && form.siteType);
  const geo = useGeolocation();
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const locating = geo.status === 'requesting' || geocoding;

  function handleUseMyLocation() {
    setGeocodeError(null);
    geo.request(async coords => {
      setGeocoding(true);
      try {
        const result = await reverseGeocode(coords.latitude, coords.longitude);
        setVal('address', result.address);
        setVal('suburb', result.suburb);
        setVal('postcode', result.postcode);
        setCoords(coords.latitude, coords.longitude);
      } catch {
        setGeocodeError('Could not look up address. Please enter it manually.');
      } finally {
        setGeocoding(false);
      }
    });
  }

  return (
    <div>
      <div className="px-8 py-6 border-b border-border">
        <h2 className="text-xl font-display font-bold text-foreground">Location Details</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tell us exactly where the issue is located so we can dispatch the right team.
        </p>
      </div>

      <div className="px-8 py-6 space-y-6">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={locating}
            onClick={handleUseMyLocation}
            className="flex items-center gap-2 w-fit px-4 py-2 border border-border bg-white text-foreground text-sm font-semibold rounded-sm hover:border-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {locating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4" />
            )}
            {locating ? 'Detecting location…' : 'Use my location'}
          </button>
          {(geo.error || geocodeError) && (
            <p className="text-xs text-red-600">{geo.error ?? geocodeError}</p>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="address" required>Street Address</FieldLabel>
            <TextInput
              id="address"
              value={form.address}
              onChange={e => setVal('address', e.target.value)}
              placeholder="e.g. 42 Harbour Road"
              autoComplete="street-address"
            />
          </div>
          <div>
            <FieldLabel htmlFor="postcode">Postcode</FieldLabel>
            <TextInput
              id="postcode"
              value={form.postcode}
              onChange={e => setVal('postcode', e.target.value)}
              placeholder="e.g. 6003"
              autoComplete="postal-code"
            />
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="suburb" required>Suburb / Area</FieldLabel>
          <TextInput
            id="suburb"
            value={form.suburb}
            onChange={e => setVal('suburb', e.target.value)}
            placeholder="e.g. Northbridge"
            autoComplete="address-level2"
          />
        </div>

        <div>
          <FieldLabel
            htmlFor="locationNote"
            hint="Describe nearby landmarks or access points to help us find the exact spot."
          >
            Additional Location Notes
          </FieldLabel>
          <TextArea
            id="locationNote"
            value={form.locationNote}
            onChange={e => setVal('locationNote', e.target.value)}
            placeholder="e.g. Adjacent to the bus shelter, opposite the car park entrance on the eastern footpath…"
            rows={3}
          />
        </div>

        <div>
          <FieldLabel required>Site Type</FieldLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
            {SITE_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setVal('siteType', type)}
                className={`px-3 py-2 text-sm border rounded-sm transition-colors text-left ${
                  form.siteType === type
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-8 py-4 border-t border-border flex items-center justify-between">
        <div />
        <span className="text-xs font-mono text-muted-foreground">1 of 4</span>
        <button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
