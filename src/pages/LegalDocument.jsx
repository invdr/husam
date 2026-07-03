import { Link } from "react-router-dom";
import SeoHead from "@/components/common/SeoHead";

function LegalParagraph({ line }) {
  const trimmed = line.trim();

  if (!trimmed) return null;

  if (/^\d+\.\s/.test(trimmed)) {
    return (
      <h2 className="mt-10 font-play text-2xl font-bold text-white first:mt-0">
        {trimmed}
      </h2>
    );
  }

  if (/^\d+\.\d+\./.test(trimmed)) {
    return <p className="mt-4 text-gray-200">{trimmed}</p>;
  }

  if (trimmed.includes(":") && !trimmed.endsWith(";")) {
    const [label, ...rest] = trimmed.split(":");
    return (
      <p className="mt-2 text-gray-300">
        <span className="font-semibold text-gray-100">{label}:</span>
        {rest.length > 0 ? ` ${rest.join(":").trim()}` : ""}
      </p>
    );
  }

  return (
    <p className="mt-2 pl-4 text-gray-300 before:-ml-4 before:mr-2 before:text-brand before:content-['•']">
      {trimmed.replace(/;$/, "")}
    </p>
  );
}

export default function LegalDocument({ document }) {
  return (
    <>
      <SeoHead
        title={document.title}
        description={`${document.title} ${document.subtitle}. Дата обновления: ${document.updatedAt}.`}
        url={`/${document.slug}`}
      />
      <section className="bg-ink py-12 md:py-20">
        <div className="container mx-auto max-w-5xl px-6 md:px-10 lg:px-12">
          <Link
            to="/"
            className="mb-8 inline-flex text-sm text-gray-400 transition hover:text-brand"
          >
            ← На главную
          </Link>

          <header className="border-b border-brand/20 pb-8">
            <p className="mb-3 text-sm uppercase tracking-[0.18em] text-brand">
              {document.subtitle}
            </p>
            <h1 className="font-play text-4xl font-bold leading-tight text-white md:text-5xl">
              {document.title}
            </h1>
            <p className="mt-4 text-sm text-gray-400">
              Сайт: https://husam.ru
              <br />
              Дата размещения / последнего обновления: {document.updatedAt}
            </p>
          </header>

          <article className="pt-8 text-base leading-7">
            {document.text.split("\n").map((line, index) => (
              <LegalParagraph key={`${document.slug}-${index}`} line={line} />
            ))}
          </article>
        </div>
      </section>
    </>
  );
}

