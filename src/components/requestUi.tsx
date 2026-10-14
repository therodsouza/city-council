import {
  HardHat, Paintbrush, Wrench, Droplets, Zap, Leaf, Trash2, Building2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { statusLabel } from '../i18n/labels';

/** Shared look-up tables and small pieces for screens that show service requests. */

export type Status = 'received' | 'under_review' | 'in_progress' | 'resolved' | 'closed';

export const STATUS_ORDER: Status[] = ['received', 'under_review', 'in_progress', 'resolved', 'closed'];

export const STATUS_CONFIG: Record<Status, {
  dot: string;
  pill: string;
  text: string;
  pin: string;
  hex: string;
}> = {
  received:     { dot: 'bg-sky-400',     pill: 'bg-sky-50 border border-sky-200',          text: 'text-sky-800',     pin: 'bg-sky-500',     hex: '#38bdf8' },
  under_review: { dot: 'bg-violet-400',  pill: 'bg-violet-50 border border-violet-200',    text: 'text-violet-800',  pin: 'bg-violet-500',  hex: '#a78bfa' },
  in_progress:  { dot: 'bg-amber-400',   pill: 'bg-amber-50 border border-amber-200',      text: 'text-amber-800',   pin: 'bg-amber-500',   hex: '#fbbf24' },
  resolved:     { dot: 'bg-emerald-500', pill: 'bg-emerald-50 border border-emerald-200',  text: 'text-emerald-800', pin: 'bg-emerald-500', hex: '#10b981' },
  closed:       { dot: 'bg-neutral-400', pill: 'bg-neutral-100 border border-neutral-200', text: 'text-neutral-600', pin: 'bg-neutral-400', hex: '#a3a3a3' },
};

export type Severity = 'low' | 'medium' | 'high';

/** Highest first, the order admins scan them in. */
export const SEVERITY_ORDER: Severity[] = ['high', 'medium', 'low'];

/** The API sends the severity slug; a missing or unknown value means the request is not assessed yet. */
export function toSeverity(value: string | null | undefined): Severity | null {
  const slug = value?.toLowerCase();
  return slug === 'low' || slug === 'medium' || slug === 'high' ? slug : null;
}

export const CATEGORY_ICONS: Record<string, React.ElementType> = {
  pothole:  HardHat,
  graffiti: Paintbrush,
  broken:   Wrench,
  flooding: Droplets,
  lighting: Zap,
  trees:    Leaf,
  dumping:  Trash2,
  other:    Building2,
};

/** The API sends the status slug; an unknown or missing value reads as "received". */
export function toStatus(value: string | null | undefined): Status {
  const slug = value?.toLowerCase() as Status | undefined;
  return slug && slug in STATUS_CONFIG ? slug : 'received';
}

export function StatusBadge({ status, compact = false }: { status: Status; compact?: boolean }) {
  const { t } = useTranslation();
  const { dot, pill, text } = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm text-xs font-mono ${pill} ${text} ${
        compact ? 'px-2 py-0.5' : 'px-2.5 py-1'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {statusLabel(status, t)}
    </span>
  );
}
