import { useRef, useState } from 'react';
import { CheckCircle2, Loader2, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FieldLabel, TextInput } from './FormFields';
import { TurnstileWidget, type TurnstileHandle } from './TurnstileWidget';
import {
  confirmPhoneCode,
  DEV_VERIFICATION_CODE,
  sendPhoneCode,
} from '../services/PhoneVerificationService';
import { confirmCodeErrorMessage, sendCodeErrorMessage } from '../i18n/errors';
import { looksLikeBrazilianMobile } from '../utils/phone';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

/** Without an API there is nothing to verify against; the services mock the flow instead. */
const MOCK_MODE = !API_URL;

export interface PhoneVerificationResult {
  token: string;
  phone: string;
  /** Epoch ms after which the token must not be used. */
  expiresAt: number;
}

interface Props {
  /** Set once the phone is verified; the token itself is kept by the parent, in memory only. */
  verified: PhoneVerificationResult | null;
  onVerified: (result: PhoneVerificationResult) => void;
  /** Discards the verified number so the person can verify another. */
  onClear: () => void;
}

export function PhoneVerification({ verified, onVerified, onClear }: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<TurnstileHandle>(null);

  const captchaConfigured = !!TURNSTILE_SITE_KEY || MOCK_MODE;
  const captchaReady = MOCK_MODE ? true : !!captchaToken;

  if (verified) {
    return (
      <div className="flex items-start gap-3 p-4 border border-emerald-200 bg-emerald-50 rounded-sm">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-900">{t('anon.verified_title')}</p>
          <p className="text-sm text-emerald-800 break-words">{verified.phone}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-semibold text-primary hover:underline flex-shrink-0"
        >
          {t('anon.change_number')}
        </button>
      </div>
    );
  }

  const handleSend = async () => {
    if (!captchaReady || busy) return;
    setError(null);
    setBusy(true);
    try {
      await sendPhoneCode(phone.trim(), captchaToken ?? '');
      setCode('');
      setPhase('code');
    } catch (e) {
      setError(sendCodeErrorMessage(e, t));
    } finally {
      // Every Turnstile token works once, whether the call succeeded or not.
      widgetRef.current?.reset();
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const result = await confirmPhoneCode(phone.trim(), code);
      onVerified({
        token: result.token,
        phone: phone.trim(),
        expiresAt: Date.now() + result.expiresInSeconds * 1000,
      });
      setPhase('phone');
      setCode('');
    } catch (e) {
      setError(confirmCodeErrorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  // Resending needs a new captcha token, so it goes back through the phone step.
  const handleRestart = () => {
    setError(null);
    setCode('');
    setPhase('phone');
  };

  return (
    <div className="border border-border rounded-sm p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Smartphone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">{t('anon.verify_title')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('anon.verify_desc')}</p>
        </div>
      </div>

      {phase === 'phone' ? (
        <>
          <div>
            <FieldLabel htmlFor="verify-phone" required>{t('anon.phone_label')}</FieldLabel>
            <TextInput
              id="verify-phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder={t('anon.phone_placeholder')}
              autoComplete="tel"
              maxLength={20}
            />
          </div>

          {TURNSTILE_SITE_KEY && <TurnstileWidget ref={widgetRef} siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} />}
          {!captchaConfigured && (
            <p className="text-xs text-red-600" role="alert">{t('anon.err_captcha_unconfigured')}</p>
          )}

          {error && <p className="text-xs text-red-600" role="alert">{error}</p>}

          <button
            type="button"
            disabled={busy || !captchaReady || !looksLikeBrazilianMobile(phone)}
            onClick={handleSend}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? t('anon.sending') : t('anon.send_code')}
          </button>
        </>
      ) : (
        <>
          <div>
            <FieldLabel htmlFor="verify-code" required hint={t('anon.code_hint', { phone: phone.trim() })}>
              {t('anon.code_label')}
            </FieldLabel>
            <TextInput
              id="verify-code"
              inputMode="numeric"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoComplete="one-time-code"
              maxLength={6}
              className="font-mono tracking-widest"
            />
            {MOCK_MODE && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('anon.dev_code_hint', { code: DEV_VERIFICATION_CODE })}
              </p>
            )}
          </div>

          {error && <p className="text-xs text-red-600" role="alert">{error}</p>}

          <div className="flex items-center gap-4 flex-wrap">
            <button
              type="button"
              disabled={busy || code.length !== 6}
              onClick={handleConfirm}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? t('anon.verifying') : t('anon.verify')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleRestart}
              className="text-xs font-semibold text-primary hover:underline disabled:opacity-40"
            >
              {t('anon.resend')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
