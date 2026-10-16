import { useRef, useState } from 'react';
import { CheckCircle2, Loader2, Mail, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FieldLabel, TextInput } from './FormFields';
import { TurnstileWidget, type TurnstileHandle } from './TurnstileWidget';
import {
  confirmPhoneCode,
  DEV_VERIFICATION_CODE,
  sendPhoneCode,
  type PhoneVerification,
} from '../services/PhoneVerificationService';
import { confirmEmailCode, sendEmailCode } from '../services/EmailVerificationService';
import { confirmCodeErrorMessage, sendCodeErrorMessage } from '../i18n/errors';
import { looksLikeBrazilianMobile } from '../utils/phone';
import { looksLikeEmail } from '../utils/email';
import type { GuestVerificationChannel } from '../config/features';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

/** Without an API there is nothing to verify against; the services mock the flow instead. */
const MOCK_MODE = !API_URL;

export interface VerificationResult {
  token: string;
  channel: GuestVerificationChannel;
  /** The phone number or email address that was verified. */
  contact: string;
  /** Epoch ms after which the token must not be used. */
  expiresAt: number;
}

/** Everything that differs between the channels; the send/confirm flow around it is shared. */
interface ChannelConfig {
  icon: typeof Smartphone;
  inputType: 'tel' | 'email';
  inputMode: 'tel' | 'email';
  autoComplete: string;
  maxLength: number;
  isValid: (contact: string) => boolean;
  send: (contact: string, captchaToken: string, locale: string) => Promise<void>;
  confirm: (contact: string, code: string) => Promise<PhoneVerification>;
}

const CHANNELS: Record<GuestVerificationChannel, ChannelConfig> = {
  sms: {
    icon: Smartphone,
    inputType: 'tel',
    inputMode: 'tel',
    autoComplete: 'tel',
    maxLength: 20,
    isValid: looksLikeBrazilianMobile,
    send: (contact, captchaToken) => sendPhoneCode(contact, captchaToken),
    confirm: confirmPhoneCode,
  },
  email: {
    icon: Mail,
    inputType: 'email',
    inputMode: 'email',
    autoComplete: 'email',
    maxLength: 254,
    isValid: looksLikeEmail,
    send: sendEmailCode,
    confirm: confirmEmailCode,
  },
};

interface Props {
  channel: GuestVerificationChannel;
  /** Set once the contact is verified; the token itself is kept by the parent, in memory only. */
  verified: VerificationResult | null;
  onVerified: (result: VerificationResult) => void;
  /** Discards the verified contact so the person can verify another. */
  onClear: () => void;
}

export function GuestVerification({ channel, verified, onVerified, onClear }: Props) {
  const { t, i18n } = useTranslation();
  const config = CHANNELS[channel];
  const Icon = config.icon;
  const [phase, setPhase] = useState<'contact' | 'code'>('contact');
  const [contact, setContact] = useState('');
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
          <p className="text-sm font-semibold text-emerald-900">{t(`anon.${channel}.verified_title`)}</p>
          <p className="text-sm text-emerald-800 break-words">{verified.contact}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-semibold text-primary hover:underline flex-shrink-0"
        >
          {t(`anon.${channel}.change`)}
        </button>
      </div>
    );
  }

  const handleSend = async () => {
    if (!captchaReady || busy) return;
    setError(null);
    setBusy(true);
    try {
      await config.send(contact.trim(), captchaToken ?? '', i18n.language);
      setCode('');
      setPhase('code');
    } catch (e) {
      setError(sendCodeErrorMessage(e, t, channel));
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
      const result = await config.confirm(contact.trim(), code);
      onVerified({
        token: result.token,
        channel,
        contact: contact.trim(),
        expiresAt: Date.now() + result.expiresInSeconds * 1000,
      });
      setPhase('contact');
      setCode('');
    } catch (e) {
      setError(confirmCodeErrorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  // Resending needs a new captcha token, so it goes back through the contact step.
  const handleRestart = () => {
    setError(null);
    setCode('');
    setPhase('contact');
  };

  return (
    <div className="border border-border rounded-sm p-4 space-y-4">
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">{t(`anon.${channel}.verify_title`)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t(`anon.${channel}.verify_desc`)}</p>
        </div>
      </div>

      {phase === 'contact' ? (
        <>
          <div>
            <FieldLabel htmlFor="verify-contact" required>{t(`anon.${channel}.contact_label`)}</FieldLabel>
            <TextInput
              id="verify-contact"
              type={config.inputType}
              inputMode={config.inputMode}
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder={t(`anon.${channel}.contact_placeholder`)}
              autoComplete={config.autoComplete}
              maxLength={config.maxLength}
            />
          </div>

          {TURNSTILE_SITE_KEY && <TurnstileWidget ref={widgetRef} siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} />}
          {!captchaConfigured && (
            <p className="text-xs text-red-600" role="alert">{t('anon.err_captcha_unconfigured')}</p>
          )}

          {error && <p className="text-xs text-red-600" role="alert">{error}</p>}

          <button
            type="button"
            disabled={busy || !captchaReady || !config.isValid(contact)}
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
            <FieldLabel htmlFor="verify-code" required hint={t(`anon.${channel}.code_hint`, { contact: contact.trim() })}>
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
              {t(`anon.${channel}.resend`)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
