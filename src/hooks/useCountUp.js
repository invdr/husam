import { useEffect } from "react";

// Count-up animation on view
export function useCountUp() {
  useEffect(() => {
    const targets = document.querySelectorAll(".count-up");
    const animated = new WeakSet();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            if (animated.has(el)) return;
            animated.add(el);
            const end = Number(el.getAttribute("data-target")) || 0;
            const duration = 1200;
            const startTime = performance.now();
            const step = (now) => {
              const t = Math.min(1, (now - startTime) / duration);
              const val = Math.floor(end * (1 - Math.pow(1 - t, 3)));
              el.textContent = val.toLocaleString("ru-RU");
              if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          }
        });
      },
      { threshold: 0.4 }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
}
