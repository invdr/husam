import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ProjectCard from "./ProjectCard";
import SaleProjectCard from "@/components/sale/SaleProjectCard";

const baseProject = {
  id: "DV-114",
  title: "Проект DV-114",
  type: "Дизайн проекты",
  images: ["/project.jpg"],
  attributes: {},
};

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
});
