import { useEffect } from "react";
import Icon from "./Icon";

/**
 * Модальное окно с заголовком и кнопкой закрытия.
 * @param {{ title: string, children: React.ReactNode, onClose: () => void, maxWidth?: string }} props
 */
export default function Modal({ title, children, onClose, maxWidth = "max-w-lg" }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Закрыть"
      />
      <div
        className={`relative z-10 w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl border border-brand/30 bg-[#2A2A28] p-6 shadow-xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 id="modal-title" className="font-play text-lg font-bold text-white">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-ink hover:text-white transition-colors"
            aria-label="Закрыть"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
