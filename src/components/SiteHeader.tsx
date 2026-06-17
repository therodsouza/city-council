import { Wrench } from 'lucide-react';
import { User } from '../contexts/AuthContext';

interface Props {
  user: User | null;
  onProfileClick: () => void;
  onTrackClick?: () => void;
}

export function SiteHeader({ user, onProfileClick, onTrackClick }: Props) {
  const date = new Date().toLocaleDateString('en-AU', {
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
              City Council
            </div>
            <div className="text-lg font-display font-semibold">
              Public Works & Infrastructure
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-mono uppercase tracking-wide opacity-70">
              Online Services
            </div>
            <div className="text-sm opacity-90">{date}</div>
          </div>
          {onTrackClick && (
            <button
              type="button"
              onClick={onTrackClick}
              className="inline-flex px-3 py-2.5 rounded-sm bg-primary-foreground/10 hover:bg-primary-foreground/20 border border-primary-foreground/20 text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              Track Requests
            </button>
          )}
          {user && (
            <button
              type="button"
              onClick={onProfileClick}
              className="flex items-center gap-2 px-3 py-2 rounded-sm bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors border border-primary-foreground/20"
              title="View Profile"
              aria-label="View your profile"
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
