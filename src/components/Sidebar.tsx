import { MapPin, AlertTriangle, User, FileText, Check, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Step } from '../types/form';

interface SidebarProps {
  step: Step;
  onStepClick: (s: Step) => void;
}

export default function Sidebar({ step, onStepClick }: SidebarProps) {
  const { t } = useTranslation();
  const STEPS = [
    { number: 1 as Step, label: t('sidebar.step1'), icon: MapPin },
    { number: 2 as Step, label: t('sidebar.step2'), icon: AlertTriangle },
    { number: 3 as Step, label: t('sidebar.step3'), icon: User },
    { number: 4 as Step, label: t('sidebar.step4'), icon: FileText },
  ];
  return (
    <div>
      <nav>
        {STEPS.map((s, i) => {
          const isActive = s.number === step;
          const isCompleted = s.number < step;
          const isIdle = s.number > step;
          const Icon = s.icon;

          return (
            <div key={s.number} className="relative">
              {i < STEPS.length - 1 && (
                <div className="absolute left-[1.375rem] top-[2.75rem] h-[1.25rem] w-px bg-border z-0" />
              )}
              <button
                type="button"
                disabled={isIdle}
                onClick={() => isCompleted && onStepClick(s.number)}
                className={`relative z-10 flex items-center gap-3 w-full px-3 py-2.5 rounded-sm text-left transition-colors ${
                  isActive ? 'bg-primary/8' : ''
                } ${isCompleted ? 'cursor-pointer hover:bg-primary/5' : ''} ${
                  isIdle ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <div
                  className={`flex-shrink-0 w-[1.375rem] h-[1.375rem] flex items-center justify-center rounded-sm ${
                    isActive
                      ? 'bg-primary text-white'
                      : isCompleted
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                    {t('sidebar.step_num', { number: s.number })}
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      isActive
                        ? 'text-primary'
                        : isCompleted
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {s.label}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </nav>

      <div className="mt-6 border border-border rounded-sm bg-card p-4">
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
          {t('sidebar.need_help')}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {t('sidebar.urgent')}
        </p>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-primary" />
          <span className="text-base font-semibold text-foreground">156</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">{t('sidebar.available')}</div>
      </div>
    </div>
  );
}
