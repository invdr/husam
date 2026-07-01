import { Suspense, lazy } from "react";
import { Toaster } from "sonner";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useReveal } from "@/hooks/useReveal";
import { useCountUp } from "@/hooks/useCountUp";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import SeoHead from "@/components/common/SeoHead";
import { LocalBusinessJsonLd, OrganizationJsonLd } from "@/components/common/JsonLd";
import PageLoader from "@/components/common/PageLoader";
import ScrollToTop from "@/components/common/ScrollToTop";
import ScrollRestoration from "@/components/common/ScrollRestoration";
import ErrorBoundary from "@/components/common/ErrorBoundary";
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

function App() {
  return (
    <AuthProvider>
      <LoadingProvider>
        <BrowserRouter
        basename={import.meta.env.BASE_URL}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <div className="min-h-screen w-full bg-ink text-white">
          <ScrollRestoration />
          <Header />
          <main className="flex-1">
            <Suspense fallback={<AdminLoader />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:projectId" element={<ProjectSaleDetail />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/catalog/:projectId" element={<ProjectDetail />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
                <Route path="/admin/login" element={<AdminLogin />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
          <ScrollToTop />
          <PageLoader />
          <Toaster richColors position="top-center" />
        </div>
      </BrowserRouter>
    </LoadingProvider>
    </AuthProvider>
  );
}

export default App;
