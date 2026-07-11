import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ProjectCard from "./ProjectCard";
import SaleProjectCard from "@/components/sale/SaleProjectCard";

const baseProject = {
  id: "DV-114",
  title: "Проект DV-114",
  type: "Дизайн проекты",
  images: ["/project.jpg"],
  attributes: {},
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

describe("project card navigation", () => {
  it("links both the image and title in a portfolio card", () => {
    render(
      <MemoryRouter>
        <ProjectCard project={baseProject} titleHref="/catalog/DV-114" />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "Открыть проект «Проект DV-114»" }),
    ).toHaveAttribute("href", "/catalog/DV-114");
    expect(screen.getByRole("link", { name: "Проект DV-114" })).toHaveAttribute(
      "href",
      "/catalog/DV-114",
    );
  });

  it("links both the image and title in a sale project card", () => {
    render(
      <MemoryRouter>
        <SaleProjectCard
          project={{ ...baseProject, price: "31500" }}
          titleHref="/projects/DV-114"
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "Открыть проект «Проект DV-114»" }),
    ).toHaveAttribute("href", "/projects/DV-114");
    expect(screen.getByRole("link", { name: "Проект DV-114" })).toHaveAttribute(
      "href",
      "/projects/DV-114",
    );
  });

  it("opens a portfolio project when the card body is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/catalog"]}>
        <ProjectCard project={baseProject} titleHref="/catalog/DV-114" />
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("Дизайн проекты"));

    expect(screen.getByTestId("location")).toHaveTextContent("/catalog/DV-114");
  });

  it("opens a sale project when the card body is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <SaleProjectCard
          project={{ ...baseProject, price: "31500" }}
          titleHref="/projects/DV-114"
        />
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("Дизайн проекты"));

    expect(screen.getByTestId("location")).toHaveTextContent("/projects/DV-114");
  });

  it("keeps the request button action separate from card navigation", async () => {
    const user = userEvent.setup();
    const onRequestClick = vi.fn();

    render(
      <MemoryRouter initialEntries={["/projects"]}>
        <SaleProjectCard
          project={{ ...baseProject, price: "31500" }}
          titleHref="/projects/DV-114"
          onRequestClick={onRequestClick}
        />
        <LocationProbe />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Хочу" }));

    expect(onRequestClick).toHaveBeenCalledWith(expect.objectContaining({ id: "DV-114" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/projects");
  });
});
