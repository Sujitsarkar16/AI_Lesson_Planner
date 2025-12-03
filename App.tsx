
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import PublicLayout from './components/PublicLayout';
import DashboardLayout from './components/DashboardLayout';
import { AuthProvider } from './utils/AuthContext';
import { auth0Config } from './utils/auth0Config';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import GeneratePlanPage from './pages/GeneratePlanPage';
import MyDocumentsPage from './pages/MyDocumentsPage';
import TemplatesPage from './pages/TemplatesPage';
import SettingsPage from './pages/SettingsPage';
import IntegrationsPage from './pages/IntegrationsPage';

const AppRoutes: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
        </Route>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="generate" element={<GeneratePlanPage />} />
          <Route path="documents" element={<MyDocumentsPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

const App: React.FC = () => {
  return (
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{
        redirect_uri: auth0Config.redirectUri,
        audience: auth0Config.audience,
        scope: 'openid profile email offline_access'
      }}
    >
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Auth0Provider>
  );
};
export default App;
