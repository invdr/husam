import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Catalog from "./Catalog";
import Projects from "./Projects";

const catalogProjectsMock = vi.hoisted(() => ({ value: [] }));
const saleProjectsMock = vi.hoisted(() => ({ value: [] }));
const catalogTypesMock = vi.hoisted(() => ({
  value: ["Дизайн проекты", "Ремонт"],
}));
const saleTypesMock = vi.hoisted(() => ({
  value: ["Дом", "Баня"],
}));
const catalogStatusMock = vi.hoisted(() => ({
  loading: false,
  isAuthoritative: true,
}));
const saleStatusMock = vi.hoisted(() => ({
  loading: false,
  isAuthoritative: true,
}));

vi.mock("@/hooks/useProjects", () => ({
  useProjects: () => ({
    projects: catalogProjectsMock.value,
    types: catalogTypesMock.value,
    loading: catalogStatusMock.loading,
    isAuthoritative: catalogStatusMock.isAuthoritative,
  }),
}));

vi.mock("@/hooks/useSaleProjects", () => ({
  useSaleProjects: () => ({
    projects: saleProjectsMock.value,
    types: saleTypesMock.value,
    loading: saleStatusMock.loading,
    isAuthoritative: saleStatusMock.isAuthoritative,
    error: null,
  }),
}));

vi.mock("@/hooks/useSiteSettings", () => ({
  useSiteSettings: () => ({ settings: {} }),
}));

vi.mock("@/components/catalog", () => ({
  ProjectCard: ({ project, titleHref }) => <Link to={titleHref}>{project.title}</Link>,
  ProjectCardSkeleton: () => null,
}));

vi.mock("@/components/sale", () => ({
  SaleProjectCard: ({ project, titleHref }) => <Link to={titleHref}>{project.title}</Link>,
  SaleProjectCardSkeleton: () => null,
}));

vi.mock("@/components/common/SeoHead", () => ({ default: () => null }));
vi.mock("@/components/common/JsonLd", () => ({
  default: () => null,
  BreadcrumbsJsonLd: () => null,
}));
vi.mock("@/utils/messenger", () => ({ openMessenger: () => {} }));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

function BackButton() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Назад к списку</button>;
}

function renderPage(path, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LocationProbe />
      <Routes>
        <Route path={path.split("?")[0]} element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.scrollTo = vi.fn();
  document.body.className = "";
  catalogTypesMock.value = ["Дизайн проекты", "Ремонт"];
  saleTypesMock.value = ["Дом", "Баня"];
  catalogStatusMock.loading = false;
  catalogStatusMock.isAuthoritative = true;
  saleStatusMock.loading = false;
  saleStatusMock.isAuthoritative = true;
  catalogProjectsMock.value = [
    {
      id: "D1",
      title: "Минималистичный интерьер",
      type: "Дизайн проекты",
      area: "82",
      images: [],
      attributes: { objectType: "2-к", style: "Минимализм" },
    },
    {
      id: "D2",
      title: "Неоклассический дом",
      type: "Дизайн проекты",
      area: "120",
      images: [],
      attributes: { objectType: "Частный дом", style: "Другое", styleOther: "Неоклассика" },
    },
  ];
  saleProjectsMock.value = [
    {
      id: "S1",
      title: "Доступный дом",
      type: "Дом",
      price: "25 000 ₽",
      bedrooms: "2",
      area: "90",
      material: "Кирпич",
      images: [],
    },
    {
      id: "S2",
      title: "Большой дом",
      type: "Дом",
      price: "45 000 ₽",
      bedrooms: "4",
      area: "180",
      material: "Кирпич",
      images: [],
    },
  ];
});

