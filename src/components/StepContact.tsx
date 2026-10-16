import { ArrowLeft, ArrowRight, Mail, Phone, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FormData } from '../types/form';
import { FieldLabel, TextInput } from './FormFields';
import { guestVerificationChannel } from '../config/features';

interface Props {
  form: FormData;
  setVal: (key: keyof FormData, value: string | boolean) => void;
  /** Guests have no account: email is optional and email updates are not offered. */
  isGuest?: boolean;
  onNext: () => void;
  onBack: () => void;
}

export default function StepContact({ form, setVal, isGuest = false, onNext, onBack }: Props) {
  const { t } = useTranslation();
  const emailLooksValid = form.email.includes('@') && form.email.includes('.');
  const canProceed = !!(
    form.name.trim() &&
    (emailLooksValid || (isGuest && !form.email.trim()))
  );

  return (
    <div>
      <div className="px-8 py-6 border-b border-border">
        <h2 className="text-xl font-display font-bold text-foreground">{t('stepContact.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('stepContact.subtitle')}
        </p>
      </div>

      <div className="px-8 py-6 space-y-6">
        <div className="flex items-start gap-3 p-4 border border-border bg-secondary/40 rounded-sm">
          <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            {isGuest ? t(`stepContact.privacy_guest_${guestVerificationChannel}`) : t('stepContact.privacy')}
          </p>
        </div>

        <div>
          <FieldLabel htmlFor="name" required>{t('stepContact.full_name')}</FieldLabel>
          <TextInput
            id="name"
            value={form.name}
            onChange={e => setVal('name', e.target.value)}
            placeholder={t('stepContact.name_placeholder')}
            autoComplete="name"
            maxLength={200}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="email" required={!isGuest}>
              {t('stepContact.email')}
              {isGuest && (
                <>{' '}<span className="text-xs font-normal text-muted-foreground">{t('stepContact.optional')}</span></>
              )}
            </FieldLabel>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <TextInput
                id="email"
                type="email"
                value={form.email}
                onChange={e => setVal('email', e.target.value)}
                placeholder={t('stepContact.email_placeholder')}
                autoComplete="email"
                maxLength={254}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="phone">
              {t('stepContact.phone')}{' '}
              <span className="text-xs font-normal text-muted-foreground">{t('stepContact.optional')}</span>
            </FieldLabel>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <TextInput
                id="phone"
                type="tel"
                value={form.phone}
                onChange={e => setVal('phone', e.target.value)}
                placeholder={t('stepContact.phone_placeholder')}
                autoComplete="tel"
                maxLength={30}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {(!isGuest || form.email.trim()) && (
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.receiveUpdates}
              onChange={e => setVal('receiveUpdates', e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-primary"
            />
            <div>
              <span className="text-sm font-semibold text-foreground">
                {t('stepContact.updates_label')}
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('stepContact.updates_sub')}
              </p>
            </div>
          </label>
        )}
      </div>

      <div className="px-8 py-4 border-t border-border flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 border border-border bg-white text-foreground text-sm font-semibold rounded-sm hover:border-primary/40 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </button>
        <span className="text-xs font-mono text-muted-foreground">{t('common.step_counter', { current: 3, total: 4 })}</span>
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
