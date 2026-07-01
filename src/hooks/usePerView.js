import { useState, useEffect } from "react";

/**
 * Хук для определения количества элементов карусели на экране
 * в зависимости от ширины окна
 */
export function usePerView() {
  const [pv, setPv] = useState(3);

  useEffect(() => {
    const calc = () => {
      if (window.innerWidth < 768) {
        setPv(1); // Мобильные
      } else if (window.innerWidth < 1024) {
        setPv(2); // Планшеты
      } else {
        setPv(3); // Десктоп
      }
    };

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  return pv;
}
