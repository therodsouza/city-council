import { useState } from 'react';
import {
  Wrench, Calendar, MapPin, User, ChevronRight, AlertCircle, Shield, Check, Phone,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfile } from '../contexts/AuthContext';
import { putUserProfile } from '../services/UserService';
import { GENDER_OPTIONS } from '../i18n/labels';

interface FieldError {
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: string;
  suburb?: string;
  postcode?: string;
}

const inputBase =
  'w-full px-3 py-2.5 border rounded-sm bg-white text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors';

function fieldClass(error?: string) {
  return error
    ? `${inputBase} border-destructive ring-destructive/20 focus:border-destructive`
    : `${inputBase} border-border`;
}

function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </label>
      {hint && (
        <p className="text-xs text-muted-foreground/70 mb-1.5">{hint}</p>
      )}
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive mt-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function validate(form: UserProfile, t: TFunction): FieldError {
  const errors: FieldError = {};
  const today = new Date();

  if (!form.dateOfBirth) {
    errors.dateOfBirth = t('onboarding.err_dob_required');
  } else {
    const dob = new Date(form.dateOfBirth);
    const age =
      today.getFullYear() -
      dob.getFullYear() -
      (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
    if (age < 16) errors.dateOfBirth = t('onboarding.err_dob_min');
    else if (age > 120) errors.dateOfBirth = t('onboarding.err_dob_valid');
  }

  if (!form.gender) errors.gender = t('onboarding.err_gender');
  if (!form.phone.trim()) errors.phone = t('onboarding.err_phone');
  if (!form.address.trim()) errors.address = t('onboarding.err_address');
  if (!form.suburb.trim()) errors.suburb = t('onboarding.err_suburb');
  if (form.postcode && !/^\d{4}$/.test(form.postcode))
    errors.postcode = t('onboarding.err_postcode');

  return errors;
}

export function OnboardingForm() {
  const { t } = useTranslation();
  const { user, completeProfile } = useAuth();
  const [form, setForm] = useState<UserProfile>({
    dateOfBirth: '',
    gender: '',
    phone: '',
    address: '',
    suburb: '',
    postcode: '',
  });
  const [errors, setErrors] = useState<FieldError>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const set = (field: keyof UserProfile) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form, t);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setApiError(null);
    try {
      await putUserProfile(user?.name ?? '', form);
      setSubmitted(true);
      setTimeout(() => completeProfile(form), 800);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : t('onboarding.err_api_generic'));
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent flex items-center justify-center flex-shrink-0">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-widest opacity-50">{t('brand.council')}</div>
              <div className="text-lg font-display font-semibold">{t('brand.department')}</div>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              {user.photo && (
                <img src={user.photo} alt={user.name} className="w-8 h-8 rounded-full" />
              )}
              <span className="text-sm text-primary-foreground/80 hidden sm:inline">{user.name}</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-10">
        {/* Page heading */}
        <div className="mb-6">
          <p className="text-xs font-mono uppercase tracking-widest text-accent mb-2">{t('onboarding.new_account')}</p>
          <h1 className="font-display text-3xl font-bold text-foreground">{t('onboarding.title')}</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {t('onboarding.subtitle')}
          </p>
        </div>

        {/* Progress breadcrumb */}
        <div className="flex items-center gap-2 mb-8">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-mono text-muted-foreground">{t('onboarding.step_google')}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-white font-bold">2</span>
            </div>
            <span className="text-xs font-mono font-medium text-foreground">{t('onboarding.step_profile')}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full border border-border bg-card flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-muted-foreground">3</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{t('onboarding.step_portal')}</span>
          </div>
        </div>

        {submitted ? (
          <div className="bg-card border border-border rounded-sm p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4 text-2xl">
              ✓
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">{t('onboarding.complete_title')}</h2>
            <p className="text-sm text-muted-foreground">{t('onboarding.complete_sub')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="bg-card border border-border rounded-sm overflow-hidden">
              {/* Section 1 — Personal Information */}
              <div className="border-b border-border">
                <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/10">
                  <User className="w-4 h-4 text-primary/60" />
                  <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    {t('onboarding.section_personal')}
                  </span>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <Field label={t('onboarding.label_dob')} required error={errors.dateOfBirth}>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                      <input
                        type="date"
                        value={form.dateOfBirth}
                        onChange={set('dateOfBirth')}
                        className={`${fieldClass(errors.dateOfBirth)} pl-9`}
                      />
                    </div>
                  </Field>

                  <Field label={t('onboarding.label_gender')} required error={errors.gender}>
                    <select
                      value={form.gender}
                      onChange={set('gender')}
                      className={fieldClass(errors.gender)}
                    >
                      <option value="">{t('onboarding.select_placeholder')}</option>
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{t(`gender.${opt.key}`)}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label={t('onboarding.label_phone')} required error={errors.phone}>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                      <input
                        type="tel"
                        placeholder={t('onboarding.phone_placeholder')}
                        value={form.phone}
                        onChange={set('phone')}
                        className={`${fieldClass(errors.phone)} pl-9`}
                      />
                    </div>
                  </Field>
                </div>
              </div>

              {/* Section 2 — Residential Address */}
              <div>
                <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/10">
                  <MapPin className="w-4 h-4 text-primary/60" />
                  <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    {t('onboarding.section_address')}
                  </span>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <Field label={t('onboarding.label_address')} required error={errors.address}>
                    <input
                      type="text"
                      placeholder={t('onboarding.address_placeholder')}
                      value={form.address}
                      onChange={set('address')}
                      className={fieldClass(errors.address)}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label={t('onboarding.label_suburb')} required error={errors.suburb}>
                      <input
                        type="text"
                        placeholder={t('onboarding.suburb_placeholder')}
                        value={form.suburb}
                        onChange={set('suburb')}
                        className={fieldClass(errors.suburb)}
                      />
                    </Field>
                    <Field label={t('onboarding.label_postcode')} hint={t('onboarding.postcode_hint')} error={errors.postcode}>
                      <input
                        type="text"
                        placeholder={t('onboarding.postcode_placeholder')}
                        maxLength={4}
                        value={form.postcode}
                        onChange={set('postcode')}
                        className={fieldClass(errors.postcode)}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy note */}
            <p className="flex items-start gap-2 text-xs text-muted-foreground/70 font-mono leading-relaxed mt-4 mb-4">
              <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {t('onboarding.privacy_note')}
            </p>

            {/* API error */}
            {apiError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-sm px-4 py-3 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {apiError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-primary text-primary-foreground text-sm font-semibold rounded-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? t('onboarding.saving') : t('onboarding.submit')}
              {!submitting && <ChevronRight className="w-4 h-4" />}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
