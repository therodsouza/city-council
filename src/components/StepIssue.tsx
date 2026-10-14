import { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, Camera, Upload, X, RefreshCw, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useTranslation } from 'react-i18next';
import { FormData } from '../types/form';
import { FieldLabel, TextArea } from './FormFields';
import { CATEGORY_KEYS, categoryLabel } from '../i18n/labels';

// The API accepts only these photo types, up to 5 MB, and checks the file content.
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

interface Props {
  form: FormData;
  setVal: (key: keyof FormData, value: string | boolean) => void;
  photoUrl: string;
  setPhotoUrl: (url: string) => void;
  setPhotoFile: (file: File | null) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepIssue({ form, setVal, photoUrl, setPhotoUrl, setPhotoFile, onNext, onBack }: Props) {
  const { t } = useTranslation();
  const [dragOver, setDragOver] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [fileName, setFileName] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const canProceed = !!(
    !compressing &&
    form.category &&
    form.description.trim().length >= 10
  );

  const handleFile = async (file: File) => {
    setPhotoError(null);
    setCompressing(true);
    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
      let compressed = await imageCompression(file, options);
      if (!ALLOWED_PHOTO_TYPES.includes(compressed.type)) {
        // e.g. GIF/BMP: re-encode as JPEG rather than have the API reject it.
        compressed = await imageCompression(file, { ...options, fileType: 'image/jpeg' });
      }
      if (!ALLOWED_PHOTO_TYPES.includes(compressed.type)) {
        setPhotoError(t('stepIssue.photo_type_error'));
        return;
      }
      if (compressed.size > MAX_PHOTO_BYTES) {
        setPhotoError(t('stepIssue.photo_size_error'));
        return;
      }
      setFileName(file.name);
      setPhotoUrl(URL.createObjectURL(compressed));
      setPhotoFile(compressed);
    } catch {
      setPhotoError(t('stepIssue.photo_type_error'));
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div>
      <div className="px-8 py-6 border-b border-border">
        <h2 className="text-xl font-display font-bold text-foreground">{t('stepIssue.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t('stepIssue.subtitle')}
        </p>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Image capture */}
        {compressing ? (
          <div className="border-2 border-dashed border-border rounded-sm py-10 px-6 flex flex-col items-center justify-center gap-3 bg-muted/20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-semibold text-foreground">{t('stepIssue.compressing')}</p>
            <p className="text-xs text-muted-foreground">{t('stepIssue.compressing_sub')}</p>
          </div>
        ) : !photoUrl ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file?.type.startsWith('image/')) handleFile(file);
            }}
            className={`border-2 border-dashed rounded-sm py-10 px-6 text-center transition-colors ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
            }`}
          >
            <div className="w-[4.5rem] h-[4.5rem] bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-primary/60" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">{t('stepIssue.capture_title')}</p>
            <p className="text-xs text-muted-foreground mb-4">
              {t('stepIssue.capture_sub')}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-sm hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-4 h-4" /> {t('stepIssue.take_photo')}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-border bg-white text-foreground text-sm font-semibold rounded-sm hover:border-primary/40 transition-colors"
              >
                <Upload className="w-4 h-4" /> {t('stepIssue.upload_file')}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              {t('stepIssue.drop_hint')}
            </p>
          </div>
        ) : (
          <div className="relative rounded-sm overflow-hidden h-72">
            <img src={photoUrl} alt={t('stepIssue.alt_issue')} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white min-w-0">
                <Camera className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm truncate">{fileName}</span>
              </div>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white text-xs font-semibold rounded-sm hover:bg-white/30 transition-colors flex-shrink-0"
              >
                <RefreshCw className="w-3 h-3" /> {t('stepIssue.retake')}
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setFileName(''); setPhotoUrl(''); setPhotoFile(null); }}
              className="absolute top-2 right-2 w-7 h-7 bg-black/40 text-white flex items-center justify-center rounded-sm hover:bg-black/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {photoError && (
          <p className="text-xs text-red-600" role="alert">{photoError}</p>
        )}

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />

        {/* Description */}
        <div>
          <FieldLabel
            htmlFor="description"
            required
            hint={t('stepIssue.description_hint')}
          >
            {t('stepIssue.description')}
          </FieldLabel>
          <TextArea
            id="description"
            value={form.description}
            onChange={e => setVal('description', e.target.value)}
            placeholder={t('stepIssue.description_placeholder')}
            rows={5}
            maxLength={2000}
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">{t('stepIssue.be_specific')}</span>
            <span
              className={`text-xs font-mono ${
                form.description.trim().length >= 10 ? 'text-emerald-600' : 'text-muted-foreground'
              }`}
            >
              {t('stepIssue.char_count', { count: form.description.length })}
            </span>
          </div>
        </div>

        {/* Category */}
        <div>
          <FieldLabel htmlFor="category" required>{t('stepIssue.category')}</FieldLabel>
          <select
            id="category"
            value={form.category}
            onChange={e => setVal('category', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-border bg-white rounded-sm text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors"
          >
            <option value="">{t('stepIssue.category_placeholder')}</option>
            {CATEGORY_KEYS.map(c => (
              <option key={c} value={c}>{categoryLabel(c, t)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-8 py-4 border-t border-border flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 border border-border bg-white text-foreground text-sm font-semibold rounded-sm hover:border-primary/40 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </button>
        <span className="text-xs font-mono text-muted-foreground">{t('common.step_counter', { current: 2, total: 4 })}</span>
        <button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('common.continue')} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
