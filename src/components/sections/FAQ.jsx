import { Badge, AccordionItem } from "@/components/common";
import { useFaq } from "@/hooks/useFaq";
import Icon from "@/components/common/Icon";

export default function FAQ() {
  const { items, loading } = useFaq();

  const faqItems = items.map(({ question: q, answer: a }) => ({ q, a }));

  return (
    <section id="faq" className="relative bg-[#2A2A28]/30 py-[30px] md:py-24 will-reveal">
      <div className="container mx-auto px-6 md:px-10 lg:px-12">
        <div className="mb-12 text-center">
          <Badge>FAQ</Badge>
          <h2 className="mb-4 mt-4 font-play text-5xl font-bold md:text-6xl">
            Частые вопросы
          </h2>
        </div>
        <div className="mx-auto max-w-3xl space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Icon name="loader" className="h-8 w-8 animate-spin text-brand" />
            </div>
          ) : (
            faqItems.map((it) => (
              <AccordionItem key={it.q} q={it.q} a={it.a} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
