import { Helmet } from "react-helmet-async";

const SITE_NAME = "HUSAM STROY INVEST";
const DEFAULT_OG_IMAGE = "/husam_og_1.jpg";
const DEFAULT_DESCRIPTION =
  "HUSAM STROY INVEST — проектирование, строительство, ремонт и дизайн интерьеров. Рассчитаем смету и выполним работы под ключ: качественно и в срок.";

/**
 * Преобразует путь к изображению в абсолютный URL
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
 * Динамические meta-теги и Open Graph
 * @param {{ title?: string, description?: string, image?: string, url?: string, type?: string }} props
 */
export default function SeoHead({
  title,
  description = DEFAULT_DESCRIPTION,
  image,
  url,
  type = "website",
}) {
  const siteTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const absoluteImage = image ? toAbsoluteImageUrl(image) : toAbsoluteImageUrl(DEFAULT_OG_IMAGE);
  const absoluteUrl = url
    ? (url.startsWith("http") ? url : `${typeof window !== "undefined" ? window.location.origin : ""}${url}`)
    : typeof window !== "undefined"
      ? window.location.href
      : null;

  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index,follow,max-image-preview:large" />
      {absoluteUrl && <link rel="canonical" href={absoluteUrl} />}
      {absoluteUrl && <link rel="alternate" hrefLang="ru-RU" href={absoluteUrl} />}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      {absoluteImage && <meta property="og:image" content={absoluteImage} />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="ru_RU" />
      {absoluteUrl && <meta property="og:url" content={absoluteUrl} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      {absoluteImage && <meta name="twitter:image" content={absoluteImage} />}
    </Helmet>
  );
}
