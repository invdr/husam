import { useEffect } from "react";

export function useUnsavedChangesWarning(dirty) {
  useEffect(() => {
    if (!dirty) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty]);
}

export function confirmDiscard(
  message = "Есть несохранённые изменения. Точно закрыть без сохранения?",
) {
  return window.confirm(message);
}
