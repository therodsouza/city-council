import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useMatch, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { OnboardingForm } from './components/OnboardingForm';
import { Profile } from './components/Profile';
import { TrackRequests } from './components/TrackRequests';
import { AuthCallback } from './components/AuthCallback';
import { ServiceRequestForm } from './ServiceRequestForm';
import { guestsAllowed } from './config/features';
import { RequestMap } from './components/RequestMap';
import { AdminRequestList } from './components/AdminRequestList';
import { AdminRequestDetail } from './components/AdminRequestDetail';
import { LanguageSwitcher } from './components/LanguageSwitcher';

type Page = 'form' | 'profile' | 'track' | 'map';

const ADMIN_REQUESTS_PATH = '/admin/requests';

function AppShell() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('form');
  const [guest, setGuest] = useState(false);
  const navigate = useNavigate();
  const adminDetailMatch = useMatch(`${ADMIN_REQUESTS_PATH}/:id`);
  const adminListMatch = useMatch(ADMIN_REQUESTS_PATH);

  if (isLoading) return null;
  if (!isAuthenticated) {
    if (!guest) return <Login onContinueAsGuest={guestsAllowed ? () => setGuest(true) : undefined} />;
    return <ServiceRequestForm user={null} onSignInClick={() => setGuest(false)} />;
  }
  if (!user?.profileComplete) return <OnboardingForm />;

  if (adminListMatch || adminDetailMatch) {
    // The API enforces the role too; this keeps citizens from seeing an empty admin shell.
    if (!user.isAdmin) return <Navigate to="/" replace />;
    const onProfileClick = () => {
      setCurrentPage('profile');
      navigate('/');
    };
    if (adminDetailMatch) {
      return (
        <AdminRequestDetail
          id={adminDetailMatch.params.id ?? ''}
          user={user}
          onBack={() => navigate(ADMIN_REQUESTS_PATH)}
          onProfileClick={onProfileClick}
        />
      );
    }
    return (
      <AdminRequestList
        user={user}
        onBack={() => navigate('/')}
        onOpen={(id) => navigate(`${ADMIN_REQUESTS_PATH}/${encodeURIComponent(id)}`)}
        onProfileClick={onProfileClick}
      />
    );
  }

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
        onOpenRequest={(id) => navigate(`${ADMIN_REQUESTS_PATH}/${encodeURIComponent(id)}`)}
      />
    );
  }

  return (
    <ServiceRequestForm
      user={user}
      onProfileClick={() => setCurrentPage('profile')}
      onTrackClick={() => setCurrentPage('track')}
      onMapClick={user?.isAdmin ? () => setCurrentPage('map') : undefined}
      onManageClick={user?.isAdmin ? () => navigate(ADMIN_REQUESTS_PATH) : undefined}
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
