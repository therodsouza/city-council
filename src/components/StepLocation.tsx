import { useRef, useState } from 'react';
import { ArrowRight, LocateFixed, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FormData } from '../types/form';
import { FieldLabel, TextInput, TextArea } from './FormFields';
import { useGeolocation } from '../hooks/useGeolocation';
import { useCepAutofill } from '../hooks/useCepAutofill';
import { cepDigits, formatCepInput } from '../services/CepService';
import { reverseGeocode } from '../services/GeocodeService';
import { SITE_TYPES } from '../i18n/labels';

interface Props {
  form: FormData;
  setVal: (key: keyof FormData, value: string | boolean) => void;
  setCoords: (lat: number, lng: number) => void;
  /** Reverse geocoding needs an account; guests type the address instead. */
  canUseMyLocation?: boolean;
  onNext: () => void;
}

export default function StepLocation({ form, setVal, setCoords, canUseMyLocation = true, onNext }: Props) {
  const { t } = useTranslation();
  const canProceed = !!(form.address.trim() && form.suburb.trim() && form.siteType);
  const geo = useGeolocation();
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const locating = geo.status === 'requesting' || geocoding;
  const addressRef = useRef<HTMLInputElement>(null);
  const [cepTouched, setCepTouched] = useState(false);
  const cep = useCepAutofill({ address: form.address, suburb: form.suburb }, fill => {
    if (fill.address !== undefined) {
      setVal('address', fill.address);
      // The street comes without a number: hand the cursor to the person to add it.
      requestAnimationFrame(() => {
        const input = addressRef.current;
        if (!input) return;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      });
    }
    if (fill.suburb !== undefined) setVal('suburb', fill.suburb);
  });
  const cepIncomplete = cepTouched && !!form.postcode && !cepDigits(form.postcode);

  function handleUseMyLocation() {
    setGeocodeError(null);
    geo.request(async coords => {
      setGeocoding(true);
      try {
        const result = await reverseGeocode(coords.latitude, coords.longitude);
        setVal('address', result.address);
        setVal('suburb', result.suburb);
        setVal('postcode', cepDigits(result.postcode) ? formatCepInput(result.postcode) : result.postcode);
        setCoords(coords.latitude, coords.longitude);
      } catch {
        setGeocodeError(t('stepLocation.geocode_error'));
      } finally {
        setGeocoding(false);
      }
    });
  }

  return (
    <div>
      <div className="px-8 py-6 border-b border-border">
        <h2 className="text-xl font-display font-bold text-foreground">{t('stepLocation.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('stepLocation.subtitle')}
        </p>
      </div>

      <div className="px-8 py-6 space-y-6">
        {canUseMyLocation && (
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
              {locating ? t('stepLocation.detecting') : t('stepLocation.use_my_location')}
            </button>
            {(geo.error || geocodeError) && (
              <p className="text-xs text-red-600">{geo.error ?? geocodeError}</p>
            )}
          </div>
        )}

        <div className="sm:max-w-xs">
          <FieldLabel htmlFor="postcode" hint={t('cep.hint')}>{t('stepLocation.postcode')}</FieldLabel>
          <TextInput
            id="postcode"
            value={form.postcode}
            onChange={e => setVal('postcode', cep.handleCepChange(e.target.value))}
            onBlur={() => setCepTouched(true)}
            placeholder={t('stepLocation.postcode_placeholder')}
            autoComplete="postal-code"
            inputMode="numeric"
            maxLength={9}
          />
          <div className="min-h-5 mt-1.5 text-xs" aria-live="polite">
            {cep.status === 'loading' && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('cep.looking_up')}
              </span>
            )}
            {cep.status === 'filled' && <span className="text-emerald-700">{t('cep.filled')}</span>}
            {cep.status === 'not_found' && <span className="text-muted-foreground">{t('cep.not_found')}</span>}
            {cep.status === 'idle' && cepIncomplete && <span className="text-red-600">{t('cep.invalid')}</span>}
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="address" required>{t('stepLocation.street_address')}</FieldLabel>
          <TextInput
            id="address"
            ref={addressRef}
            value={form.address}
            onChange={e => setVal('address', e.target.value)}
            placeholder={t('stepLocation.address_placeholder')}
            autoComplete="street-address"
            maxLength={300}
          />
        </div>

        <div>
          <FieldLabel htmlFor="suburb" required>{t('stepLocation.suburb')}</FieldLabel>
          <TextInput
            id="suburb"
            value={form.suburb}
            onChange={e => setVal('suburb', e.target.value)}
            placeholder={t('stepLocation.suburb_placeholder')}
            autoComplete="address-level2"
            maxLength={100}
          />
        </div>

        <div>
          <FieldLabel
            htmlFor="locationNote"
            hint={t('stepLocation.notes_hint')}
          >
            {t('stepLocation.notes_label')}
          </FieldLabel>
          <TextArea
            id="locationNote"
            value={form.locationNote}
            onChange={e => setVal('locationNote', e.target.value)}
            placeholder={t('stepLocation.notes_placeholder')}
            rows={3}
            maxLength={1000}
          />
        </div>

        <div>
          <FieldLabel required>{t('stepLocation.site_type')}</FieldLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
            {SITE_TYPES.map(type => (
              <button
                key={type.value}
                type="button"
                onClick={() => setVal('siteType', type.value)}
                className={`px-3 py-2 text-sm border rounded-sm transition-colors text-left ${
                  form.siteType === type.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {t(`siteTypes.${type.key}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-8 py-4 border-t border-border flex items-center justify-between">
        <div />
        <span className="text-xs font-mono text-muted-foreground">{t('common.step_counter', { current: 1, total: 4 })}</span>
        <button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('common.continue')} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
