import React from 'react';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FormData, Step } from '../types/form';
import { categoryLabel, siteTypeLabel } from '../i18n/labels';

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="border border-border rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          {title}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-semibold text-primary hover:underline"
        >
          {t('stepReview.edit')}
        </button>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <span className="text-xs text-muted-foreground w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-semibold text-foreground text-right">{value}</span>
    </div>
  );
}

interface Props {
  form: FormData;
  setVal: (key: keyof FormData, value: string | boolean) => void;
  photoUrl: string;
  onBack: () => void;
  onSubmit: () => void;
  onEdit: (s: Step) => void;
  submitError?: string | null;
  isSubmitting?: boolean;
  /** Guests: updates are not offered and the phone verification card is shown before the terms. */
  isGuest?: boolean;
  guestVerification?: React.ReactNode;
  submitBlocked?: boolean;
}

export default function StepReview({ form, setVal, photoUrl, onBack, onSubmit, onEdit, submitError, isSubmitting, isGuest = false, guestVerification, submitBlocked = false }: Props) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="px-8 py-6 border-b border-border">
        <h2 className="text-xl font-display font-bold text-foreground">{t('stepReview.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('stepReview.subtitle')}
        </p>
      </div>

      <div className="px-8 py-6 space-y-4">
        <ReviewSection title={t('stepReview.section_location')} onEdit={() => onEdit(1)}>
          <ReviewRow label={t('stepReview.row_address')} value={form.address} />
          <ReviewRow label={t('stepReview.row_suburb')} value={form.suburb} />
          <ReviewRow label={t('stepReview.row_postcode')} value={form.postcode} />
          <ReviewRow label={t('stepReview.row_site_type')} value={siteTypeLabel(form.siteType, t)} />
          <ReviewRow label={t('stepReview.row_notes')} value={form.locationNote} />
        </ReviewSection>

        <ReviewSection title={t('stepReview.section_issue')} onEdit={() => onEdit(2)}>
          <ReviewRow label={t('stepReview.row_category')} value={categoryLabel(form.category, t)} />
          <ReviewRow label={t('stepReview.row_description')} value={form.description} />
          {photoUrl && <ReviewRow label={t('stepReview.row_photo')} value={t('stepReview.photo_attached')} />}
        </ReviewSection>

        <ReviewSection title={t('stepReview.section_contact')} onEdit={() => onEdit(3)}>
          <ReviewRow label={t('stepReview.row_name')} value={form.name} />
          <ReviewRow label={t('stepReview.row_email')} value={form.email} />
          <ReviewRow label={t('stepReview.row_phone')} value={form.phone} />
          {(!isGuest || form.email.trim()) && (
            <ReviewRow
              label={t('stepReview.row_updates')}
              value={form.receiveUpdates ? t('stepReview.updates_on') : t('stepReview.updates_off')}
            />
          )}
        </ReviewSection>

        {guestVerification}

        <label className="flex items-start gap-3 cursor-pointer pt-2">
          <input
            type="checkbox"
            checked={form.agreeTerms}
            onChange={e => setVal('agreeTerms', e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-primary"
          />
          <span className="text-sm text-foreground">
            {t('stepReview.agree_prefix')}{' '}
            <a href="#" className="text-primary hover:underline">
              {t('footer.terms')}
            </a>{' '}
            {t('common.and')}{' '}
            <a href="#" className="text-primary hover:underline">
              {t('footer.privacy')}
            </a>
            .
          </span>
        </label>
      </div>

      {submitError && (
        <div className="mx-8 mb-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-sm text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="px-8 py-4 border-t border-border flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 border border-border bg-white text-foreground text-sm font-semibold rounded-sm hover:border-primary/40 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </button>
        <span className="text-xs font-mono text-muted-foreground">{t('common.step_counter', { current: 4, total: 4 })}</span>
        <button
          type="button"
          disabled={!form.agreeTerms || isSubmitting || submitBlocked}
          onClick={onSubmit}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground text-sm font-semibold rounded-sm hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.submitting')}</>
          ) : (
            <>{t('stepReview.submit')} <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
