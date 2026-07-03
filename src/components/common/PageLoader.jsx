import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useLoading } from "@/contexts/LoadingContext";
import Icon from "./Icon";

function isLoaderTargetPath(pathname) {
  return pathname.includes("/catalog") || pathname.startsWith("/projects");
}

export default function PageLoader() {
  const { isPageLoading, setIsPageLoading } = useLoading();
  const location = useLocation();
  const showStartTime = useRef(null);
  const wasOnTargetPage = useRef(false);
  const minDisplayTime = 800; // Минимальное время показа индикатора (800ms)
  const maxDisplayTime = 5000; // Страховка: дольше этого оверлей не живёт никогда

  // Показываем индикатор при установке isPageLoading
  useEffect(() => {
    showStartTime.current = Date.now();
    if (isPageLoading) {
      wasOnTargetPage.current = false;
    }
  }, [isPageLoading]);

  // Страховочный таймаут: что бы ни случилось с навигацией, оверлей
  // не должен блокировать сайт дольше maxDisplayTime.
  useEffect(() => {
    if (!isPageLoading) return;
    const failsafe = setTimeout(() => {
      setIsPageLoading(false);
      showStartTime.current = null;
    }, maxDisplayTime);
    return () => clearTimeout(failsafe);
  }, [isPageLoading, setIsPageLoading]);

  // Скрываем индикатор при смене локации на каталог или проекты (когда страница загрузилась)
  useEffect(() => {
    if (!isPageLoading) return;

    const isTargetPage = isLoaderTargetPath(location.pathname);

    if (!isTargetPage) {
      // Пользователь уже был на каталоге/проектах и ушёл (например, жестом
      // «назад») до окончания minDisplayTime — снимаем оверлей сразу,
      // иначе он останется висеть поверх другой страницы.
      if (wasOnTargetPage.current) {
        setIsPageLoading(false);
        showStartTime.current = null;
      }
      return;
    }

    wasOnTargetPage.current = true;

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
