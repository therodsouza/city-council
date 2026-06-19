import { Wrench, Mail, LogOut, ArrowLeft, User, Calendar, MapPin, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfile } from '../contexts/AuthContext';

interface ProfileProps {
  onBack: () => void;
}

function formatDob(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function InfoRow({
  icon: Icon,
  label,
  value,
  sub,
  last,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  last?: boolean;
}) {
  return (
    <div className={`flex items-start gap-4 pb-4${last ? '' : ' border-b border-border'}`}>
      <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function PersonalDetails({ p }: { p: UserProfile }) {
  const address = [p.address, p.suburb, p.postcode].filter(Boolean).join(', ');
  return (
    <div className="px-8 py-6 border-t border-border">
      <h3 className="text-xs uppercase tracking-widest font-mono text-muted-foreground mb-4">
        Personal Details
      </h3>
      <div className="space-y-4">
        <InfoRow icon={Calendar} label="Date of Birth" value={formatDob(p.dateOfBirth)} />
        <InfoRow icon={User} label="Gender" value={p.gender} />
        <InfoRow icon={Phone} label="Phone Number" value={p.phone} />
        <InfoRow icon={MapPin} label="Residential Address" value={address} last />
      </div>
    </div>
  );
}

const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export function Profile({ onBack }: ProfileProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <header className="bg-primary text-primary-foreground py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent flex items-center justify-center flex-shrink-0">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-widest opacity-50">City Council</div>
              <div className="text-lg font-display font-semibold">Public Works & Infrastructure</div>
            </div>
          </div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Form</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">Your Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>

        <div className="bg-card border border-border rounded-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-border bg-muted/20">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-sm overflow-hidden bg-muted flex-shrink-0 border-2 border-border flex items-center justify-center">
                {user.photo ? (
                  <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">{user.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">Council Service Portal User</p>
              </div>
            </div>
          </div>

          <div className="px-8 py-6">
            <h3 className="text-xs uppercase tracking-widest font-mono text-muted-foreground mb-4">
              Account Information
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-4 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1">Full Name</p>
                  <p className="text-sm font-semibold text-foreground">{user.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1">Email Address</p>
                  <p className="text-sm font-semibold text-foreground">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <GoogleLogo />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1">Authentication Provider</p>
                  <p className="text-sm font-semibold text-foreground">Google Account</p>
                  <p className="text-xs text-muted-foreground mt-1">Connected via Google OAuth 2.0</p>
                </div>
              </div>
            </div>
          </div>

          {user.profile && <PersonalDetails p={user.profile} />}

          <div className="px-8 py-6 border-t border-border bg-muted/10">
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 px-5 py-2.5 border border-destructive bg-white text-destructive text-sm font-semibold rounded-sm hover:bg-destructive hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 border border-border rounded-sm bg-secondary/40">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Note:</strong> Your contact information will be
            automatically pre-filled when submitting service requests. You can update your details
            through your Google Account settings.
          </p>
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span className="font-mono">© {new Date().getFullYear()} City Council. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Accessibility</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
