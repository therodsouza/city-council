import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

function parseFragmentParams(): URLSearchParams {
  const hash = window.location.hash;
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(fragment);
}

export function AuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { completeImplicitAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const search = new URLSearchParams(window.location.search);
    const oauthError = search.get('error') ?? parseFragmentParams().get('error');
    if (oauthError) {
      setError(t('authCallback.google_returned', { error: oauthError }));
      return;
    }

    const fragment = parseFragmentParams();
    const idToken = fragment.get('id_token');
    const accessToken = fragment.get('access_token');
    const state = fragment.get('state');

    if (!idToken || !accessToken || !state) {
      setError(t('authCallback.missing_tokens'));
      return;
    }

    (async () => {
      try {
        await completeImplicitAuth(idToken, accessToken, state);
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/', { replace: true });
      } catch (e: any) {
        setError(e?.message ?? t('authCallback.auth_failed'));
      }
    })();
  }, [completeImplicitAuth, navigate, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background font-sans px-6">
      <div className="max-w-md w-full text-center">
        {error ? (
          <>
            <h1 className="font-display text-2xl font-semibold mb-3">{t('authCallback.failed_title')}</h1>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-sm font-semibold"
            >
              {t('authCallback.back_to_signin')}
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold mb-3">{t('authCallback.signing_in')}</h1>
            <p className="text-sm text-muted-foreground">{t('authCallback.completing')}</p>
          </>
        )}
      </div>
    </div>
  );
}
