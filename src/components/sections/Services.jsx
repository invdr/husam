import {
  Badge,
  Icon,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/common";

export default function Services() {
  const services = [
    {
      icon: "pen-tool",
      title: "Проектирование",
      description: "Архитектурные и инженерные решения",
      items: [
        "Архитектурный проект",
        "Конструктивные решения",
        "Инженерные системы",
        "3D-визуализация",
      ],
    },
    {
      icon: "paintbrush",
      title: "Дизайн",
      description: "Создание уникальных интерьеров",
      items: [
        "Дизайн интерьера",
        "Подбор материалов",
        "Авторский надзор",
        "Комплектация объекта",
      ],
    },
    {
      icon: "building-2",
      title: "Строительство",
      description: "Комплексное возведение частных домов",
      items: [
        "Дома под ключ",
        "Дома с предчистовой отделкой",
        "Поэтапные работы (от фундамента до фасада)",
        "Строительство коммерческих объектов",
      ],
    },
    {
      icon: "hammer",
      title: "Ремонт",
      description: "Профессиональная отделка помещений",
      items: [
        "Ремонт под ключ",
        "Ремонт предчистовой отделки",
        "Ремонт по дизайн-проекту",
        "Ремонт под сдачу",
      ],
    },
  ];

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const headerHeight = 80;
      const top =
        el.getBoundingClientRect().top + window.pageYOffset - headerHeight;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <section
      id="services"
      className="relative flex min-h-[calc(100vh-5rem)] flex-col justify-center bg-[#2A2A28]/30 py-[30px] md:py-12 will-reveal"
    >
      <div className="container mx-auto px-6 md:px-10 lg:px-12">
        <div className="mb-6 text-center md:mb-8">
          <Badge>Наши услуги</Badge>
          <h2 className="mb-2 mt-3 font-play text-4xl font-bold md:mb-3 md:mt-4 md:text-5xl">
            Что мы делаем
          </h2>
          <p className="mx-auto max-w-2xl text-base text-gray-400 md:text-lg">
            Комплексные решения для вашего объекта
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {services.map((s) => (
            <div key={s.title} className="will-reveal h-full">
              <Card className="flex h-full flex-col border-brand/20 bg-ink transition-all duration-300 hover:border-brand">
                <CardHeader className="p-4 pb-1 md:p-5 md:pb-2">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Icon name={s.icon} className="h-6 w-6" />
                    </div>
                    <CardTitle className="font-play text-xl text-white md:text-2xl">
                      {s.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-sm text-gray-400">
                    {s.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-1 md:p-5 md:pt-2 border-t border-brand/10 mt-1 flex-1 flex flex-col">
                  <ul className="grid grid-cols-1 gap-y-1 text-sm md:grid-cols-2 md:gap-x-6 md:gap-y-1.5 flex-1">
                    {s.items.map((it) => (
                      <li key={it} className="flex items-center text-gray-300">
                        <Icon
                          name="check"
                          className="mr-2 h-4 w-4 flex-shrink-0 text-brand"
                        />
                        {it}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <button
                      onClick={() => scrollToSection("calculator")}
                      className="w-full rounded-xl bg-brand px-4 py-2 text-sm text-ink transition hover:opacity-90"
                    >
                      Узнать стоимость
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
