import { useState } from 'react';
import {
  ArrowLeft, MapPin, Map, HardHat, Paintbrush, Wrench, Droplets,
  Zap, Leaf, Trash2, Building2, X, Layers, Filter,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User } from '../contexts/AuthContext';
import { SiteHeader } from './SiteHeader';
import { categoryLabel, statusLabel, dateLocale } from '../i18n/labels';

type Status = 'received' | 'under_review' | 'in_progress' | 'resolved' | 'closed';

interface MapRequest {
  referenceNumber: string;
  category: string;
  status: Status;
  createdAt: Date;
  address: string;
  suburb: string;
  lat: number;
  lng: number;
}

interface RequestMapProps {
  user: User | null;
  onBack: () => void;
  onProfileClick: () => void;
}

const STATUS_ORDER: Status[] = ['received', 'under_review', 'in_progress', 'resolved', 'closed'];

const STATUS_CONFIG: Record<Status, {
  dot: string;
  pill: string;
  text: string;
  pin: string;
}> = {
  received:     { dot: 'bg-sky-400',     pill: 'bg-sky-50 border border-sky-200',        text: 'text-sky-800',     pin: 'bg-sky-500' },
  under_review: { dot: 'bg-violet-400',  pill: 'bg-violet-50 border border-violet-200',  text: 'text-violet-800',  pin: 'bg-violet-500' },
  in_progress:  { dot: 'bg-amber-400',   pill: 'bg-amber-50 border border-amber-200',    text: 'text-amber-800',   pin: 'bg-amber-500' },
  resolved:     { dot: 'bg-emerald-500', pill: 'bg-emerald-50 border border-emerald-200', text: 'text-emerald-800', pin: 'bg-emerald-500' },
  closed:       { dot: 'bg-neutral-400', pill: 'bg-neutral-100 border border-neutral-200', text: 'text-neutral-600', pin: 'bg-neutral-400' },
};

const ACTIVE_STATUSES: Status[] = ['received', 'under_review', 'in_progress', 'resolved'];

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

const LAT_MIN = -33.915;
const LAT_MAX = -33.878;
const LNG_MIN = 151.150;
const LNG_MAX = 151.190;

const ALL_REQUESTS: MapRequest[] = [
  {
    referenceNumber: 'SR-2026-84231',
    category: 'pothole',
    status: 'received',
    createdAt: new Date('2026-06-10'),
    address: '142 Darling Street',
    suburb: 'Balmain',
    lat: -33.8815,
    lng: 151.1762,
  },
  {
    referenceNumber: 'SR-2026-84187',
    category: 'graffiti',
    status: 'under_review',
    createdAt: new Date('2026-06-08'),
    address: '78 Norton Street',
    suburb: 'Leichhardt',
    lat: -33.8839,
    lng: 151.1574,
  },
  {
    referenceNumber: 'SR-2026-84053',
    category: 'lighting',
    status: 'in_progress',
    createdAt: new Date('2026-06-05'),
    address: '23 Annandale Street',
    suburb: 'Annandale',
    lat: -33.8888,
    lng: 151.1651,
  },
  {
    referenceNumber: 'SR-2026-83901',
    category: 'trees',
    status: 'resolved',
    createdAt: new Date('2026-06-01'),
    address: '5 Glebe Point Road',
    suburb: 'Glebe',
    lat: -33.8798,
    lng: 151.1865,
  },
  {
    referenceNumber: 'SR-2026-83744',
    category: 'flooding',
    status: 'closed',
    createdAt: new Date('2026-05-28'),
    address: '310 Victoria Road',
    suburb: 'Rozelle',
    lat: -33.8612,
    lng: 151.1714,
  },
  {
    referenceNumber: 'SR-2026-84312',
    category: 'broken',
    status: 'received',
    createdAt: new Date('2026-06-12'),
    address: '88 Parramatta Road',
    suburb: 'Camperdown',
    lat: -33.8924,
    lng: 151.1791,
  },
  {
    referenceNumber: 'SR-2026-84098',
    category: 'dumping',
    status: 'in_progress',
    createdAt: new Date('2026-06-06'),
    address: '15 Pyrmont Bridge Road',
    suburb: 'Pyrmont',
    lat: -33.8762,
    lng: 151.1962,
  },
  {
    referenceNumber: 'SR-2026-83812',
    category: 'pothole',
    status: 'under_review',
    createdAt: new Date('2026-05-30'),
    address: '201 Abercrombie Street',
    suburb: 'Chippendale',
    lat: -33.8949,
    lng: 151.1972,
  },
];

function toPercent(val: number, min: number, max: number) {
  return ((val - min) / (max - min)) * 100;
}

function Pin({ req, selected, onClick }: { req: MapRequest; selected: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  const left = toPercent(req.lng, LNG_MIN, LNG_MAX);
  const top = 100 - toPercent(req.lat, LAT_MIN, LAT_MAX);
  const { pin } = STATUS_CONFIG[req.status];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ left: `${left}%`, top: `${top}%` }}
      className="absolute -translate-x-1/2 -translate-y-full"
      aria-label={t('map.pin_aria', { category: categoryLabel(req.category, t), address: req.address })}
    >
      <div className={`transition-transform ${selected ? 'scale-125' : 'hover:scale-110'}`}>
        <div
          className={`w-7 h-7 rounded-full shadow-md border-2 flex items-center justify-center ${pin} ${selected ? 'border-foreground' : 'border-white'}`}
        >
          <MapPin className="w-3.5 h-3.5 text-white" />
        </div>
        <div className={`w-0.5 h-2 ${pin} mx-auto`} />
      </div>
    </button>
  );
}

