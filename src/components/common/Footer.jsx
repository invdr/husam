import { Typewriter } from "@/components/ui/Typewriter";

export default function Footer() {
  // Обработчик плавной прокрутки к якорю
  const handleAnchorClick = (e, anchorId) => {
    e.preventDefault();
    const element = document.getElementById(anchorId);
    if (element) {
      const headerHeight = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - headerHeight;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    } else {
      window.location.href = `/#${anchorId}`;
    }
  };

  return (
    <footer className="border-t border-brand/20 bg-[#1E1E1B]">
      <div className="container mx-auto px-6 md:px-10 lg:px-12 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div>
                <div className="font-play text-lg font-bold text-brand leading-tight">
                  ООО «ХусамСтройИнвест»
                </div>
                <div className="text-xs text-gray-500">
                  ОГРН 1212000004149
                </div>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <a
                  href="tel:+79289453131"
                  className="hover:text-brand transition"
                >
                  +7 (928) 945-31-31
                </a>
              </li>
              <li>
                <a
                  href="mailto:husamstroy_2020@mail.ru"
                  className="hover:text-brand transition"
                >
                  husamstroy_2020@mail.ru
                </a>
              </li>
              <li className="text-gray-400">
                Чеченская Республика,
                <br />
                г. Грозный, пр-т Кадырова, 274
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-play text-lg font-bold mb-4 text-white">
              Ссылки
            </h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <a
                  href="/#services"
                  onClick={(e) => handleAnchorClick(e, "services")}
                  className="hover:text-brand transition"
                >
                  Услуги
                </a>
              </li>
              <li>
                <a
                  href="/#portfolio"
                  onClick={(e) => handleAnchorClick(e, "portfolio")}
                  className="hover:text-brand transition"
                >
                  Портфолио
                </a>
              </li>
              <li>
                <a
                  href="/#process"
                  onClick={(e) => handleAnchorClick(e, "process")}
                  className="hover:text-brand transition"
                >
                  Процесс
                </a>
              </li>
              <li>
                <a
                  href="/#contacts"
                  onClick={(e) => handleAnchorClick(e, "contacts")}
                  className="hover:text-brand transition"
                >
                  Контакты
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-play text-lg font-bold mb-4 text-white">
              Документы
            </h4>
            <p className="max-w-xs text-sm text-gray-300">
              Юридические документы предоставляются по запросу.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-brand/20">
        <div className="container mx-auto px-6 md:px-10 lg:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between py-6 gap-3">
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} HUSAM. Все права защищены.
            </div>
            <a
              href="https://noema.digital/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs md:text-sm text-gray-400 hover:text-brand transition shrink-0 min-w-[260px] justify-center md:justify-start"
            >
              <Typewriter
                words={["Сайт разработан компанией NOEMA"]}
                speed={50}
                delayBetweenWords={4000}
                cursor={true}
                cursorChar="|"
              />
            </a>
            <div className="text-xs text-gray-500">
              Работая с сайтом, вы соглашаетесь с нашей{" "}
              политикой конфиденциальности
              .
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
