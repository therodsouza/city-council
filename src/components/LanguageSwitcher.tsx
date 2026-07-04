import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';

/**
 * Fixed language toggle rendered at the App level so it is always visible
 * regardless of which screen is active. `changeLanguage` persists the choice
 * to localStorage and re-renders every component using `useTranslation`.
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const active = i18n.language?.startsWith('pt') ? 'pt-BR' : 'en';

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-sm border border-border bg-card/95 p-1 shadow-md backdrop-blur-sm"
      role="group"
      aria-label={t('language.label')}
    >
      <Languages className="w-3.5 h-3.5 text-muted-foreground mx-1 flex-shrink-0" />
      {SUPPORTED_LANGUAGES.map((lng) => {
        const isActive = lng === active;
        return (
          <button
            key={lng}
            type="button"
            onClick={() => i18n.changeLanguage(lng)}
            aria-pressed={isActive}
            title={t(`language.${lng}_full`)}
            className={`px-2 py-1 rounded-sm text-xs font-mono font-semibold transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            {t(`language.${lng}`)}
          </button>
        );
      })}
    </div>
  );
}
