import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Icon } from "@/components/common";
import { ProjectCard, ProjectCardSkeleton } from "@/components/catalog";
import {
  CATALOG_TYPE_BUILD,
  CATALOG_TYPE_REPAIR,
  CATALOG_TYPE_DESIGN,
} from "@/utils/catalogAttributes";
import { openMessenger } from "@/utils/messenger";
import { useProjects } from "@/hooks/useProjects";
import { usePerView } from "@/hooks/usePerView";
import { useLoading } from "@/contexts/LoadingContext";
import { GOALS } from "@/lib/analytics";

function ArrowCarousel({ items, onMore }) {
  const perView = usePerView();
  const [state, setState] = useState({
    index: 0,
    isMobile: false,
    hasSwiped: false,
    touchStart: null,
    touchEnd: null,
  });
  const { index, isMobile, hasSwiped, touchStart, touchEnd } = state;
  const maxIndex = Math.max(0, items.length - perView);

  useEffect(() => {
    const checkMobile = () =>
      setState((s) => ({ ...s, isMobile: window.innerWidth < 768 }));
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (index > maxIndex) setState((s) => ({ ...s, index: maxIndex }));
  }, [perView, maxIndex, index]);

  const go = (d) =>
    setState((s) => ({
      ...s,
      index: Math.min(maxIndex, Math.max(0, s.index + d)),
    }));
  const goto = (i) =>
    setState((s) => ({
      ...s,
      index: Math.min(maxIndex, Math.max(0, i)),
    }));

  const minSwipeDistance = 50;
  const onTouchStart = (e) => {
    setState((s) => ({
      ...s,
      touchEnd: null,
      touchStart: e.targetTouches[0].clientX,
    }));
  };
  const onTouchMove = (e) => {
    setState((s) => ({ ...s, touchEnd: e.targetTouches[0].clientX }));
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      setState((s) => ({ ...s, hasSwiped: true }));
      go(1);
    }
    if (isRightSwipe) {
      setState((s) => ({ ...s, hasSwiped: true }));
      go(-1);
    }
  };

  const itemBasis = isMobile
    ? "100%"
    : `calc((100% - ${(perView - 1) * 12}px) / ${perView})`;
  const translate = `translateX(-${(index * 100) / perView}%)`;

  return (
    <div className="relative">
      <div className="flex items-center md:gap-4">
        <button
          aria-label="prev"
          onClick={() => go(-1)}
          className="hidden md:flex flex-shrink-0 rounded-full border border-brand bg-ink/70 p-2 text-brand backdrop-blur hover:bg-brand hover:text-ink z-10"
        >
          <Icon name="chevron-left" className="h-5 w-5" />
        </button>
        <div className="flex-1 overflow-hidden relative">
          {/* Подсказка-анимация пальца поверх карточки (только мобильные, до первого свайпа) */}
          {isMobile && !hasSwiped && items.length > 0 && (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
              aria-hidden
            >
              <div className="flex flex-col items-center gap-2 animate-finger-swipe-hint">
                <div className="rounded-2xl bg-black/50 backdrop-blur-sm px-4 py-2 text-xs text-white/90">
                  Листайте
                </div>
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-brand/20 text-brand">
                  <Icon name="hand" className="h-8 w-8 rotate-[-20deg] animate-swipe-finger" />
                </div>
              </div>
            </div>
          )}
          <div
            className="flex transition-transform duration-500 md:gap-3"
            style={{ transform: translate }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {items.map((project) => (
              <div key={project.id} style={{ flex: `0 0 ${itemBasis}` }}>
                <ProjectCard project={project}>
                  <button
                    onClick={() => onMore(project)}
                    className="flex-1 rounded-xl border border-brand px-3 py-2.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-brand hover:bg-brand hover:text-ink transition-colors"
                  >
                    Подробнее
                  </button>
                  <button
                    onClick={() =>
                      openMessenger(
                        `Хочу проект ${project.id} — "${project.title}"`,
                        undefined,
                        {
                          goal: GOALS.PROJECT_CTA_CLICK,
                          context: {
                            form: "Карточка портфолио",
                            projectId: project.id,
                            projectTitle: project.title,
                          },
                        },
                      )
                    }
                    className="flex-1 rounded-xl bg-brand px-3 py-2.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-ink hover:opacity-90 transition-opacity"
                  >
                    Хочу этот проект
                  </button>
                </ProjectCard>
              </div>
            ))}
          </div>
        </div>
        <button
          aria-label="next"
          onClick={() => go(1)}
          className="hidden md:flex flex-shrink-0 rounded-full border border-brand bg-ink/70 p-2 text-brand backdrop-blur hover:bg-brand hover:text-ink z-10"
        >
          <Icon name="chevron-right" className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-6 flex justify-center gap-2">
        {Array.from({ length: maxIndex + 1 }).map((_, i) => (
          <button
            key={`dot-${i}`}
            onClick={() => goto(i)}
            className={
              "h-2 rounded-full transition-all " +
              (i === index ? "w-8 bg-brand" : "w-2 bg-brand/20")
            }
          ></button>
        ))}
      </div>
    </div>
  );
}

