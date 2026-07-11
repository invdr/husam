import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Icon,
} from "@/components/common";
import { Link } from "react-router-dom";
import ProjectImage from "@/components/catalog/ProjectImage";
import {
  formatPrice,
  getSaleCardDisplayFields,
  formatConstructionPrice,
  formatSaleProjectDiscount,
} from "@/utils/saleProjectAttributes";

const EMPTY_CUSTOM_FIELD_DEFS = [];

export default function SaleProjectCard({
  project,
  onRequestClick,
  adminFooter,
  imageOverlay,
  customFieldDefs = EMPTY_CUSTOM_FIELD_DEFS,
  titleHref,
}) {
  const canRequest = typeof onRequestClick === "function";
  const discount = formatSaleProjectDiscount(project.oldPrice, project.price);

  return (
    <Card variant="listing">
      <div className="px-2 pt-2 pb-1 sm:px-3 sm:pt-3 sm:pb-1.5">
        <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden rounded-lg">
          <ProjectImage
            project={project}
            detailHref={titleHref}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {imageOverlay && (
            <div className="absolute right-2 top-2 z-10">{imageOverlay}</div>
          )}
        </div>
      </div>

      <CardHeader variant="listing">
        <CardTitle variant="listing" title={project.title}>
          {titleHref ? (
            <Link
              to={titleHref}
              className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
            >
              {project.title}
            </Link>
          ) : (
            project.title
          )}
        </CardTitle>
        <CardDescription variant="listing">
          {project.type || "Готовый проект"}
        </CardDescription>
      </CardHeader>

      <CardContent variant="listing">
        {(() => {
          const fields = getSaleCardDisplayFields(project, customFieldDefs);
          if (fields.length === 0) return null;
          return (
            <div className="mb-2 grid grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
              {fields.map(({ label, value }) => (
                <div key={label}>
                  <div className="text-gray-500 text-xs">{label}</div>
                  <div className="text-brand font-medium break-words text-xs sm:text-sm">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        <div className="mt-auto border-t border-brand/20 pt-2.5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-gray-500">
                <span>Стоимость проекта</span>
                {discount ? (
                  <span className="inline-flex rounded bg-brand/15 px-2 py-0.5 text-xs font-semibold normal-case tracking-normal text-brand">
                    Скидка {discount}
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <div className="font-play text-lg text-white">
                  {formatPrice(project.price)}
                </div>
                {project.oldPrice ? (
                  <div className="text-xs text-gray-500 line-through">
                    {formatPrice(project.oldPrice)}
                  </div>
                ) : null}
              </div>
              {project.constructionPriceFrom && (
                <div className="mt-1 text-xs leading-relaxed text-gray-400">
                  Стоимость строительства от{" "}
                  <span className="inline-block whitespace-nowrap font-medium text-white">
                    {formatConstructionPrice(project.constructionPriceFrom)}
                  </span>
                </div>
              )}
            </div>
            {!adminFooter && canRequest ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRequestClick(project);
                }}
                onKeyDown={(event) => event.stopPropagation()}
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink active:opacity-80 sm:w-auto"
              >
                <Icon name="shopping-cart" className="h-4 w-4" />
                Хочу
              </button>
            ) : null}
          </div>
        </div>

        {adminFooter ? (
          <div className="border-t border-brand/20 px-4 py-2.5 sm:px-5 sm:py-2">
            {adminFooter}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
