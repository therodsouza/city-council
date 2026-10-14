import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Building2, X, Layers, Filter, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { User } from '../contexts/AuthContext';
import { SiteHeader } from './SiteHeader';
import { categoryLabel, statusLabel, dateLocale } from '../i18n/labels';
import { getServiceRequests } from '../services/ServiceRequestService';
import type { ServiceRequestListItem } from '../services/ServiceRequestService';
import { Status, STATUS_ORDER, STATUS_CONFIG, CATEGORY_ICONS, StatusBadge, toStatus } from './requestUi';

interface MapRequest {
  id: string;
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
  /** Opens the admin detail page of a request (where its status can be changed). */
  onOpenRequest?: (id: string) => void;
}

const ACTIVE_STATUSES: Status[] = ['received', 'under_review', 'in_progress', 'resolved'];

function toMapRequest(item: ServiceRequestListItem): MapRequest {
  return {
    id: item.id,
    referenceNumber: item.referenceNumber,
    category: item.category.toLowerCase(),
    status: toStatus(item.status),
    createdAt: new Date(item.createdAt),
    address: item.address,
    suburb: item.suburb,
    lat: item.latitude ?? 0,
    lng: item.longitude ?? 0,
  };
}

function markerIcon(hex: string): google.maps.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><circle cx="14" cy="14" r="13" fill="${hex}" stroke="white" stroke-width="2"/><line x1="14" y1="27" x2="14" y2="36" stroke="${hex}" stroke-width="3"/></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(28, 36),
    anchor: new window.google.maps.Point(14, 36),
  };
}

function DetailPanel({ req, onClose, onOpen }: { req: MapRequest; onClose: () => void; onOpen?: () => void }) {
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
          <StatusBadge status={req.status} compact />
        </div>
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="w-full px-3 py-1.5 rounded-sm border border-border text-xs text-foreground hover:bg-muted/50 transition-colors"
          >
            {t('map.open_details')}
          </button>
        )}
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

export function RequestMap({ user, onBack, onProfileClick, onOpenRequest }: RequestMapProps) {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [selected, setSelected] = useState<MapRequest | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [requests, setRequests] = useState<MapRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: apiKey ?? '' });
  const onMapLoad = useCallback((_map: google.maps.Map) => {}, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setFetchError(null);
    getServiceRequests()
      .then((items) => { if (!cancelled) setRequests(items.map(toMapRequest)); })
      .catch((e: unknown) => { if (!cancelled) setFetchError(e instanceof Error ? e.message : 'Failed to load requests'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const mappable = requests.filter((r) => r.lat !== 0 && r.lng !== 0);
  const visible = mappable.filter((r) => statusFilter === 'all' || r.status === statusFilter);
  const center = mappable.length > 0
    ? {
        lat: mappable.reduce((s, r) => s + r.lat, 0) / mappable.length,
        lng: mappable.reduce((s, r) => s + r.lng, 0) / mappable.length,
      }
    : { lat: -33.868, lng: 151.21 };

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
            {t('map.count', { visible: visible.length, total: requests.length })}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex items-center gap-1.5 flex-wrap">
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
        {!apiKey ? (
          <div className="absolute inset-0 bg-[#e8e0d8] flex items-center justify-center">
            <div className="bg-white/70 border border-border rounded-sm px-3 py-1.5 text-xs font-mono text-muted-foreground backdrop-blur-sm">
              {t('map.api_watermark')}
            </div>
          </div>
        ) : isLoading || !isLoaded ? (
          <div className="absolute inset-0 bg-[#e8e0d8] flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-muted-foreground/30 animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="absolute inset-0 bg-[#e8e0d8] flex items-center justify-center">
            <p className="text-sm text-destructive">{fetchError}</p>
          </div>
        ) : (
          <>
            <GoogleMap
              mapContainerClassName="absolute inset-0"
              center={center}
              zoom={14}
              onLoad={onMapLoad}
              options={{ clickableIcons: false }}
            >
              {visible.map((req) => (
                <MarkerF
                  key={req.referenceNumber}
                  position={{ lat: req.lat, lng: req.lng }}
                  icon={markerIcon(STATUS_CONFIG[req.status].hex)}
                  title={t('map.pin_aria', { category: categoryLabel(req.category, t), address: req.address })}
                  onClick={() => handlePin(req)}
                />
              ))}
            </GoogleMap>

            {selected && (
              <DetailPanel
                req={selected}
                onClose={() => setSelected(null)}
                onOpen={onOpenRequest ? () => onOpenRequest(selected.id) : undefined}
              />
            )}
            {showLegend && <Legend requests={requests} />}
          </>
        )}
      </div>
    </div>
  );
}
