import { CheckCircle2 } from 'lucide-react';
import { FormData } from '../types/form';

const CATEGORY_LABELS: Record<string, string> = {
  pothole: 'Pothole / Road Damage',
  graffiti: 'Graffiti / Vandalism',
  broken: 'Broken Equipment',
  flooding: 'Flooding / Water Damage',
  lighting: 'Street Light Outage',
  trees: 'Fallen Tree / Branch',
  dumping: 'Illegal Dumping / Litter',
  other: 'Other Infrastructure',
};

const SEVERITY_DOTS: Record<string, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-red-500',
};

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Low Priority',
  medium: 'Medium Priority',
  high: 'High Priority',
};

interface Props {
  form: FormData;
  refNum: string;
  onReset: () => void;
}

export default function SuccessScreen({ form, refNum, onReset }: Props) {
  const timeline = [
    {
      n: 1,
      title: 'Assessment — 1 to 3 business days',
      desc: 'Our team will review your report and categorise the work required.',
    },
    {
      n: 2,
      title: 'Scheduling & Planning',
      desc: 'A work order is assigned to the relevant team and scheduled appropriately.',
    },
    {
      n: 3,
      title: 'Resolution & Notification',
      desc: form.receiveUpdates
        ? `We will email ${form.email} when the issue has been resolved.`
        : 'The issue will be resolved and the site restored to safe condition.',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-3xl font-display font-bold text-foreground mb-3">
        Request Submitted
      </h1>
      <p className="text-muted-foreground mb-8">
        Your service request has been received and logged in our system.
      </p>

      <div className="bg-card border border-border rounded-sm p-6 mb-8 text-left">
        <div className="text-center mb-6">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            Reference Number
          </div>
          <div className="text-3xl font-mono font-bold text-primary tracking-wider">{refNum}</div>
          <p className="text-xs text-muted-foreground mt-1">Save this number for future reference</p>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Location
            </div>
            <div className="text-sm font-semibold">{form.address}</div>
            <div className="text-sm text-muted-foreground">
              {form.suburb}
              {form.postcode ? ` ${form.postcode}` : ''}
            </div>
            <div className="text-sm text-muted-foreground">{form.siteType}</div>
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Issue
            </div>
            <div className="text-sm font-semibold">
              {CATEGORY_LABELS[form.category] ?? form.category}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  SEVERITY_DOTS[form.severity] ?? 'bg-muted'
                }`}
              />
              <span className="text-sm text-muted-foreground">
                {SEVERITY_LABELS[form.severity] ?? form.severity}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="text-left mb-8">
        <h3 className="text-base font-display font-bold text-foreground mb-4">
          What happens next?
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
          Submit Another Request
        </button>
        <button
          type="button"
          className="px-6 py-2.5 border border-border bg-white text-foreground text-sm font-semibold rounded-sm hover:border-primary/40 transition-colors"
        >
          Return to Council Website
        </button>
      </div>
    </div>
  );
}