function StatusDot({ status }: { status: Status }) {
  const { t } = useTranslation();
  const { dot, pill, text } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-mono border ${pill} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {statusLabel(status, t)}
    </span>
  );
}

function DetailPanel({ req, onClose }: { req: MapRequest; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const Icon = CATEGORY_ICONS[req.category] ?? Building2;
  return (
    <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:w-72 bg-card border border-border rounded-sm shadow-lg z-20">
      <div className="p-4 border-b border-border flex items-start gap-3">
        <div className="w-8 h-8 bg-primary/8 rounded-sm flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono text-muted-foreground">{req.referenceNumber}</div>
          <div className="text-sm font-semibold text-foreground truncate">{categoryLabel(req.category, t)}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-sm hover:bg-muted/60 flex-shrink-0"
          aria-label={t('map.close')}
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="p-4 space-y-2.5">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">{t('map.location')}</div>
          <div className="text-sm text-foreground font-medium">{req.address}</div>
          <div className="text-xs text-muted-foreground">{req.suburb}</div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">{t('map.submitted')}</div>
            <div className="text-xs text-foreground">
              {req.createdAt.toLocaleDateString(dateLocale(i18n.language), { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <StatusDot status={req.status} />
        </div>
      </div>
    </div>
  );
}

function Legend({ requests }: { requests: MapRequest[] }) {
  const { t } = useTranslation();
  return (
    <div className="absolute top-4 right-4 bg-card border border-border rounded-sm p-3 shadow-md z-20 min-w-[160px]">
      <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">{t('map.legend')}</div>
      {STATUS_ORDER.map((s) => {
        const count = requests.filter((r) => r.status === s).length;
        const { pin } = STATUS_CONFIG[s];
        return (
          <div key={s} className="flex items-center gap-2 py-0.5">
            <span className={`w-3.5 h-3.5 rounded-full ${pin} border border-white shadow-sm flex-shrink-0`} />
            <span className="text-xs text-foreground">{statusLabel(s, t)}</span>
            <span className="text-xs text-muted-foreground ml-auto">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export function RequestMap({ user, onBack, onProfileClick }: RequestMapProps) {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [selected, setSelected] = useState<MapRequest | null>(null);
  const [showLegend, setShowLegend] = useState(true);

  const visible = ALL_REQUESTS.filter(
    (r) => statusFilter === 'all' || r.status === statusFilter,
  );

  const handleChip = (s: Status | 'all') => {
    setStatusFilter((prev) => (prev === s ? 'all' : s));
    setSelected(null);
  };

  const handlePin = (req: MapRequest) => {
    setSelected((prev) => (prev?.referenceNumber === req.referenceNumber ? null : req));
  };

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans">
      <SiteHeader user={user} onProfileClick={onProfileClick} adminLabel />

      {/* Toolbar */}
      <div className="bg-card border-b border-border px-4 sm:px-6 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
          <div className="w-px h-4 bg-border" />
          <span className="font-display text-lg font-bold text-foreground">{t('map.title')}</span>
          <span className="hidden sm:inline-block text-xs font-mono bg-muted px-2 py-0.5 rounded-sm text-muted-foreground">
            {t('map.count', { visible: visible.length, total: ALL_REQUESTS.length })}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* All chip */}
            <button
              type="button"
              onClick={() => handleChip('all')}
              className={`px-2.5 py-1 rounded-sm text-xs font-mono transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {t('map.all')}
            </button>
            {ACTIVE_STATUSES.map((s) => {
              const { pill, text } = STATUS_CONFIG[s];
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleChip(s)}
                  className={`px-2.5 py-1 rounded-sm text-xs font-mono transition-colors ${
                    active
                      ? `border ${pill} ${text}`
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {statusLabel(s, t)}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowLegend((v) => !v)}
            className={`border border-border rounded-sm p-1.5 transition-colors ${showLegend ? 'bg-muted' : 'hover:bg-muted/50'}`}
            title={t('map.toggle_legend')}
          >
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 520 }}>
        {/* Google Maps mount point — replace contents with <GoogleMap> from @react-google-maps/api once an API key is available */}
        <div className="absolute inset-0 bg-[#e8e0d8]">
          {/* SVG grid texture */}
          <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#9c8f7a" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Road / park overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
            <rect x="100" y="0" width="18" height="600" fill="#d4c9b5" />
            <rect x="300" y="0" width="14" height="600" fill="#d4c9b5" />
            <rect x="520" y="0" width="16" height="600" fill="#d4c9b5" />
            <rect x="0" y="120" width="800" height="14" fill="#d4c9b5" />
            <rect x="0" y="300" width="800" height="18" fill="#d4c9b5" />
            <rect x="0" y="460" width="800" height="12" fill="#d4c9b5" />
            <rect x="180" y="200" width="180" height="120" rx="4" fill="#c8d9b8" />
            <rect x="420" y="330" width="140" height="90" rx="4" fill="#c8d9b8" />
          </svg>

          {/* Watermark */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/70 border border-border rounded-sm px-3 py-1.5 text-xs font-mono text-muted-foreground backdrop-blur-sm pointer-events-none">
            {t('map.api_watermark')}
          </div>

          {/* Pins */}
          {visible.map((req) => (
            <Pin
              key={req.referenceNumber}
              req={req}
              selected={selected?.referenceNumber === req.referenceNumber}
              onClick={() => handlePin(req)}
            />
          ))}

          {/* Detail panel */}
          {selected && (
            <DetailPanel req={selected} onClose={() => setSelected(null)} />
          )}

          {/* Legend */}
          {showLegend && (
            <Legend requests={ALL_REQUESTS} />
          )}
        </div>
      </div>
    </div>
  );
}
