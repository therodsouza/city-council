import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Building2, ImageOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { User } from '../contexts/AuthContext';
import { SiteHeader } from './SiteHeader';
import { ApiError } from '../services/ApiError';
import {
  getServiceRequest,
  updateServiceRequestSeverity,
  updateServiceRequestStatus,
  ServiceRequestDetail,
} from '../services/ServiceRequestService';
import {
  categoryLabel, severityShortLabel, siteTypeLabel, statusLabel, dateLocale,
} from '../i18n/labels';
import {
  Severity, SEVERITY_ORDER, Status, STATUS_ORDER, STATUS_CONFIG, CATEGORY_ICONS, StatusBadge, toSeverity, toStatus,
} from './requestUi';

interface AdminRequestDetailProps {
  id: string;
  user: User | null;
  onBack: () => void;
  onProfileClick: () => void;
}

const NOTE_MAX_LENGTH = 1000;
const MAP_STYLE = { width: '100%', height: '100%' };
const MAP_OPTIONS: google.maps.MapOptions = {
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};
const PIN_ZOOM = 16;

const SEVERITY_DOT: Record<Severity, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-sm">
      <h2 className="px-5 py-3 border-b border-border text-xs font-mono uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-0.5">{label}</dt>
      <dd className="text-sm text-foreground break-words">{children}</dd>
    </div>
  );
}

/** Only mounted with a Maps key and coordinates, so the loader never runs with an empty key. */
function PinMap({ lat, lng, apiKey }: { lat: number; lng: number; apiKey: string }) {
  // Same loader id as RequestMap and LocationPicker, so the script is only added to the page once.
  const { isLoaded, loadError } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: apiKey });
  if (loadError) return null;
  return (
    <div className="h-64 w-full border border-border rounded-sm overflow-hidden bg-muted/30">
      {isLoaded ? (
        <GoogleMap mapContainerStyle={MAP_STYLE} center={{ lat, lng }} zoom={PIN_ZOOM} options={MAP_OPTIONS}>
          <MarkerF position={{ lat, lng }} />
        </GoogleMap>
      ) : (
        <div className="h-full flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-muted-foreground/30 animate-spin" />
        </div>
      )}
    </div>
  );
}

function Photo({ url }: { url: string | null | undefined }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  // A fresh link (after saving a status) should get another chance.
  useEffect(() => setFailed(false), [url]);

  if (!url || failed) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ImageOff className="w-4 h-4" />
        {url ? t('admin.detail.photo_failed') : t('admin.detail.no_photo')}
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <img
        src={url}
        alt={t('admin.detail.photo_alt')}
        onError={() => setFailed(true)}
        className="max-h-96 w-auto max-w-full rounded-sm border border-border"
      />
    </a>
  );
}

