import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * При смене маршрута прокручивает окно в начало, чтобы новая страница (например админка)
 * не открывалась с середины/конца предыдущей.
 */
export default function ScrollRestoration() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
