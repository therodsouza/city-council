import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { OnboardingForm } from './components/OnboardingForm';
import { Profile } from './components/Profile';
import { TrackRequests } from './components/TrackRequests';
import { AuthCallback } from './components/AuthCallback';
import { ServiceRequestForm } from './ServiceRequestForm';
import { RequestMap } from './components/RequestMap';
import { LanguageSwitcher } from './components/LanguageSwitcher';

type Page = 'form' | 'profile' | 'track' | 'map';

function AppShell() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('form');
  const [guest, setGuest] = useState(false);

  if (isLoading) return null;
  if (!isAuthenticated) {
    if (!guest) return <Login onContinueAsGuest={() => setGuest(true)} />;
    return <ServiceRequestForm user={null} onSignInClick={() => setGuest(false)} />;
  }
  if (!user?.profileComplete) return <OnboardingForm />;

  if (currentPage === 'profile') {
    return <Profile onBack={() => setCurrentPage('form')} />;
  }

  if (currentPage === 'track') {
    return (
      <TrackRequests
        user={user}
        onBack={() => setCurrentPage('form')}
        onProfileClick={() => setCurrentPage('profile')}
      />
    );
  }

  if (currentPage === 'map' && user?.isAdmin) {
    return (
      <RequestMap
        user={user}
        onBack={() => setCurrentPage('form')}
        onProfileClick={() => setCurrentPage('profile')}
      />
    );
  }

  return (
    <ServiceRequestForm
      user={user}
      onProfileClick={() => setCurrentPage('profile')}
      onTrackClick={() => setCurrentPage('track')}
      onMapClick={user?.isAdmin ? () => setCurrentPage('map') : undefined}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<AppShell />} />
        </Routes>
        <LanguageSwitcher />
      </AuthProvider>
    </BrowserRouter>
  );
}