export function AdminRequestDetail({ id, user, onBack, onProfileClick }: AdminRequestDetailProps) {
  const { t, i18n } = useTranslation();
  const [request, setRequest] = useState<ServiceRequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ status?: number; message: string } | null>(null);

  const [nextStatus, setNextStatus] = useState<Status>('received');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // '' means no severity chosen yet; it is only the starting point for an unassessed request.
  const [nextSeverity, setNextSeverity] = useState<Severity | ''>('');
  const [severityNote, setSeverityNote] = useState('');
  const [isSavingSeverity, setIsSavingSeverity] = useState(false);
  const [severityError, setSeverityError] = useState<string | null>(null);
  const [severitySaved, setSeveritySaved] = useState(false);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setRequest(null);
    setNote('');
    setSaveError(null);
    setSaved(false);
    setSeverityNote('');
    setSeverityError(null);
    setSeveritySaved(false);
    getServiceRequest(id)
      .then((r) => {
        if (cancelled) return;
        setRequest(r);
        setNextStatus(toStatus(r.status));
        setNextSeverity(toSeverity(r.severity) ?? '');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError({
          status: e instanceof ApiError ? e.status : undefined,
          message: e instanceof Error ? e.message : '',
        });
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const formatDateTime = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleString(dateLocale(i18n.language), { dateStyle: 'medium', timeStyle: 'short' })
      : '';

  const currentStatus = toStatus(request?.status);
  const trimmedNote = note.trim();
  const unchanged = nextStatus === currentStatus && trimmedNote === '';

  const currentSeverity = toSeverity(request?.severity);
  const trimmedSeverityNote = severityNote.trim();
  const severityUnchanged = nextSeverity === '' || nextSeverity === currentSeverity;

  const handleSaveSeverity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || isSavingSeverity || severityUnchanged) return;
    setIsSavingSeverity(true);
    setSeverityError(null);
    setSeveritySaved(false);
    try {
      const updated = await updateServiceRequestSeverity(request.id, nextSeverity, trimmedSeverityNote);
      setRequest(updated);
      setNextSeverity(toSeverity(updated.severity) ?? '');
      setSeverityNote('');
      setSeveritySaved(true);
    } catch (err) {
      setSeverityError(err instanceof Error && err.message ? err.message : t('admin.detail.severity_save_error'));
    } finally {
      setIsSavingSeverity(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || isSaving || unchanged) return;
    setIsSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const updated = await updateServiceRequestStatus(request.id, nextStatus, trimmedNote);
      setRequest(updated);
      setNextStatus(toStatus(updated.status));
      setNote('');
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error && err.message ? err.message : t('admin.detail.save_error'));
    } finally {
      setIsSaving(false);
    }
  };

  const backButton = (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
    >
      <ArrowLeft className="w-4 h-4" />
      {t('admin.detail.back')}
    </button>
  );

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="py-16 text-center">
          <RefreshCw className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-muted-foreground">{t('admin.detail.loading')}</p>
        </div>
      );
    }
    if (loadError || !request) {
      const message =
        loadError?.status === 404 ? t('admin.detail.not_found')
        : loadError?.status === 401 || loadError?.status === 403 ? t('admin.detail.forbidden')
        : loadError?.message || t('admin.detail.load_error');
      return (
        <div className="py-16 text-center">
          <p className="text-sm text-destructive" role="alert">{message}</p>
        </div>
      );
    }

    const Icon = CATEGORY_ICONS[request.category.toLowerCase()] ?? Building2;
    const hasCoords = request.latitude != null && request.longitude != null;
    const place = [request.address, request.suburb, request.postcode].filter(Boolean).join(', ');
    const history = [...(request.statusHistory ?? [])].reverse();

    return (
      <>
        <div className="flex items-start gap-4 mb-6">
          <div className="w-11 h-11 bg-primary/8 rounded-sm flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-xs text-muted-foreground">{request.referenceNumber}</div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              {categoryLabel(request.category, t)}
            </h1>
          </div>
          <StatusBadge status={currentStatus} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem] items-start">
          {/* Main column */}
          <div className="space-y-6 min-w-0">
            <Card title={t('admin.detail.issue')}>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words mb-4">
                {request.issueDescription}
              </p>
              <dl className="grid grid-cols-2 gap-4">
                <Field label={t('admin.detail.severity')}>{severityShortLabel(currentSeverity, t)}</Field>
                <Field label={t('admin.detail.site_type')}>{siteTypeLabel(request.siteType, t) || '—'}</Field>
                <Field label={t('admin.detail.submitted')}>{formatDateTime(request.submittedAt)}</Field>
                <Field label={t('admin.detail.updated')}>{formatDateTime(request.updatedAt) || '—'}</Field>
              </dl>
            </Card>

            <Card title={t('admin.detail.location')}>
              <p className="text-sm text-foreground font-medium">{place || '—'}</p>
              {request.locationNotes && (
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                  {request.locationNotes}
                </p>
              )}
              <div className="mt-4">
                {hasCoords && apiKey ? (
                  <PinMap lat={request.latitude!} lng={request.longitude!} apiKey={apiKey} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {hasCoords ? t('admin.detail.map_unavailable') : t('admin.detail.no_coordinates')}
                  </p>
                )}
              </div>
            </Card>

            <Card title={t('admin.detail.photo')}>
              <Photo url={request.imageUrl} />
            </Card>
          </div>

          {/* Side column */}
          <div className="space-y-6">
            <Card title={t('admin.detail.status')}>
              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label htmlFor="status-select" className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                    {t('admin.detail.new_status')}
                  </label>
                  <select
                    id="status-select"
                    value={nextStatus}
                    onChange={(e) => { setNextStatus(e.target.value as Status); setSaved(false); }}
                    disabled={isSaving}
                    className="w-full py-2.5 px-3 text-sm border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>{statusLabel(s, t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="status-note" className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                    {t('admin.detail.note')}
                  </label>
                  <textarea
                    id="status-note"
                    value={note}
                    onChange={(e) => { setNote(e.target.value); setSaved(false); }}
                    maxLength={NOTE_MAX_LENGTH}
                    rows={3}
                    disabled={isSaving}
                    placeholder={t('admin.detail.note_placeholder')}
                    className="w-full py-2 px-3 text-sm border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y"
                  />
                  {nextStatus === currentStatus && !saved && (
                    <p className="text-xs text-muted-foreground mt-1">{t('admin.detail.same_status_hint')}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isSaving || unchanged}
                  className="w-full px-4 py-2.5 rounded-sm bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? t('admin.detail.saving') : t('admin.detail.save')}
                </button>
                {saveError && <p className="text-xs text-destructive" role="alert">{saveError}</p>}
                {saved && <p className="text-xs text-emerald-700" role="status">{t('admin.detail.saved')}</p>}
              </form>
            </Card>

            <Card title={t('admin.detail.severity_card')}>
              <form onSubmit={handleSaveSeverity} className="space-y-3">
                <div>
                  <label htmlFor="severity-select" className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                    {t('admin.detail.new_severity')}
                  </label>
                  <select
                    id="severity-select"
                    value={nextSeverity}
                    onChange={(e) => { setNextSeverity(e.target.value as Severity); setSeveritySaved(false); }}
                    disabled={isSavingSeverity}
                    className="w-full py-2.5 px-3 text-sm border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {/* Once assessed, a request cannot go back to "not assessed". */}
                    {currentSeverity === null && (
                      <option value="" disabled>{severityShortLabel(null, t)}</option>
                    )}
                    {SEVERITY_ORDER.map((s) => (
                      <option key={s} value={s}>{severityShortLabel(s, t)}</option>
                    ))}
                  </select>
                  {currentSeverity === null && !severitySaved && (
                    <p className="text-xs text-muted-foreground mt-1">{t('admin.detail.severity_hint')}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="severity-note" className="block text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
                    {t('admin.detail.note')}
                  </label>
                  <textarea
                    id="severity-note"
                    value={severityNote}
                    onChange={(e) => { setSeverityNote(e.target.value); setSeveritySaved(false); }}
                    maxLength={NOTE_MAX_LENGTH}
                    rows={2}
                    disabled={isSavingSeverity}
                    className="w-full py-2 px-3 text-sm border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSavingSeverity || severityUnchanged}
                  className="w-full px-4 py-2.5 rounded-sm bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingSeverity ? t('admin.detail.saving') : t('admin.detail.save')}
                </button>
                {severityError && <p className="text-xs text-destructive" role="alert">{severityError}</p>}
                {severitySaved && <p className="text-xs text-emerald-700" role="status">{t('admin.detail.severity_saved')}</p>}
              </form>
            </Card>

            <Card title={t('admin.detail.reporter')}>
              <dl className="space-y-3">
                <Field label={t('admin.detail.name')}>{request.contactName || '—'}</Field>
                <Field label={t('admin.detail.email')}>
                  {request.contactEmail ? (
                    <a href={`mailto:${request.contactEmail}`} className="underline hover:text-primary">
                      {request.contactEmail}
                    </a>
                  ) : '—'}
                </Field>
                <Field label={t('admin.detail.phone')}>
                  {request.contactPhone ? (
                    <a href={`tel:${request.contactPhone}`} className="underline hover:text-primary">
                      {request.contactPhone}
                    </a>
                  ) : '—'}
                </Field>
                {request.ownerPhone && (
                  <Field label={t('admin.detail.verified_phone')}>{request.ownerPhone}</Field>
                )}
                <Field label={t('admin.detail.submitted_by')}>
                  {request.submittedBy === 'anonymous' ? t('admin.detail.anonymous') : t('admin.detail.account')}
                </Field>
                <Field label={t('admin.detail.wants_updates')}>
                  {request.receiveUpdates ? t('admin.detail.yes') : t('admin.detail.no')}
                </Field>
              </dl>
            </Card>

            <Card title={t('admin.detail.history')}>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('admin.detail.no_history')}</p>
              ) : (
                <ol className="space-y-4">
                  {history.map((h, i) => {
                    const entrySeverity = toSeverity(h.severity);
                    return (
                      <li key={`${h.changedAt}-${i}`} className="relative pl-4 border-l-2 border-border">
                        {entrySeverity ? (
                          <>
                            <span className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${SEVERITY_DOT[entrySeverity]}`} />
                            <span className="text-xs font-mono text-foreground">
                              {t('admin.detail.history_severity', { severity: severityShortLabel(entrySeverity, t) })}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${STATUS_CONFIG[toStatus(h.status)].dot}`} />
                            <StatusBadge status={toStatus(h.status)} compact />
                          </>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(h.changedAt)}
                          {h.changedByEmail ? ` · ${h.changedByEmail}` : ''}
                        </div>
                        {h.note && (
                          <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">{h.note}</p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <SiteHeader user={user} onProfileClick={onProfileClick} adminLabel />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {backButton}
        {renderBody()}
      </main>
    </div>
  );
}
