import { useState } from "react";
import { Link } from "react-router-dom";
import CatalogEditor from "./Admin/CatalogEditor";
import SaleProjectsEditor from "./Admin/SaleProjectsEditor";
import SettingsEditor from "@/components/admin/SettingsEditor";
import FAQEditor from "@/components/admin/FAQEditor";
import QuizEditor from "@/components/admin/QuizEditor";
import Icon from "@/components/common/Icon";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useQuiz } from "@/hooks/useQuiz";

const SECTIONS = [
  { id: "catalog", label: "Каталог", icon: "folder-x" },
  { id: "sale-projects", label: "Проекты на продажу", icon: "building-2" },
  { id: "contacts", label: "Контакты", icon: "mail" },
  { id: "faq", label: "FAQ", icon: "help-circle" },
  { id: "quiz", label: "Квиз", icon: "list-checks" },
];

export default function Admin() {
  const [section, setSection] = useState("catalog");
  const siteSettings = useSiteSettings();
  const quizData = useQuiz();

  return (
    <section className="min-h-screen bg-[#2A2A28]/30 py-8 md:py-12">
      <div className="container mx-auto px-6 md:px-10 lg:px-12">
        <div className="mb-6 flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl border border-brand/30 px-4 py-2 text-sm font-medium text-white transition hover:border-brand hover:bg-brand/10"
          >
            <Icon name="arrow-right" className="h-4 w-4 rotate-180" />
            На главную
          </Link>
          <h1 className="font-play text-3xl font-bold text-white">
            Админ-панель
          </h1>
        </div>

        <nav className="mb-6 flex flex-wrap gap-2 border-b border-brand/20 pb-4">
          {SECTIONS.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                section === id
                  ? "border-brand bg-brand/20 text-white"
                  : "border-brand/20 text-gray-400 hover:border-brand/40 hover:text-white"
              }`}
            >
              <Icon name={icon} className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="rounded-xl border border-brand/20 bg-[#2A2A28] p-6">
          <div className={section === "catalog" ? "" : "hidden"}>
            <CatalogEditor />
          </div>
          <div className={section === "sale-projects" ? "" : "hidden"}>
            <SaleProjectsEditor />
          </div>
          <div className={section === "contacts" ? "" : "hidden"}>
            <SettingsEditor
              key={
                siteSettings.loading
                  ? "loading"
                  : JSON.stringify(siteSettings.settings)
              }
              {...siteSettings}
            />
          </div>
          <div className={section === "faq" ? "" : "hidden"}>
            <FAQEditor />
          </div>
          <div className={section === "quiz" ? "" : "hidden"}>
            <QuizEditor
              key={
                quizData.loading
                  ? "loading"
                  : JSON.stringify(quizData.config)
              }
              {...quizData}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
