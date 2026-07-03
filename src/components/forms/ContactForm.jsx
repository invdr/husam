import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/common";
import { openMessenger } from "@/utils/messenger";
import { phonePattern } from "@/utils/constants";

export default function ContactForm({ phone }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const fEl = e.currentTarget;
    const f = new FormData(fEl);
    const name = f.get("name");
    const tel = f.get("tel");
    const service = f.get("service");
    const consentEl = fEl.querySelector('input[type="checkbox"]');
    const comment = f.get("comment");

    // Validation
    let ok = true;
    const reqNames = ["name", "tel", "service"];
    reqNames.forEach((n) => {
      const el = fEl.querySelector(`[name="${n}"]`);
      const val = f.get(n);
      const valid = val && (n !== "tel" || phonePattern.test(val));
      el && el.classList.toggle("form-error", !valid);
      if (!valid) ok = false;
    });
    const consentValid = !!consentEl?.checked;
    consentEl?.classList.toggle("form-error", !consentValid);
    if (!consentValid) ok = false;
    if (!ok) return;

    openMessenger(
      `Запрос с сайта\nИмя: ${name}\nТелефон: ${tel}\nУслуга: ${service}\nКомментарий: ${
        comment || ""
      }`,
      phone,
    );
  };

  return (
    <Card className="border-brand/20 bg-[#2A2A28]">
      <CardHeader>
        <CardTitle className="font-play text-2xl">Оставьте заявку</CardTitle>
        <CardDescription>Мы свяжемся с вами в ближайшее время</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" noValidate onSubmit={handleSubmit}>
          <input
            name="name"
            placeholder="Ваше имя"
            required
            className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-3 text-white outline-none focus:border-brand"
          />
          <input
            name="tel"
            type="tel"
            placeholder="Телефон"
            required
            pattern="^\\+?\\d[\\d\\s\\-\\(\\)]{9,}$"
            className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-3 text-white outline-none focus:border-brand"
          />
          <select
            name="service"
            required
            className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-3 text-white outline-none focus:border-brand"
          >
            <option value="">Тип услуги</option>
            <option>Строительство</option>
            <option>Ремонт</option>
            <option>Дизайн</option>
            <option>Проектирование</option>
          </select>
          <textarea
            name="comment"
            placeholder="Комментарий"
            className="min-h-[92px] w-full rounded-xl border border-brand/20 bg-ink px-4 py-3 text-white outline-none focus:border-brand"
          ></textarea>
          <label className="flex items-start gap-2 text-xs text-gray-500">
            <input type="checkbox" required className="mt-1" /> Согласен с Политикой
            конфиденциальности
          </label>
          <button className="w-full rounded-xl bg-brand py-4 text-ink transition hover:opacity-90">
            Отправить заявку в мессенджер
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
