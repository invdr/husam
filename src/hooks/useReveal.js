import { useEffect } from "react";

// IntersectionObserver to add reveal class
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".will-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("reveal");
        });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
