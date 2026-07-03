import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Projects from "./Projects";

vi.mock("@/hooks/useSaleProjects", () => ({
  useSaleProjects: () => ({
    projects: [],
    loading: false,
    error: new Error("smoke"),
  }),
}));

vi.mock("@/hooks/useSaleProjectTypes", () => ({
  useSaleProjectTypes: () => ({
    types: [],
  }),
}));

vi.mock("@/hooks/useSiteSettings", () => ({
  useSiteSettings: () => ({
    settings: {},
  }),
}));

vi.mock("@/components/common", () => ({
  Badge: ({ children }) => <span>{children}</span>,
  Icon: () => <span aria-hidden="true" />,
  Pagination: () => null,
}));

vi.mock("@/components/sale", () => ({
  SaleProjectCard: () => null,
  SaleProjectCardSkeleton: () => null,
}));

vi.mock("@/components/common/SeoHead", () => ({
  default: () => null,
}));

vi.mock("@/components/common/JsonLd", () => ({
  BreadcrumbsJsonLd: () => null,
}));

vi.mock("@/utils/messenger", () => ({
  openMessenger: () => {},
}));

describe("Projects smoke", () => {
  it("в error-banner нет упоминания Supabase", () => {
    window.scrollTo = vi.fn();
    render(
      <MemoryRouter>
        <Projects />
      </MemoryRouter>,
    );

    const banner = screen.getByText(/Не удалось загрузить данные готовых проектов/i);
    expect(banner).toBeInTheDocument();
    expect(screen.getByText(/PocketBase/i)).toBeInTheDocument();
    expect(screen.queryByText(/Supabase/i)).not.toBeInTheDocument();
  });
});
