import { Suspense, lazy } from "react";
import { Toaster } from "sonner";
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import { useReveal } from "@/hooks/useReveal";
import { useCountUp } from "@/hooks/useCountUp";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import SeoHead from "@/components/common/SeoHead";
import { LocalBusinessJsonLd, OrganizationJsonLd } from "@/components/common/JsonLd";
import AnalyticsBridge from "@/components/common/AnalyticsBridge";
import PageLoader from "@/components/common/PageLoader";
import ScrollToTop from "@/components/common/ScrollToTop";
import ScrollRestoration from "@/components/common/ScrollRestoration";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import CookieConsentBanner from "@/components/common/CookieConsentBanner";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Главная страница
import Hero from "@/components/sections/Hero";
import Advantages from "@/components/sections/Advantages";
import Services from "@/components/sections/Services";
import Results from "@/components/sections/Results";
import Calculator from "@/components/forms/Calculator";
import Portfolio from "@/components/sections/Portfolio";
import Process from "@/components/sections/Process";
import FAQ from "@/components/sections/FAQ";
import Contacts from "@/components/sections/Contacts";

// Страницы каталога
import Catalog from "@/pages/Catalog";
import ProjectDetail from "@/pages/ProjectDetail";
import Projects from "@/pages/Projects";
import ProjectSaleDetail from "@/pages/ProjectSaleDetail";
import LegalDocument from "@/pages/LegalDocument";
import NotFound from "@/pages/NotFound";
import { CONSENT_DOCUMENT, POLICY_DOCUMENT } from "@/data/legalDocuments";

// Админ-панель (lazy)
const Admin = lazy(() => import("@/pages/Admin"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));

function AdminLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent" />
    </div>
  );
}

function HomePage() {
  const location = useLocation();
  useReveal();
  useCountUp();

  // Обработка якорей при загрузке страницы
  useEffect(() => {
    if (location.hash) {
      const anchorId = location.hash.slice(1); // Убираем "#"
      setTimeout(() => {
        const element = document.getElementById(anchorId);
        if (element) {
          const headerHeight = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition =
            elementPosition + window.pageYOffset - headerHeight;
          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      }, 100); // Небольшая задержка для рендеринга
    }
  }, [location.hash]);

  return (
    <>
      <SeoHead
        title="Строительство и ремонт под ключ"
        description="Проектирование, строительство, ремонт и дизайн интерьеров от экспертов федерального уровня."
      />
      <OrganizationJsonLd />
      <LocalBusinessJsonLd />
      <Hero />
      <ErrorBoundary>
        <Advantages />
      </ErrorBoundary>
      <ErrorBoundary>
        <Services />
      </ErrorBoundary>
      <ErrorBoundary>
        <Results />
      </ErrorBoundary>
      <ErrorBoundary>
        <Calculator />
      </ErrorBoundary>
      <ErrorBoundary>
        <Portfolio />
      </ErrorBoundary>
      <ErrorBoundary>
        <Process />
      </ErrorBoundary>
      <ErrorBoundary>
        <FAQ />
      </ErrorBoundary>
      <ErrorBoundary>
        <Contacts />
      </ErrorBoundary>
    </>
  );
}

function AppShell() {
  return (
    <div className="min-h-screen w-full bg-ink text-white">
      <ScrollRestoration />
      <AnalyticsBridge />
      <Header />
      <main className="flex-1">
        <Suspense fallback={<AdminLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <ScrollToTop />
      <CookieConsentBanner />
      <PageLoader />
      <Toaster richColors position="top-center" />
    </div>
  );
}

const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        { path: "/", element: <HomePage /> },
        { path: "/projects", element: <Projects /> },
        { path: "/projects/:projectId", element: <ProjectSaleDetail /> },
        { path: "/catalog", element: <Catalog /> },
        { path: "/catalog/:projectId", element: <ProjectDetail /> },
        { path: "/privacy", element: <LegalDocument document={POLICY_DOCUMENT} /> },
        { path: "/consent", element: <LegalDocument document={CONSENT_DOCUMENT} /> },
        {
          path: "/admin",
          element: (
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          ),
        },
        { path: "/admin/login", element: <AdminLogin /> },
        { path: "*", element: <NotFound /> },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
    future: {
      v7_prependBasename: true,
      v7_partialHydration: true,
    },
  },
);

function App() {
  return (
    <AuthProvider>
      <LoadingProvider>
        <RouterProvider router={router} />
      </LoadingProvider>
    </AuthProvider>
  );
}

export default App;
