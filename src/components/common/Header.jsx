import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { telLink } from "@utils/messenger";
import { useLoading } from "@/contexts/LoadingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { GOALS, reachGoal } from "@/lib/analytics";
import Icon from "./Icon";
import logoImage from "@assets/logo.png";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsPageLoading } = useLoading();
  const { user, signOut } = useAuth();
  const { settings } = useSiteSettings();
  const phone = settings.phone || "+7 (928) 945-31-31";
  const isAdminPage = location.pathname.startsWith("/admin") && !location.pathname.includes("/login");

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", isMenuOpen);
  }, [isMenuOpen]);

  const navItems = [
    { t: "Услуги", id: "services", href: "/#services" },
    // Кнопка «Портфолио» ведёт на страницу «Каталог»
    { t: "Портфолио", id: "catalog", href: "/catalog" },
    { t: "Проекты", id: "projects", href: "/projects" },
    { t: "Процесс", id: "process", href: "/#process" },
    { t: "Контакты", id: "contacts", href: "/#contacts" },
  ];

  const isHomePage = location.pathname === "/";

  // Обработчик плавной прокрутки к якорю
  const handleAnchorClick = (e, anchorId) => {
    e.preventDefault();
    const element = document.getElementById(anchorId);
    if (element) {
      const headerHeight = 80; // Высота шапки
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
    setIsMenuOpen(false);
  };

  // Обработчик перехода на отдельную страницу с показом загрузки
  const handleRouteClick = (e, path) => {
    e.preventDefault();
    setIsPageLoading(true);
    setIsMenuOpen(false);
    setTimeout(() => {
      navigate(path);
    }, 150);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login");
    setIsMenuOpen(false);
  };

  return (
    <>
      <header
        className={
          "sticky top-0 z-50 w-full border-b border-brand/20 bg-ink transition-all duration-300 " +
          (scrollY > 50 ? "shadow-lg" : "")
        }
      >
        <div className="container mx-auto flex h-20 items-center justify-between gap-4 px-6 md:px-10 lg:px-12">
          <Link to="/" className="flex items-center flex-shrink-0">
            <div className="flex items-center">
              <img
                src={logoImage}
                alt="HUSAM"
                className="h-12 w-auto flex-shrink-0"
              />
            </div>
          </Link>

          <nav className="hidden gap-8 lg:flex">
            {navItems.map((item) => {
              if (item.href.startsWith("/#")) {
                const anchorId = item.href.slice(2); // Убираем "/#"
                return isHomePage ? (
                  <a
                    key={item.id}
                    href={`#${anchorId}`}
                    onClick={(e) => handleAnchorClick(e, anchorId)}
                    className="text-sm font-medium transition-colors hover:text-brand"
                  >
                    {item.t}
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    to={item.href}
                    className="text-sm font-medium transition-colors hover:text-brand"
                  >
                    {item.t}
                  </Link>
                );
              }
              if (item.id === "catalog" || item.id === "projects") {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={(e) => handleRouteClick(e, item.href)}
                    className="text-sm font-medium transition-colors hover:text-brand"
                  >
                    {item.t}
                  </a>
                );
              }
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className="text-sm font-medium transition-colors hover:text-brand"
                >
                  {item.t}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {isAdminPage && user ? (
              <>
                <span className="text-sm text-gray-400">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 rounded-xl border border-brand/30 px-4 py-2 text-sm text-gray-300 transition hover:border-brand hover:text-white"
                >
                  <Icon name="log-out" className="h-4 w-4" />
                  Выйти
                </button>
              </>
            ) : (
              <>
                {user && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 rounded-xl border border-brand/30 px-4 py-2 text-sm text-brand transition hover:bg-brand/10 hover:text-white"
                  >
                    <Icon name="settings" className="h-4 w-4" />
                    Админка
                  </Link>
                )}
                <a
                  href={telLink(phone)}
                  onClick={() => reachGoal(GOALS.PHONE_CLICK)}
                  className="flex items-center rounded-xl border border-brand bg-brand px-4 py-2 text-sm text-ink transition hover:opacity-90"
                >
                  <Icon name="phone" className="mr-2 h-4 w-4" /> {phone}
                </a>
              </>
            )}
          </div>

          <button
            className="flex text-brand lg:hidden"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
          >
            <Icon name={isMenuOpen ? "x" : "menu"} className="h-6 w-6" />
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <div className="fixed inset-x-0 top-20 z-40 border-b border-brand/20 bg-ink lg:hidden">
          <nav className="container mx-auto flex flex-col gap-4 p-6">
            {navItems.map((item) => {
              if (item.href.startsWith("/#")) {
                const anchorId = item.href.slice(2); // Убираем "/#"
                return isHomePage ? (
                  <a
                    key={item.id}
                    href={`#${anchorId}`}
                    onClick={(e) => handleAnchorClick(e, anchorId)}
                    className="text-lg font-medium hover:text-brand"
                  >
                    {item.t}
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    to={item.href}
                    className="text-lg font-medium hover:text-brand"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.t}
                  </Link>
                );
              }
              if (item.id === "catalog" || item.id === "projects") {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={(e) => handleRouteClick(e, item.href)}
                    className="text-lg font-medium hover:text-brand"
                  >
                    {item.t}
                  </a>
                );
              }
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className="text-lg font-medium hover:text-brand"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.t}
                </Link>
              );
            })}
            {isAdminPage && user ? (
              <div className="flex flex-col gap-2 border-t border-brand/20 pt-4">
                <span className="text-sm text-gray-400">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand/30 px-4 py-3 text-gray-300 hover:border-brand hover:text-white"
                >
                  <Icon name="log-out" className="h-4 w-4" />
                  Выйти
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 border-t border-brand/20 pt-4">
                {user && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand/30 px-4 py-3 text-brand hover:bg-brand/10"
                  >
                    <Icon name="settings" className="h-4 w-4" />
                    Админка
                  </Link>
                )}
                <a
                  href={telLink(phone)}
                  onClick={() => reachGoal(GOALS.PHONE_CLICK)}
                  className="w-full rounded-xl bg-brand px-4 py-3 text-center text-ink hover:opacity-90"
                >
                  <Icon name="phone" className="mr-2 inline h-4 w-4" /> {phone}
                </a>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
