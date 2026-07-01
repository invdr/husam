import { useEffect } from "react";

/**
 * Модальное окно подтверждения действия.
 * @param {{ title: string, message: string | React.ReactNode, confirmLabel?: string, cancelLabel?: string, variant?: 'danger' | 'default', onConfirm: () => void, onCancel: () => void }} props
 */
export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  variant = "default",
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onCancel]);

  const isDanger = variant === "danger";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-brand/30 bg-[#2A2A28] p-6 shadow-xl">
        <h3
          id="confirm-title"
          className="font-play text-lg font-bold text-white mb-2"
        >
          {title}
        </h3>
        <div className="text-gray-400 text-sm mb-6">{message}</div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="rounded-xl border border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700/50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              isDanger
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50"
                : "bg-brand text-ink hover:opacity-90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
