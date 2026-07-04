import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FormData } from '../types/form';
import { categoryLabel, severityPriorityLabel, siteTypeLabel } from '../i18n/labels';

const SEVERITY_DOTS: Record<string, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
};

interface Props {
  form: FormData;
  refNum: string;
  onReset: () => void;
  onTrackClick: () => void;
}

export default function SuccessScreen({ form, refNum, onReset, onTrackClick }: Props) {
  const { t } = useTranslation();
  const timeline = [
    {
      n: 1,
      title: t('success.timeline1_title'),
      desc: t('success.timeline1_desc'),
    },
    {
      n: 2,
      title: t('success.timeline2_title'),
      desc: t('success.timeline2_desc'),
    },
    {
      n: 3,
      title: t('success.timeline3_title'),
      desc: form.receiveUpdates
        ? t('success.timeline3_desc_updates', { email: form.email })
        : t('success.timeline3_desc_no_updates'),
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-3xl font-display font-bold text-foreground mb-3">
        {t('success.title')}
      </h1>
      <p className="text-muted-foreground mb-8">
        {t('success.subtitle')}
      </p>

      <div className="bg-card border border-border rounded-sm p-6 mb-8 text-left">
        <div className="text-center mb-6">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            {t('success.reference_number')}
          </div>
          <div className="text-3xl font-mono font-bold text-primary tracking-wider">{refNum}</div>
          <p className="text-xs text-muted-foreground mt-1">{t('success.save_number')}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
              {t('success.location')}
            </div>
            <div className="text-sm font-semibold">{form.address}</div>
            <div className="text-sm text-muted-foreground">
              {form.suburb}
              {form.postcode ? ` ${form.postcode}` : ''}
            </div>
            <div className="text-sm text-muted-foreground">{siteTypeLabel(form.siteType, t)}</div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
              {t('success.issue')}
            </div>
            <div className="text-sm font-semibold">
              {categoryLabel(form.category, t)}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  SEVERITY_DOTS[form.severity] ?? 'bg-muted'
                }`}
              />
              <span className="text-sm text-muted-foreground">
                {severityPriorityLabel(form.severity, t)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-left mb-8">
        <h3 className="text-base font-display font-bold text-foreground mb-4">
          {t('success.what_next')}
        </h3>
        <div className="space-y-4">
          {timeline.map(item => (
            <div key={item.n} className="flex gap-4">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-mono font-bold text-primary">
                {item.n}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{item.title}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          type="button"
          onClick={onReset}
          className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-sm hover:bg-primary/90 transition-colors"
        >
          {t('success.submit_another')}
        </button>
        <button
          type="button"
          onClick={onTrackClick}
          className="px-6 py-2.5 border border-border rounded-sm text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
        >
          {t('success.track')}
        </button>
      </div>
    </div>
  );
}
