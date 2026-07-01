import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Pagination from "./Pagination";

/** Один экземпляр навигации (может быть два из-за Strict Mode). */
function getNav() {
  const navs = screen.getAllByRole("navigation", { name: "Пагинация" });
  return navs[0];
}

describe("Pagination", () => {
  it("при totalPages <= 1 ничего не рендерит", () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("при totalPages 2 рендерит навигацию и кнопки", () => {
    render(<Pagination page={1} totalPages={2} onPageChange={vi.fn()} />);
    const nav = getNav();
    expect(within(nav).getByLabelText("Предыдущая страница")).toBeInTheDocument();
    expect(within(nav).getByLabelText("Следующая страница")).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "2" })).toBeInTheDocument();
  });

  it("кнопка «Назад» disabled на первой странице", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} />);
    const nav = getNav();
    const prev = within(nav).getByLabelText("Предыдущая страница");
    expect(prev).toHaveAttribute("disabled");
  });

  it("кнопка «Вперёд» disabled на последней странице", () => {
    render(<Pagination page={5} totalPages={5} onPageChange={vi.fn()} />);
    const nextButtons = screen.getAllByLabelText("Следующая страница");
    expect(nextButtons.some((el) => el.hasAttribute("disabled"))).toBe(true);
  });

  it("при большом totalPages показывает многоточие и крайние страницы", () => {
    render(<Pagination page={5} totalPages={10} onPageChange={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: "1" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "10" })[0]).toBeInTheDocument();
    expect(screen.getAllByText("…").length).toBeGreaterThanOrEqual(1);
  });
});
