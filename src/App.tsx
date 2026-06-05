import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Profile } from './components/Profile';
import { AuthCallback } from './components/AuthCallback';
import { ServiceRequestForm } from './ServiceRequestForm';

type Page = 'form' | 'profile';

function AppShell() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('form');

  if (isLoading) return null;
  if (!isAuthenticated) return <Login />;

  if (currentPage === 'profile') {
    return <Profile onBack={() => setCurrentPage('form')} />;
  }

  return (
    <ServiceRequestForm
      user={user}
      onProfileClick={() => setCurrentPage('profile')}
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