describe("catalog filters UI", () => {
  it("скрывает пустые категории и фильтрует портфолио по существующему стилю", async () => {
    const user = userEvent.setup();
    renderPage("/catalog?type=all", <Catalog />);

    expect(screen.getByRole("button", { name: "Дизайн" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ремонт" })).not.toBeInTheDocument();

    const styleSelect = screen.getByLabelText("Стиль");
    expect(within(styleSelect).queryByRole("option", { name: "Лофт" })).not.toBeInTheDocument();

    await user.selectOptions(styleSelect, "Минимализм");

    expect(screen.getByText("Минималистичный интерьер")).toBeInTheDocument();
    expect(screen.queryByText("Неоклассический дом")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("style=%D0%9C"),
    );
    expect(screen.queryByRole("option", { name: "По бюджету ↓" })).not.toBeInTheDocument();
  });

  it("показывает только непустые типы и диапазоны стоимости готовых проектов", async () => {
    const user = userEvent.setup();
    renderPage("/projects?type=all&sort=default", <Projects />);

    expect(screen.getByRole("button", { name: "Дом" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Баня" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Спальни")).toBeInTheDocument();

    const priceSelect = screen.getByLabelText("Стоимость");
    expect(within(priceSelect).queryByRole("option", { name: "30 000 – 40 000 ₽" })).not.toBeInTheDocument();

    await user.selectOptions(priceSelect, "0-29999");

    expect(screen.getByText("Доступный дом")).toBeInTheDocument();
    expect(screen.queryByText("Большой дом")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Фильтры · 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Удалить фильтр до 30 000 ₽/ })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("price=0-29999"),
    );
  });

  it("не возвращает удалённые категории из осиротевших записей", () => {
    catalogProjectsMock.value.push({
      id: "ORPHAN-C",
      title: "Старая категория портфолио",
      type: "Удалённая категория",
      area: "100",
      images: [],
      attributes: {},
    });
    saleProjectsMock.value.push({
      id: "ORPHAN-S",
      title: "Старая категория проекта",
      type: "Двухэтажные проекты",
      price: "40 000 ₽",
      images: [],
    });

    const { unmount } = renderPage("/catalog?type=all", <Catalog />);
    expect(
      screen.queryByRole("button", { name: "Удалённая категория" }),
    ).not.toBeInTheDocument();
    unmount();

    renderPage("/projects?type=all&sort=default", <Projects />);
    expect(
      screen.queryByRole("button", { name: "Двухэтажные проекты" }),
    ).not.toBeInTheDocument();
  });

  it("сбрасывает несовместимые фасеты при смене типа готового проекта", async () => {
    const user = userEvent.setup();
    saleProjectsMock.value.push({
      id: "B1",
      title: "Деревянная баня",
      type: "Баня",
      price: "35 000 ₽",
      area: "50",
      bedrooms: "1",
      material: "Брус",
      images: [],
    });
    renderPage("/projects?type=all&sort=default", <Projects />);

    await user.click(screen.getByRole("button", { name: "Дом" }));
    await user.selectOptions(screen.getByLabelText("Стеновой материал"), "Кирпич");
    expect(screen.getByRole("button", { name: "Удалить фильтр Кирпич" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Баня" }));

    expect(screen.getByText("Деревянная баня")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Удалить фильтр Кирпич" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Фильтры · 0" })).toBeInTheDocument();
  });

  it("канонизирует устаревшие параметры фильтров из URL", async () => {
    const { unmount } = renderPage(
      "/projects?type=all&sort=default&material=Удалённый",
      <Projects />,
    );
    await waitFor(() =>
      expect(screen.getByTestId("location")).not.toHaveTextContent("material="),
    );
    expect(screen.getByText("Доступный дом")).toBeInTheDocument();
    unmount();

    renderPage("/catalog?type=all&style=Удалённый", <Catalog />);
    await waitFor(() =>
      expect(screen.getByTestId("location")).not.toHaveTextContent("style="),
    );
    expect(screen.getByText("Минималистичный интерьер")).toBeInTheDocument();
  });

  it("канонизирует удалённый тип даже при полностью пустой выдаче", async () => {
    catalogProjectsMock.value = [];
    saleProjectsMock.value = [];

    const { unmount } = renderPage(
      "/catalog?type=Удалённая",
      <Catalog />,
    );
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/catalog?type=all",
      ),
    );
    unmount();

    renderPage("/projects?type=Удалённая&sort=default", <Projects />);
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/projects?type=all&sort=default",
      ),
    );
  });

  it("сохраняет валидные deep-link фильтры до завершения cold-start загрузки", async () => {
    const initialCatalogProjects = catalogProjectsMock.value;
    const initialCatalogTypes = catalogTypesMock.value;
    catalogProjectsMock.value = [];
    catalogTypesMock.value = [];
    catalogStatusMock.loading = true;
    catalogStatusMock.isAuthoritative = false;

    const catalogPath =
      "/catalog?type=%D0%94%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%BF%D1%80%D0%BE%D0%B5%D0%BA%D1%82%D1%8B&style=%D0%9C%D0%B8%D0%BD%D0%B8%D0%BC%D0%B0%D0%BB%D0%B8%D0%B7%D0%BC";
    const catalogView = renderPage(catalogPath, <Catalog />);

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("style="),
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("type=all");

    catalogProjectsMock.value = initialCatalogProjects;
    catalogTypesMock.value = initialCatalogTypes;
    catalogStatusMock.loading = false;
    catalogStatusMock.isAuthoritative = true;
    catalogView.rerender(
      <MemoryRouter initialEntries={[catalogPath]}>
        <LocationProbe />
        <Routes>
          <Route path="/catalog" element={<Catalog />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Минималистичный интерьер")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("style=");
    expect(screen.getByTestId("location")).not.toHaveTextContent("type=all");
    catalogView.unmount();

    const initialSaleProjects = saleProjectsMock.value;
    const initialSaleTypes = saleTypesMock.value;
    saleProjectsMock.value = [];
    saleTypesMock.value = [];
    saleStatusMock.loading = true;
    saleStatusMock.isAuthoritative = false;
    const salePath = "/projects?type=%D0%94%D0%BE%D0%BC&sort=default&price=0-29999";
    const saleView = renderPage(salePath, <Projects />);

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("price=0-29999"),
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("type=all");

    saleProjectsMock.value = initialSaleProjects;
    saleTypesMock.value = initialSaleTypes;
    saleStatusMock.loading = false;
    saleStatusMock.isAuthoritative = true;
    saleView.rerender(
      <MemoryRouter initialEntries={[salePath]}>
        <LocationProbe />
        <Routes>
          <Route path="/projects" element={<Projects />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Доступный дом")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("price=0-29999");
    expect(screen.getByTestId("location")).not.toHaveTextContent("type=all");
  });

  it("не канонизирует новую категорию по устаревшему module cache", async () => {
    catalogProjectsMock.value = [
      {
        id: "OLD-C",
        title: "Старый ремонт",
        type: "Ремонт",
        images: [],
        attributes: {},
      },
    ];
    catalogTypesMock.value = ["Ремонт"];
    catalogStatusMock.loading = false;
    catalogStatusMock.isAuthoritative = false;
    const path =
      "/catalog?type=%D0%94%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%BF%D1%80%D0%BE%D0%B5%D0%BA%D1%82%D1%8B&style=%D0%9C%D0%B8%D0%BD%D0%B8%D0%BC%D0%B0%D0%BB%D0%B8%D0%B7%D0%BC";
    const view = renderPage(path, <Catalog />);

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("style="),
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("type=all");

    catalogProjectsMock.value = [
      {
        id: "NEW-C",
        title: "Новый дизайн",
        type: "Дизайн проекты",
        area: "80",
        images: [],
        attributes: { style: "Минимализм" },
      },
    ];
    catalogTypesMock.value = ["Дизайн проекты"];
    catalogStatusMock.isAuthoritative = true;
    view.rerender(
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe />
        <Routes>
          <Route path="/catalog" element={<Catalog />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Новый дизайн")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("style=");
    expect(screen.getByTestId("location")).not.toHaveTextContent("type=all");
  });

  it("сохраняет page=2, пока маленький cache обновляется полной выдачей", async () => {
    catalogProjectsMock.value = [
      {
        id: "CACHE-1",
        title: "Cached project",
        type: "Дизайн проекты",
        images: [],
        attributes: {},
      },
    ];
    catalogTypesMock.value = ["Дизайн проекты"];
    catalogStatusMock.loading = false;
    catalogStatusMock.isAuthoritative = false;
    const path = "/catalog?type=all&page=2";
    const view = renderPage(path, <Catalog />);

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("page=2"),
    );

    catalogProjectsMock.value = Array.from({ length: 13 }, (_, index) => ({
      id: `FRESH-${index + 1}`,
      title: `Fresh project ${index + 1}`,
      type: "Дизайн проекты",
      images: [],
      attributes: {},
    }));
    catalogStatusMock.isAuthoritative = true;
    view.rerender(
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe />
        <Routes>
          <Route path="/catalog" element={<Catalog />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Fresh project 13")).toBeInTheDocument();
    expect(screen.queryByText("Fresh project 1")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("page=2");
  });

  it("пишет явные действия пользователя в URL даже без authority", async () => {
    const user = userEvent.setup();
    catalogStatusMock.loading = false;
    catalogStatusMock.isAuthoritative = false;
    const catalogView = renderPage("/catalog?type=all", <Catalog />);

    await user.selectOptions(screen.getByLabelText("Стиль"), "Минимализм");
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("style="),
    );
    expect(screen.getByText("Минималистичный интерьер")).toBeInTheDocument();
    catalogView.unmount();

    saleStatusMock.loading = false;
    saleStatusMock.isAuthoritative = false;
    renderPage("/projects?type=all&sort=default", <Projects />);

    await user.selectOptions(screen.getByLabelText("Стоимость"), "0-29999");
    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent("price=0-29999"),
    );
    expect(screen.getByText("Доступный дом")).toBeInTheDocument();
    expect(screen.queryByText("Большой дом")).not.toBeInTheDocument();
  });

  it("канонизирует номер страницы при пустом портфолио", async () => {
    catalogProjectsMock.value = [];
    renderPage("/catalog?type=all&page=999", <Catalog />);

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/catalog?type=all",
      ),
    );
    expect(screen.getByTestId("location")).not.toHaveTextContent("page=");
  });

  it("скрывает бесполезные сортировки готовых проектов", () => {
    saleProjectsMock.value = saleProjectsMock.value.map((project) => ({
      ...project,
      price: "30 000 ₽",
      area: "100",
    }));
    renderPage("/projects?type=all&sort=price-desc", <Projects />);

    const sort = screen.getByLabelText("Сортировка списка проектов");
    expect(within(sort).getAllByRole("option")).toHaveLength(1);
    expect(within(sort).getByRole("option", { name: "По умолчанию" })).toBeInTheDocument();
  });

  it("не показывает пустой mobile-контрол дополнительных фильтров", () => {
    saleProjectsMock.value = [
      {
        id: "EMPTY",
        title: "Проект без фасетов",
        type: "Дом",
        price: "",
        area: "",
        images: [],
      },
    ];
    renderPage("/projects?type=all&sort=default", <Projects />);

    expect(screen.queryByRole("button", { name: "Фильтры · 0" })).not.toBeInTheDocument();
    expect(screen.getByText("Проект без фасетов")).toBeInTheDocument();
  });

  it("полностью сбрасывает цену из пустой выдачи", async () => {
    const user = userEvent.setup();
    renderPage(
      "/projects?type=all&sort=default&price=0-29999&area=150-200",
      <Projects />,
    );

    await user.click(screen.getByRole("button", { name: "Сбросить фильтры" }));

    expect(screen.getByRole("button", { name: "Фильтры · 0" })).toBeInTheDocument();
    expect(screen.getByText("Доступный дом")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("location")).not.toHaveTextContent("price=");
      expect(screen.getByTestId("location")).not.toHaveTextContent("area=");
    });
  });

  it("восстанавливает фильтр портфолио после перехода в карточку и назад", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/catalog?type=all"]}>
        <LocationProbe />
        <Routes>
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/catalog/:projectId" element={<BackButton />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.selectOptions(screen.getByLabelText("Стиль"), "Минимализм");
    await user.click(screen.getByRole("link", { name: "Минималистичный интерьер" }));
    await user.click(screen.getByRole("button", { name: "Назад к списку" }));

    expect(screen.getByLabelText("Стиль")).toHaveValue("Минимализм");
    expect(screen.getByText("Минималистичный интерьер")).toBeInTheDocument();
  });

});
