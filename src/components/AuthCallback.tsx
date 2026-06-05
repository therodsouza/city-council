import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function parseFragmentParams(): URLSearchParams {
  const hash = window.location.hash;
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(fragment);
}

export function AuthCallback() {
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
      setError(`Google returned: ${oauthError}`);
      return;
    }

    const fragment = parseFragmentParams();
    const idToken = fragment.get('id_token');
    const accessToken = fragment.get('access_token');
    const state = fragment.get('state');

    if (!idToken || !accessToken || !state) {
      setError('Missing tokens in callback URL.');
      return;
    }

    (async () => {
      try {
        await completeImplicitAuth(idToken, accessToken, state);
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/', { replace: true });
      } catch (e: any) {
        setError(e?.message ?? 'Authentication failed.');
      }
    })();
  }, [completeImplicitAuth, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background font-sans px-6">
      <div className="max-w-md w-full text-center">
        {error ? (
          <>
            <h1 className="font-display text-2xl font-semibold mb-3">Sign-in failed</h1>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-sm font-semibold"
            >
              Back to sign-in
            </button>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold mb-3">Signing you in…</h1>
            <p className="text-sm text-muted-foreground">Completing authentication, one moment.</p>
          </>
        )}
      </div>
    </div>
  );
}