export default function Portfolio() {
  const { setIsPageLoading } = useLoading();
  const navigate = useNavigate();
  const { projects, loading } = useProjects();

  const [activeCategory, setActiveCategory] = useState("all");

  const featuredProjects = projects
    .filter((p) => p.featured)
    .filter((p) => {
      if (activeCategory === "all") return true;
      return p.type === activeCategory;
    });

  const handleCatalogClick = (e) => {
    e.preventDefault();
    setIsPageLoading(true);
    navigate("/catalog");
  };

  return (
    <section
      id="portfolio"
      className="relative bg-[#2A2A28]/30 py-[30px] md:py-24 will-reveal"
    >
      <div className="container mx-auto px-6 md:px-10 lg:px-12">
        <div className="mb-6 text-center md:mb-12">
          <Badge>Портфолио</Badge>
          <h2 className="mb-4 mt-4 font-play text-5xl font-bold md:text-6xl">
            Наши работы
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            Реализованные объекты
          </p>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProjectCardSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        ) : projects.length > 0 ? (
          <>
            <div className="mb-6 -mx-1 flex snap-x snap-mandatory items-center justify-start gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x md:mx-0 md:flex-wrap md:justify-center md:gap-3 md:overflow-visible md:px-0 md:pb-0 md:snap-none md:touch-auto">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={
                  "shrink-0 snap-start rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium transition-all " +
                  (activeCategory === "all"
                    ? "bg-brand text-ink shadow-lg"
                    : "border border-brand/30 text-white hover:border-brand hover:bg-brand/10")
                }
              >
                Все
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory(CATALOG_TYPE_BUILD)}
                className={
                  "shrink-0 snap-start rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium transition-all " +
                  (activeCategory === CATALOG_TYPE_BUILD
                    ? "bg-brand text-ink shadow-lg"
                    : "border border-brand/30 text-white hover:border-brand hover:bg-brand/10")
                }
              >
                Строительство
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory(CATALOG_TYPE_REPAIR)}
                className={
                  "shrink-0 snap-start rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium transition-all " +
                  (activeCategory === CATALOG_TYPE_REPAIR
                    ? "bg-brand text-ink shadow-lg"
                    : "border border-brand/30 text-white hover:border-brand hover:bg-brand/10")
                }
              >
                Ремонт
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory(CATALOG_TYPE_DESIGN)}
                className={
                  "shrink-0 snap-start rounded-full px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium transition-all " +
                  (activeCategory === CATALOG_TYPE_DESIGN
                    ? "bg-brand text-ink shadow-lg"
                    : "border border-brand/30 text-white hover:border-brand hover:bg-brand/10")
                }
              >
                Дизайн‑проекты
              </button>
            </div>
            {featuredProjects.length > 0 ? (
              <>
                <ArrowCarousel
                  items={featuredProjects}
                  onMore={(project) => navigate(`/catalog/${project.id}`)}
                />
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleCatalogClick}
                    className="inline-flex items-center gap-2 rounded-xl border border-brand bg-brand px-6 py-3 text-sm font-medium text-ink transition-all hover:opacity-90 hover:shadow-lg"
                  >
                    <span>Смотреть больше</span>
                    <Icon name="arrow-right" className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-gray-400">
                В выбранной категории пока нет объектов. Попробуйте выбрать другую категорию.
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-400">
            Каталог пуст. Добавьте первую карточку через форму.
          </div>
        )}
      </div>
    </section>
  );
}
