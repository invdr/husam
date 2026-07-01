import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import SeoHead from "./SeoHead";

function renderSeoHead(props = {}) {
  return render(
    <HelmetProvider>
      <SeoHead {...props} />
    </HelmetProvider>
  );
}

describe("SeoHead", () => {
  it("по умолчанию ставит OG-изображение из публичного /husam_og_1.jpg", async () => {
    renderSeoHead();
    await waitFor(() => {
      const ogImage = document.head.querySelector('meta[property="og:image"]');
      expect(ogImage).toBeInTheDocument();
      expect(ogImage?.getAttribute("content")).toBe(
        `${window.location.origin}/husam_og_1.jpg`
      );
    });
  });

  it("проставляет абсолютный URL для пользовательского относительного изображения", async () => {
    renderSeoHead({ image: "/custom-preview.jpg" });
    await waitFor(() => {
      const ogImage = document.head.querySelector('meta[property="og:image"]');
      expect(ogImage?.getAttribute("content")).toBe(
        `${window.location.origin}/custom-preview.jpg`
      );
    });
  });
});
