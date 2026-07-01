import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoadingProvider } from "@/contexts/LoadingContext";
import Header from "./Header";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, signOut: vi.fn() }),
}));

vi.mock("@/hooks/useSiteSettings", () => ({
  useSiteSettings: () => ({
    settings: { phone: "+7 (928) 945-31-31" },
  }),
}));

function renderHeader(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <LoadingProvider>
        <Header />
      </LoadingProvider>
    </MemoryRouter>
  );
}

describe("Header", () => {
  it("после открытия бургера панель мобильного меню в DOM и совпадает по брейкпоинту с кнопкой (lg)", async () => {
    const user = userEvent.setup();
    const { container } = renderHeader("/");

    await user.click(screen.getByRole("button", { name: /открыть меню/i }));

    const panel = container.querySelector(".fixed.inset-x-0.top-20.z-40");
    expect(panel).toBeTruthy();
    expect(panel.className).toContain("lg:hidden");
    expect(panel.className).not.toContain("md:hidden");

    expect(screen.getAllByRole("link", { name: "Услуги" }).length).toBeGreaterThanOrEqual(1);
  });
});
