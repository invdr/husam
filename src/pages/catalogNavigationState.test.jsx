import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Catalog from "./Catalog";
import Projects from "./Projects";

const catalogProjectsMock = vi.hoisted(() => ({ value: [] }));
const saleProjectsMock = vi.hoisted(() => ({ value: [] }));

vi.mock("@/hooks/useProjects", () => ({
  useProjects: () => ({
    projects: catalogProjectsMock.value,
    types: ["Ремонт"],
    loading: false,
  }),
}));

vi.mock("@/hooks/useSaleProjects", () => ({
  useSaleProjects: () => ({
    projects: saleProjectsMock.value,
    types: ["Дом"],
    loading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useSiteSettings", () => ({
  useSiteSettings: () => ({
    settings: {},
  }),
}));

vi.mock("@/components/catalog", () => ({
  ProjectCard: ({ project, titleHref }) =>
    titleHref ? <Link to={titleHref}>{project.title}</Link> : <article>{project.title}</article>,
  ProjectCardSkeleton: () => null,
}));

vi.mock("@/components/sale", () => ({
  SaleProjectCard: ({ project, titleHref }) =>
    titleHref ? <Link to={titleHref}>{project.title}</Link> : <article>{project.title}</article>,
  SaleProjectCardSkeleton: () => null,
}));

vi.mock("@/components/common/SeoHead", () => ({
  default: () => null,
}));

vi.mock("@/components/common/JsonLd", () => ({
  default: () => null,
  BreadcrumbsJsonLd: () => null,
}));

vi.mock("@/utils/messenger", () => ({
  openMessenger: () => {},
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}

function makeCatalogProjects(count) {
  return Array.from({ length: count }, (_, index) => {
    const id = `C${index + 1}`;
    return {
      id,
      title: `Catalog project ${index + 1}`,
      type: "Ремонт",
      images: [],
    };
  });
}

function makeSaleProjects(count) {
  return Array.from({ length: count }, (_, index) => {
    const id = `S${index + 1}`;
    return {
      id,
      title: `Sale project ${index + 1}`,
      type: "Дом",
      images: [],
      price: "100000",
    };
  });
}

beforeEach(() => {
  window.scrollTo = vi.fn();
  catalogProjectsMock.value = makeCatalogProjects(25);
  saleProjectsMock.value = makeSaleProjects(25);
});

describe("catalog navigation state", () => {
  it("opens catalog detail with the current page in the URL", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/catalog?type=all&page=2"]}>
        <LocationProbe />
        <Routes>
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/catalog/:projectId" element={<div>Detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Catalog project 13")).toBeInTheDocument();
    expect(screen.queryByText("Catalog project 1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Catalog project 13" }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/catalog/C13?type=all&page=2",
      ),
    );
  });

  it("opens sale project detail with the current page in the URL", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/projects?type=all&sort=default&page=2"]}>
        <LocationProbe />
        <Routes>
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<div>Detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Sale project 13")).toBeInTheDocument();
    expect(screen.queryByText("Sale project 1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Sale project 13" }));

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/projects/S13?type=all&sort=default&page=2",
      ),
    );
  });
});
