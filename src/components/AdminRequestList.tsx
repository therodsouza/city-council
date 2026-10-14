import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, ChevronRight, RefreshCw, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User } from '../contexts/AuthContext';
import { SiteHeader } from './SiteHeader';
import { getServiceRequests, ServiceRequestListItem } from '../services/ServiceRequestService';
import { categoryLabel, severityShortLabel, statusLabel, dateLocale, CATEGORY_KEYS } from '../i18n/labels';
import { Status, STATUS_ORDER, STATUS_CONFIG, CATEGORY_ICONS, StatusBadge, toStatus } from './requestUi';

interface AdminRequestListProps {
  user: User | null;
  onBack: () => void;
  onOpen: (id: string) => void;
  onProfileClick: () => void;
}

interface Row {
  id: string;
  referenceNumber: string;
  category: string;
  severity: string;
  status: Status;
  createdAt: Date;
  address: string;
  suburb: string;
  contactName: string;
}

const SEVERITIES = ['high', 'medium', 'low'] as const;

const SEVERITY_TEXT: Record<string, string> = {
  high: 'text-red-700',
  medium: 'text-amber-700',
  low: 'text-muted-foreground',
};

function toRow(item: ServiceRequestListItem): Row {
  return {
    id: item.id,
    referenceNumber: item.referenceNumber,
    category: item.category.toLowerCase(),
    severity: item.severity?.toLowerCase() ?? '',
    status: toStatus(item.status),
    createdAt: new Date(item.createdAt),
    address: item.address,
    suburb: item.suburb,
    contactName: item.contactName,
  };
}

const selectClass =
  'py-2.5 px-3 text-sm border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';

function RequestRow({ row, onOpen }: { row: Row; onOpen: () => void }) {
  const { t, i18n } = useTranslation();
  const Icon = CATEGORY_ICONS[row.category] ?? Building2;
  const date = row.createdAt.toLocaleDateString(dateLocale(i18n.language), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const place = [row.address, row.suburb].filter(Boolean).join(', ');

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left grid grid-cols-[auto_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-primary/[0.025] transition-colors group border-b border-border last:border-0"
    >
      <div className="w-9 h-9 rounded-sm bg-primary/8 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary/60" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-mono text-xs text-muted-foreground">{row.referenceNumber}</span>
          <StatusBadge status={row.status} />
          {row.severity && (
            <span className={`text-xs font-mono uppercase tracking-wide ${SEVERITY_TEXT[row.severity] ?? 'text-muted-foreground'}`}>
              {severityShortLabel(row.severity, t)}
            </span>
          )}
        </div>
        <div className="text-sm font-medium text-foreground truncate">{categoryLabel(row.category, t)}</div>
        <div className="text-xs text-muted-foreground truncate">
          {t('admin.list.row_meta', { place, name: row.contactName, date })}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
    </button>
  );
}

export function AdminRequestList({ user, onBack, onOpen, onProfileClick }: AdminRequestListProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  // No dependency on `t`: switching language must not refetch the list.
  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getServiceRequests()
      .then((items) => { if (!cancelled) setRows(items.map(toRow)); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error && e.message ? e.message : ''); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => load(), [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        const matchSearch =
          needle === '' ||
          r.referenceNumber.toLowerCase().includes(needle) ||
          categoryLabel(r.category, t).toLowerCase().includes(needle) ||
          r.address.toLowerCase().includes(needle) ||
          r.suburb.toLowerCase().includes(needle) ||
          r.contactName.toLowerCase().includes(needle);
        return (
          matchSearch &&
          (statusFilter === 'all' || r.status === statusFilter) &&
          (categoryFilter === 'all' || r.category === categoryFilter) &&
          (severityFilter === 'all' || r.severity === severityFilter)
        );
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [rows, search, statusFilter, categoryFilter, severityFilter, t]);

  const countByStatus = (s: Status) => rows.filter((r) => r.status === s).length;
  const hasFilters =
    search !== '' || statusFilter !== 'all' || categoryFilter !== 'all' || severityFilter !== 'all';
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setSeverityFilter('all');
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <SiteHeader user={user} onProfileClick={onProfileClick} adminLabel />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </button>

        <h1 className="font-display text-3xl font-bold text-foreground mb-1">{t('admin.list.title')}</h1>
        <p className="text-muted-foreground mb-6">{t('admin.list.subtitle')}</p>

        {/* Status summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {STATUS_ORDER.map((s) => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(active ? 'all' : s)}
                aria-pressed={active}
                className={`border rounded-sm p-3.5 text-left transition-all ${
                  active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div className={`text-xs font-mono uppercase tracking-widest mb-1 ${STATUS_CONFIG[s].text}`}>
                  {statusLabel(s, t)}
                </div>
                <div className="text-2xl font-display font-bold text-foreground">{countByStatus(s)}</div>
              </button>
            );
          })}
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[14rem]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.list.search_placeholder')}
              aria-label={t('admin.list.search_placeholder')}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label={t('admin.list.all_categories')}
            className={selectClass}
          >
            <option value="all">{t('admin.list.all_categories')}</option>
            {CATEGORY_KEYS.map((c) => (
              <option key={c} value={c}>{categoryLabel(c, t)}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label={t('admin.list.all_severities')}
            className={selectClass}
          >
            <option value="all">{t('admin.list.all_severities')}</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{severityShortLabel(s, t)}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Status | 'all')}
            aria-label={t('track.all_statuses')}
            className={selectClass}
          >
            <option value="all">{t('track.all_statuses')}</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{statusLabel(s, t)}</option>
            ))}
          </select>
        </div>

        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
          {t('track.results', { count: filtered.length })}
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-muted-foreground">{t('admin.list.loading')}</p>
          </div>
        ) : error !== null ? (
          <div className="py-16 text-center">
            <p className="text-sm text-destructive mb-2" role="alert">{error || t('admin.list.error_default')}</p>
            <button
              type="button"
              onClick={() => { load(); }}
              className="text-sm text-foreground underline hover:text-primary transition-colors"
            >
              {t('track.try_again')}
            </button>
          </div>
        ) : filtered.length > 0 ? (
          <div className="border border-border rounded-sm bg-card">
            {filtered.map((r) => (
              <RequestRow key={r.id} row={r} onOpen={() => onOpen(r.id)} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {rows.length === 0 ? t('admin.list.empty') : t('track.no_match')}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-foreground underline hover:text-primary transition-colors"
              >
                {t('track.clear_filters')}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
