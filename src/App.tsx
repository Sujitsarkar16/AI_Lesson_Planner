import React, { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import PublicLayout from "@/modules/marketing/PublicLayout";
import DashboardLayout from "@/modules/dashboard/DashboardLayout";
import { AuthProvider } from "@/modules/auth/AuthContext";
import { auth0Config } from "@/modules/auth/auth0Config";
import LandingPage from "@/modules/marketing/LandingPage";
import PricingPage from "@/modules/marketing/PricingPage";
import AuthPage from "@/modules/auth/AuthPage";
import DashboardPage from "@/modules/dashboard/DashboardPage";
import GeneratePlanPage from "@/modules/generation/GeneratePlanPage";
import CalendarOptimizationPage from "@/modules/curriculum/CalendarOptimizationPage";
import MyDocumentsPage from "@/modules/documents/MyDocumentsPage";
import TemplatesPage from "@/modules/templates/TemplatesPage";
import SettingsPage from "@/modules/user/SettingsPage";
import BillingPage from "@/modules/billing/BillingPage";
import IntegrationsPage from "@/modules/user/IntegrationsPage";
import StudentPortalPage from "@/modules/student/StudentPortalPage";
import ParentCommunicationPage from "@/modules/parent/ParentCommunicationPage";
import {
  ContactPage,
  PrivacyPage,
  ProductPage,
  SchoolsPage,
  TermsPage,
  TrustAndAIPage,
} from "@/modules/marketing/MarketingPages";
const indexablePaths = new Set(["/", "/product", "/schools", "/pricing", "/trust-ai"]);

const CrawlPolicy: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    if (indexablePaths.has(pathname)) return;
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, nofollow";
  }, [pathname]);
  return null;
};

const AppRoutes: React.FC = () => (
  <BrowserRouter>
    <CrawlPolicy />
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/product" element={<ProductPage />} />
        <Route path="/schools" element={<SchoolsPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/trust-ai" element={<TrustAndAIPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/student-portal" element={<StudentPortalPage />} />
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="generate" element={<GeneratePlanPage />} />
        <Route path="calendar-optimization" element={<CalendarOptimizationPage />} />
        <Route path="documents" element={<MyDocumentsPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="parent-communication" element={<ParentCommunicationPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
const App: React.FC = () => (
  <Auth0Provider
    domain={auth0Config.domain}
    clientId={auth0Config.clientId}
    authorizationParams={{
      redirect_uri: auth0Config.redirectUri,
      audience: auth0Config.audience,
      scope: "openid profile email offline_access",
    }}
    cacheLocation="localstorage"
    useRefreshTokens={true}
  >
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </Auth0Provider>
);
export default App;
