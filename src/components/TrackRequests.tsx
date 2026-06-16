import { useState, useEffect } from 'react';
import {
  ArrowLeft, Search, ChevronRight, RefreshCw,
  HardHat, Paintbrush, Wrench, Droplets, Zap, Leaf, Trash2, Building2,
} from 'lucide-react';
import { User } from '../contexts/AuthContext';
import { SiteHeader } from './SiteHeader';
import { getServiceRequests, ServiceRequestListItem } from '../services/ServiceRequestService';

type Status = 'received' | 'under_review' | 'in_progress' | 'resolved' | 'closed';

interface Request {
  referenceNumber: string;
  category: string;
  categoryLabel: string;
  status: Status;
  createdAt: Date;
  address: string;
  suburb: string;
}

interface TrackRequestsProps {
  user: User | null;
  onBack: () => void;
  onProfileClick: () => void;
}

const STATUS_ORDER: Status[] = ['received', 'under_review', 'in_progress', 'resolved', 'closed'];

const STATUS_CONFIG: Record<Status, {
  label: string;
  dot: string;
  pill: string;
  text: string;
}> = {
  received:     { label: 'Received',     dot: 'bg-sky-400',     pill: 'bg-sky-50 border border-sky-200',     text: 'text-sky-800' },
  under_review: { label: 'Under Review', dot: 'bg-violet-400',  pill: 'bg-violet-50 border border-violet-200', text: 'text-violet-800' },
  in_progress:  { label: 'In Progress',  dot: 'bg-amber-400',   pill: 'bg-amber-50 border border-amber-200',  text: 'text-amber-800' },
  resolved:     { label: 'Resolved',     dot: 'bg-emerald-500', pill: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-800' },
  closed:       { label: 'Closed',       dot: 'bg-neutral-400', pill: 'bg-neutral-100 border border-neutral-200', text: 'text-neutral-600' },
};

const STRIP_STATUSES: Status[] = ['received', 'under_review', 'in_progress', 'resolved'];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  pothole:  HardHat,
  graffiti: Paintbrush,
  broken:   Wrench,
  flooding: Droplets,
  lighting: Zap,
  trees:    Leaf,
  dumping:  Trash2,
  other:    Building2,
};

const CATEGORY_LABELS: Record<string, string> = {
  pothole:  'Pothole / Road Damage',
  graffiti: 'Graffiti / Vandalism',
  broken:   'Broken Equipment',
  flooding: 'Flooding / Water Damage',
  lighting: 'Street Light Outage',
  trees:    'Fallen Tree / Branch',
  dumping:  'Illegal Dumping / Litter',
  other:    'Other Infrastructure',
};

function toRequest(item: ServiceRequestListItem): Request {
  const category = item.category.toLowerCase();
  const status = (item.status?.toLowerCase() ?? 'received') as Status;
  return {
    referenceNumber: item.referenceNumber,
    category,
    categoryLabel: CATEGORY_LABELS[category] ?? item.category,
    status,
    createdAt: new Date(item.createdAt),
    address: item.address,
    suburb: item.suburb,
  };
}

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono ${cfg.pill} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function RequestRow({ request }: { request: Request }) {
  const Icon = CATEGORY_ICONS[request.category] ?? Building2;
  const dateStr = request.createdAt.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-primary/[0.025] transition-colors group cursor-pointer border-b border-border last:border-0">
      <div className="w-9 h-9 rounded-sm bg-primary/8 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary/60" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="font-mono text-xs text-muted-foreground">{request.referenceNumber}</span>
          <StatusBadge status={request.status} />
        </div>
        <div className="text-sm font-medium text-foreground truncate">{request.categoryLabel}</div>
        <div className="text-xs text-muted-foreground truncate">
          {request.address}, {request.suburb} · Submitted {dateStr}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
    </div>
  );
}

export function TrackRequests({ user, onBack, onProfileClick }: TrackRequestsProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getServiceRequests()
      .then((items) => { if (!cancelled) setRequests(items.map(toRequest)); })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load requests.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = requests
    .filter((r) => {
      const matchSearch =
        search === '' ||
        r.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
        r.categoryLabel.toLowerCase().includes(search.toLowerCase()) ||
        r.suburb.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const countByStatus = (s: Status) => requests.filter((r: Request) => r.status === s).length;

  const resultsLabel = (() => {
    const base = `${filtered.length} request${filtered.length !== 1 ? 's' : ''}`;
    if (statusFilter !== 'all') return `${base} · ${STATUS_CONFIG[statusFilter].label}`;
    return base;
  })();

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <SiteHeader user={user} onProfileClick={onProfileClick} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Submit a Request
        </button>

        <h1 className="font-display text-3xl font-bold text-foreground mb-1">
          Track Your Requests
        </h1>
        <p className="text-muted-foreground mb-6">
          View and monitor all service requests submitted under your account.
        </p>

        {/* Status summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {STRIP_STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s];
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(isActive ? 'all' : s)}
                className={`border rounded-sm p-3.5 text-left transition-all ${
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div className={`text-xs font-mono uppercase tracking-widest mb-1 ${cfg.text}`}>
                  {cfg.label}
                </div>
                <div className="text-2xl font-display font-bold text-foreground">
                  {countByStatus(s)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference number, category or suburb…"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Status | 'all')}
            className="py-2.5 px-3 text-sm border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="all">All Statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
          {resultsLabel}
        </div>

        {/* Request list */}
        {isLoading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading your requests…</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <p className="text-sm text-destructive mb-2">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm text-foreground underline hover:text-primary transition-colors"
            >
              Try again
            </button>
          </div>
        ) : filtered.length > 0 ? (
          <div className="border border-border rounded-sm bg-card">
            {filtered.map((r) => (
              <RequestRow key={r.referenceNumber} request={r} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">No requests match your search.</p>
            <button
              type="button"
              onClick={() => { setSearch(''); setStatusFilter('all'); }}
              className="text-sm text-foreground underline hover:text-primary transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Footer note */}
        {user && (
          <p className="mt-4 text-xs text-muted-foreground/60 font-mono">
            Showing requests linked to {user.email}. Status updates are typically reflected within one business day.
          </p>
        )}
      </main>
    </div>
  );
}
