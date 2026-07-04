import { Wrench, Map } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User } from '../contexts/AuthContext';
import { dateLocale } from '../i18n/labels';

interface Props {
  user: User | null;
  onProfileClick: () => void;
  onTrackClick?: () => void;
  onMapClick?: () => void;
  adminLabel?: boolean;
}

export function SiteHeader({ user, onProfileClick, onTrackClick, onMapClick, adminLabel }: Props) {
  const { t, i18n } = useTranslation();
  const date = new Date().toLocaleDateString(dateLocale(i18n.language), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="bg-primary text-primary-foreground py-4">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent flex items-center justify-center flex-shrink-0">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xs font-mono uppercase tracking-widest opacity-50">
              {t('brand.council')}
            </div>
            <div className="text-lg font-display font-semibold">
              {t('brand.department')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-mono uppercase tracking-wide opacity-70">
              {adminLabel ? t('header.admin_console') : t('header.online_services')}
            </div>
            <div className="text-sm opacity-90">{date}</div>
          </div>
          {onTrackClick && (
            <button
              type="button"
              onClick={onTrackClick}
              className="inline-flex px-3 py-2.5 rounded-sm bg-primary-foreground/10 hover:bg-primary-foreground/20 border border-primary-foreground/20 text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              {t('header.track_requests')}
            </button>
          )}
          {onMapClick && (
            <button
              type="button"
              onClick={onMapClick}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-sm bg-accent/80 hover:bg-accent transition-colors border border-accent text-sm text-white"
              title={t('header.request_map_title')}
            >
              <Map className="w-4 h-4" />
              {t('header.request_map')}
            </button>
          )}
          {user && (
            <button
              type="button"
              onClick={onProfileClick}
              className="flex items-center gap-2 px-3 py-2 rounded-sm bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors border border-primary-foreground/20"
              title={t('header.view_profile_title')}
              aria-label={t('header.view_profile_aria')}
            >
              <img
                src={user.photo}
                alt={user.name}
                className="w-7 h-7 rounded-sm border border-primary-foreground/30"
              />
              <span className="hidden md:block text-sm text-primary-foreground font-medium">
                {user.name.split(' ')[0]}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
