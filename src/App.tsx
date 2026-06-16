import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Profile } from './components/Profile';
import { TrackRequests } from './components/TrackRequests';
import { AuthCallback } from './components/AuthCallback';
import { ServiceRequestForm } from './ServiceRequestForm';

type Page = 'form' | 'profile' | 'track';

function AppShell() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('form');

  if (isLoading) return null;
  if (!isAuthenticated) return <Login />;

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

  return (
    <ServiceRequestForm
      user={user}
      onProfileClick={() => setCurrentPage('profile')}
      onTrackClick={() => setCurrentPage('track')}
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
      </AuthProvider>
    </BrowserRouter>
  );
}
