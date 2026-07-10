import { Badge, Card, CardContent, Icon } from "@/components/common";
import ContactForm from "@/components/forms/ContactForm";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { safeExternalUrl } from "@/utils/externalUrl";

const FALLBACK = {
  address: "г. Грозный, пр-т Кадырова, 274",
  phone: "+7 (928) 945-31-31",
  email: "husamstroy_2020@mail.ru",
  instagram_url: "https://instagram.com/husamstroy",
  vk_url: "https://vk.com/husamstroy",
  telegram_url: "https://t.me/husamstroy",
};

export default function Contacts() {
  const { settings, loading } = useSiteSettings();
  const s = loading ? FALLBACK : { ...FALLBACK, ...settings };

  const contactItems = [
    { icon: "map-pin", title: "Адрес", text: s.address || "" },
    { icon: "phone", title: "Телефон", text: s.phone || "" },
    { icon: "mail", title: "Email", text: s.email || "" },
  ];

  const socialLinks = [
    { name: "Instagram", url: s.instagram_url || "", icon: "instagram" },
    { name: "ВКонтакте", url: s.vk_url || "", icon: "share-2" },
    { name: "Telegram", url: s.telegram_url || "", icon: "send" },
  ]
    .map((social) => ({ ...social, url: safeExternalUrl(social.url) }))
    .filter((social) => social.url);

  return (
    <section
      id="contacts"
      data-reveal="fade-up"
      className="py-[30px] md:py-24 will-reveal"
    >
      <div className="container mx-auto px-6 md:px-10 lg:px-12">
        <div className="mb-12 text-center">
          <Badge>Контакты</Badge>
          <h2 className="mb-4 mt-4 font-play text-5xl font-bold md:text-6xl">
            Свяжитесь с нами
          </h2>
        </div>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            {contactItems.map((c) => (
              <Card key={c.title} className="border-brand/20 bg-[#2A2A28]">
                <CardContent className="p-6 pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Icon name={c.icon} className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="mb-2 font-play text-lg font-bold">
                        {c.title}
                      </h3>
                      <p className="text-gray-400">{c.text}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card className="border-brand/20 bg-[#2A2A28]">
              <CardContent className="p-6 pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon name="at-sign" className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-3 font-play text-lg font-bold">
                      Социальные сети
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {socialLinks.map((social) => (
                        <a
                          key={social.url}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg bg-brand/10 px-2 py-1.5 text-xs text-gray-300 transition-colors hover:bg-brand/20 hover:text-brand"
                        >
                          <Icon name={social.icon} className="h-3.5 w-3.5" />
                          <span>{social.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex h-full flex-col">
            <ContactForm phone={s.phone} />
          </div>
        </div>
      </div>
    </section>
  );
}
