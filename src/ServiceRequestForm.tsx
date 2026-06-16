import { useState } from 'react';
import { FormData, Step } from './types/form';
import { User } from './contexts/AuthContext';
import { SiteHeader } from './components/SiteHeader';
import Sidebar from './components/Sidebar';
import StepLocation from './components/StepLocation';
import StepIssue from './components/StepIssue';
import StepContact from './components/StepContact';
import StepReview from './components/StepReview';
import SuccessScreen from './components/SuccessScreen';
import { buildServiceRequestPayload, submitServiceRequest } from './services/ServiceRequestService';

interface Props {
  user: User | null;
  onProfileClick: () => void;
  onTrackClick: () => void;
}

const EMPTY_FORM: Omit<FormData, 'name' | 'email'> = {
  address: '',
  suburb: '',
  postcode: '',
  locationNote: '',
  siteType: '',
  category: '',
  severity: '',
  description: '',
  phone: '',
  receiveUpdates: true,
  agreeTerms: false,
};

export function ServiceRequestForm({ user, onProfileClick, onTrackClick }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [form, setForm] = useState<FormData>({
    ...EMPTY_FORM,
    name: user?.name || '',
    email: user?.email || '',
  });
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const setVal = (key: keyof FormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const setCoords = (lat: number, lng: number) => {
    setForm(prev => ({ ...prev, lat, lng }));
  };

  const handleReset = () => {
    setForm({ ...EMPTY_FORM, name: user?.name || '', email: user?.email || '' });
    setPhotoUrl('');
    setPhotoFile(null);
    setStep(1);
    setSubmitted(false);
    setSubmitError(null);
    setReferenceNumber('');
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <SiteHeader user={user} onProfileClick={onProfileClick} onTrackClick={onTrackClick} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {submitted ? (
          <SuccessScreen form={form} refNum={referenceNumber} onReset={handleReset} onTrackClick={onTrackClick} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[272px_1fr] gap-8">
            <aside className="lg:sticky lg:top-8 self-start">
              <Sidebar step={step} onStepClick={setStep} />
            </aside>
            <div className="bg-card border border-border rounded-sm">
              {step === 1 && (
                <StepLocation form={form} setVal={setVal} setCoords={setCoords} onNext={() => setStep(2)} />
              )}
              {step === 2 && (
                <StepIssue
                  form={form}
                  setVal={setVal}
                  photoUrl={photoUrl}
                  setPhotoUrl={setPhotoUrl}
                  setPhotoFile={setPhotoFile}
                  onNext={() => setStep(3)}
                  onBack={() => setStep(1)}
                />
              )}
              {step === 3 && (
                <StepContact
                  form={form}
                  setVal={setVal}
                  onNext={() => setStep(4)}
                  onBack={() => setStep(2)}
                />
              )}
              {step === 4 && (
                <StepReview
                  form={form}
                  setVal={setVal}
                  photoUrl={photoUrl}
                  onBack={() => setStep(3)}
                  onSubmit={async () => {
                    setSubmitError(null);
                    try {
                      const payload = buildServiceRequestPayload(form);
                      const refNum = await submitServiceRequest(payload, photoFile);
                      setReferenceNumber(refNum);
                      setSubmitted(true);
                    } catch (e: unknown) {
                      setSubmitError(e instanceof Error ? e.message : 'Submission failed. Please try again.');
                    }
                  }}
                  onEdit={setStep}
                  submitError={submitError}
                />
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span className="font-mono">
            © {new Date().getFullYear()} City Council. All rights reserved.
          </span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Accessibility</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
