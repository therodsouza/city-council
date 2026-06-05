import { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, Camera, Upload, X, RefreshCw, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { FormData } from '../types/form';
import { FieldLabel, TextArea } from './FormFields';

const CATEGORIES = [
  { value: 'pothole', label: 'Pothole / Road Damage' },
  { value: 'graffiti', label: 'Graffiti / Vandalism' },
  { value: 'broken', label: 'Broken Equipment' },
  { value: 'flooding', label: 'Flooding / Water Damage' },
  { value: 'lighting', label: 'Street Light Outage' },
  { value: 'trees', label: 'Fallen Tree / Branch' },
  { value: 'dumping', label: 'Illegal Dumping / Litter' },
  { value: 'other', label: 'Other Infrastructure' },
];

const SEVERITY = [
  {
    value: 'low',
    label: 'Low',
    selectedClass: 'border-emerald-400 bg-emerald-50',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-800',
    idleClass: 'border-border bg-white hover:border-emerald-300 hover:bg-emerald-50/50',
  },
  {
    value: 'medium',
    label: 'Medium',
    selectedClass: 'border-amber-400 bg-amber-50',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-800',
    idleClass: 'border-border bg-white hover:border-amber-300 hover:bg-amber-50/50',
  },
  {
    value: 'high',
    label: 'High',
    selectedClass: 'border-red-400 bg-red-50',
    dotClass: 'bg-red-500',
    textClass: 'text-red-800',
    idleClass: 'border-border bg-white hover:border-red-300 hover:bg-red-50/50',
  },
];

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
  const [dragOver, setDragOver] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const canProceed = !!(
    !compressing &&
    form.category &&
    form.severity &&
    form.description.trim().length >= 10
  );

  const handleFile = async (file: File) => {
    setCompressing(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });
      setVal('photoName', file.name);
      setPhotoUrl(URL.createObjectURL(compressed));
      setPhotoFile(compressed);
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div>
      <div className="px-8 py-6 border-b border-border">
        <h2 className="text-xl font-display font-bold text-foreground">Issue Details</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Provide a clear description of the problem, including photos if possible.
        </p>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Image capture */}
        {compressing ? (
          <div className="border-2 border-dashed border-border rounded-sm py-10 px-6 flex flex-col items-center justify-center gap-3 bg-muted/20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm font-semibold text-foreground">Compressing image…</p>
            <p className="text-xs text-muted-foreground">This takes just a moment.</p>
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
            <p className="text-sm font-semibold text-foreground mb-1">Capture or attach a photo</p>
            <p className="text-xs text-muted-foreground mb-4">
              Show the exact location and condition of the issue
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-sm hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-4 h-4" /> Take Photo
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-border bg-white text-foreground text-sm font-semibold rounded-sm hover:border-primary/40 transition-colors"
              >
                <Upload className="w-4 h-4" /> Upload File
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              or drag and drop · JPG, PNG, HEIC up to 10MB
            </p>
          </div>
        ) : (
          <div className="relative rounded-sm overflow-hidden h-72">
            <img src={photoUrl} alt="Issue" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white min-w-0">
                <Camera className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm truncate">{form.photoName}</span>
              </div>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 text-white text-xs font-semibold rounded-sm hover:bg-white/30 transition-colors flex-shrink-0"
              >
                <RefreshCw className="w-3 h-3" /> Retake
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setVal('photoName', ''); setPhotoUrl(''); setPhotoFile(null); }}
              className="absolute top-2 right-2 w-7 h-7 bg-black/40 text-white flex items-center justify-center rounded-sm hover:bg-black/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
            hint="Minimum 10 characters. Include when the issue began and any immediate risks."
          >
            Description
          </FieldLabel>
          <TextArea
            id="description"
            value={form.description}
            onChange={e => setVal('description', e.target.value)}
            placeholder="Describe the issue in detail — what you observed, when it was first noticed, and any safety concerns…"
            rows={5}
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">Be as specific as possible.</span>
            <span
              className={`text-xs font-mono ${
                form.description.trim().length >= 10 ? 'text-emerald-600' : 'text-muted-foreground'
              }`}
            >
              {form.description.length} chars
            </span>
          </div>
        </div>

        {/* Category & Severity */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <FieldLabel htmlFor="category" required>Category</FieldLabel>
            <select
              id="category"
              value={form.category}
              onChange={e => setVal('category', e.target.value)}
              className="w-full px-3.5 py-2.5 border border-border bg-white rounded-sm text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors"
            >
              <option value="">Select a category…</option>
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel required>Severity</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              {SEVERITY.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setVal('severity', s.value)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 border rounded-sm transition-colors ${
                    form.severity === s.value ? s.selectedClass : s.idleClass
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dotClass}`} />
                  <span
                    className={`text-xs font-semibold ${
                      form.severity === s.value ? s.textClass : 'text-foreground'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-4 border-t border-border flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 border border-border bg-white text-foreground text-sm font-semibold rounded-sm hover:border-primary/40 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-xs font-mono text-muted-foreground">2 of 4</span>
        <button
          type="button"
          disabled={!canProceed}
          onClick={onNext}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
