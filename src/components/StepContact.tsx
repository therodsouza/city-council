import { ArrowLeft, ArrowRight, Mail, Phone, Shield } from 'lucide-react';
import { FormData } from '../types/form';
import { FieldLabel, TextInput } from './FormFields';

interface Props {
  form: FormData;
  setVal: (key: keyof FormData, value: string | boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepContact({ form, setVal, onNext, onBack }: Props) {
  const canProceed = !!(
    form.name.trim() &&
    form.email.includes('@') &&
    form.email.includes('.')
  );

  return (
    <div>
      <div className="px-8 py-6 border-b border-border">
        <h2 className="text-xl font-display font-bold text-foreground">Your Details</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Provide your contact information so we can keep you informed about your request.
        </p>
      </div>

      <div className="px-8 py-6 space-y-6">
        <div className="flex items-start gap-3 p-4 border border-border bg-secondary/40 rounded-sm">
          <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Your personal details are collected solely for the purpose of processing this service
            request and will not be shared with third parties without your consent.
          </p>
        </div>

        <div>
          <FieldLabel htmlFor="name" required>Full Name</FieldLabel>
          <TextInput
            id="name"
            value={form.name}
            onChange={e => setVal('name', e.target.value)}
            placeholder="e.g. Sarah Thompson"
            autoComplete="name"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="email" required>Email Address</FieldLabel>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <TextInput
                id="email"
                type="email"
                value={form.email}
                onChange={e => setVal('email', e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="phone">
              Phone Number{' '}
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </FieldLabel>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <TextInput
                id="phone"
                type="tel"
                value={form.phone}
                onChange={e => setVal('phone', e.target.value)}
                placeholder="e.g. 0412 345 678"
                autoComplete="tel"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.receiveUpdates}
            onChange={e => setVal('receiveUpdates', e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-primary"
          />
          <div>
            <span className="text-sm font-semibold text-foreground">
              Receive status updates by email
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              We will notify you when your request is assessed and resolved.
            </p>
          </div>
        </label>
      </div>

      <div className="px-8 py-4 border-t border-border flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 border border-border bg-white text-foreground text-sm font-semibold rounded-sm hover:border-primary/40 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-xs font-mono text-muted-foreground">3 of 4</span>
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
