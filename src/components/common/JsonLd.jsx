import { Helmet } from "react-helmet-async";

/** JSON-LD Organization для главной */
export function OrganizationJsonLd() {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "HUSAM STROY INVEST",
    url: baseUrl,
    description: "Проектирование, строительство, ремонт и дизайн интерьеров от экспертов федерального уровня.",
    sameAs: [],
  };
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

/** JSON-LD LocalBusiness/ProfessionalService для локального SEO */
export function LocalBusinessJsonLd() {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "HUSAM STROY INVEST",
    url: baseUrl,
    areaServed: {
      "@type": "Country",
      name: "RU",
    },
    serviceType: [
      "Проектирование",
      "Строительство",
      "Ремонт под ключ",
      "Дизайн интерьеров",
    ],
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

/**
 * JSON-LD хлебных крошек
 * @param {{ items: Array<{ name: string, path: string }> }} props
 */
export function BreadcrumbsJsonLd({ items }) {
  if (!items || items.length === 0) return null;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const itemListElement = items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: `${baseUrl}${item.path}`,
  }));

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}

/**
 * Преобразует относительный URL изображения в абсолютный
 */
function toAbsoluteImageUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const base = import.meta.env.BASE_URL || "/";
  const path = url.startsWith("/") ? url : `${base.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
  return `${origin}${path}`;
}

/**
 * JSON-LD schema для каталога проектов (ItemList + CreativeWork)
 * @param {{ projects: Array<{ id: string, title: string, type?: string, area?: string, images?: string[], scope?: string[] }> }} props
 */
export default function CatalogJsonLd({ projects }) {
  if (!projects || projects.length === 0) return null;

  const base = import.meta.env.BASE_URL || "/";
  const catalogPath = base === "/" ? "/catalog" : `${base.replace(/\/$/, "")}/catalog`;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const itemListElement = projects.map((p, index) => {
    const image = p.images?.[0] ? toAbsoluteImageUrl(p.images[0]) : null;
    const url = `${baseUrl}${catalogPath}/${p.id}`;
    return {
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "CreativeWork",
        "@id": url,
        name: p.title,
        description: [p.type, p.area, p.location].filter(Boolean).join(", "),
        ...(image && { image }),
        author: {
          "@type": "Organization",
          name: "HUSAM STROY INVEST",
        },
      },
    };
  });

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Каталог проектов HUSAM STROY INVEST",
    description: "Строительство, ремонт и дизайн интерьеров — портфолио выполненных проектов",
    numberOfItems: projects.length,
    itemListElement,
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
