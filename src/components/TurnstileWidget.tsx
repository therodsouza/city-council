import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { useTranslation } from 'react-i18next';

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      language?: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile unavailable')));
    script.onerror = () => {
      scriptPromise = null; // allow a retry on the next mount
      reject(new Error('Turnstile failed to load'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export interface TurnstileHandle {
  /** Discards the current token and asks the widget for a fresh one. Tokens are single-use. */
  reset: () => void;
}

interface Props {
  siteKey: string;
  /** Called with a fresh token, or null when it expires or the challenge errors. */
  onToken: (token: string | null) => void;
  ref?: Ref<TurnstileHandle>;
}

export function TurnstileWidget({ siteKey, onToken, ref }: Props) {
  const { i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useImperativeHandle(ref, () => ({
    reset: () => {
      onTokenRef.current(null);
      if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
    },
  }), []);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then(api => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: siteKey,
          language: i18n.language === 'pt-BR' ? 'pt-br' : 'en',
          callback: token => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));

    return () => {
      cancelled = true;
      // The old widget's token is no longer backed by a live widget.
      onTokenRef.current(null);
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [siteKey, i18n.language]);

  return <div ref={containerRef} />;
}
