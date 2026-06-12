import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { FormData, Step } from '../types/form';

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

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Low Priority',
  medium: 'Medium Priority',
  high: 'High Priority',
};

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
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
          Edit
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
}

export default function StepReview({ form, setVal, photoUrl, onBack, onSubmit, onEdit, submitError }: Props) {
  return (
    <div>
      <div className="px-8 py-6 border-b border-border">
        <h2 className="text-xl font-display font-bold text-foreground">Review & Submit</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Please review your information carefully before submitting.
        </p>
      </div>

      <div className="px-8 py-6 space-y-4">
        <ReviewSection title="Location" onEdit={() => onEdit(1)}>
          <ReviewRow label="Address" value={form.address} />
          <ReviewRow label="Suburb" value={form.suburb} />
          <ReviewRow label="Postcode" value={form.postcode} />
          <ReviewRow label="Site Type" value={form.siteType} />
          <ReviewRow label="Notes" value={form.locationNote} />
        </ReviewSection>

        <ReviewSection title="Issue Details" onEdit={() => onEdit(2)}>
          <ReviewRow label="Category" value={CATEGORY_LABELS[form.category] ?? form.category} />
          <ReviewRow label="Severity" value={SEVERITY_LABELS[form.severity] ?? form.severity} />
          <ReviewRow label="Description" value={form.description} />
          {photoUrl && <ReviewRow label="Photo" value="Photo attached" />}
        </ReviewSection>

        <ReviewSection title="Your Details" onEdit={() => onEdit(3)}>
          <ReviewRow label="Name" value={form.name} />
          <ReviewRow label="Email" value={form.email} />
          <ReviewRow label="Phone" value={form.phone} />
          <ReviewRow
            label="Updates"
            value={form.receiveUpdates ? 'Email notifications enabled' : 'No notifications'}
          />
        </ReviewSection>

        <label className="flex items-start gap-3 cursor-pointer pt-2">
          <input
            type="checkbox"
            checked={form.agreeTerms}
            onChange={e => setVal('agreeTerms', e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-primary"
          />
          <span className="text-sm text-foreground">
            I confirm the information provided is accurate and agree to the council's{' '}
            <a href="#" className="text-primary hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary hover:underline">
              Privacy Policy
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
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-xs font-mono text-muted-foreground">4 of 4</span>
        <button
          type="button"
          disabled={!form.agreeTerms}
          onClick={onSubmit}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground text-sm font-semibold rounded-sm hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Submit Request <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
