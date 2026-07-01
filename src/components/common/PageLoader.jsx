import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useLoading } from "@/contexts/LoadingContext";
import Icon from "./Icon";

export default function PageLoader() {
  const { isPageLoading, setIsPageLoading } = useLoading();
  const location = useLocation();
  const showStartTime = useRef(null);
  const minDisplayTime = 800; // Минимальное время показа индикатора (800ms)

  // Показываем индикатор при установке isPageLoading
  useEffect(() => {
    showStartTime.current = Date.now();
  }, [isPageLoading]);

  // Скрываем индикатор при смене локации на каталог или проекты (когда страница загрузилась)
  useEffect(() => {
    const isCatalogPage =
      location.pathname === "/catalog" ||
      location.pathname.includes("/catalog") ||
      location.pathname.endsWith("/catalog");
    const isProjectsPage =
      location.pathname === "/projects" ||
      location.pathname.startsWith("/projects/");

    if (!isPageLoading) return;
    if (!isCatalogPage && !isProjectsPage) return;

    const start = showStartTime.current;
    const elapsed = start ? Date.now() - start : 0;
    const remainingTime = start ? Math.max(0, minDisplayTime - elapsed) : minDisplayTime;

    const timeout = setTimeout(() => {
      setIsPageLoading(false);
      showStartTime.current = null;
    }, remainingTime);

    return () => clearTimeout(timeout);
  }, [location.pathname, isPageLoading, setIsPageLoading]);

  if (!isPageLoading) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Icon
            name="loader-circle"
            className="h-12 w-12 animate-spin text-brand"
          />
        </div>
        <p className="text-lg font-medium text-white">Загрузка каталога...</p>
      </div>
    </div>
  );
}
