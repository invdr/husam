import { useEffect } from "react";

/**
 * Предупреждает о несохранённых изменениях при закрытии/перезагрузке вкладки.
 * Пока `dirty` истинно — вешает beforeunload с preventDefault (браузер сам
 * покажет свой диалог подтверждения). Роутерные переходы не блокирует —
 * для этого используйте confirmDiscard в обработчике кнопки «Отмена».
 * @param {boolean} dirty
 */
export function useUnsavedChangesWarning(dirty) {
  useEffect(() => {
    if (!dirty) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      // Для совместимости со старыми браузерами.
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty]);
}

/**
 * Обёртка над window.confirm для подтверждения потери несохранённых изменений.
 * @param {string} [message]
 * @returns {boolean}
 */
export function confirmDiscard(
  message = "Есть несохранённые изменения. Точно закрыть без сохранения?"
) {
  return window.confirm(message);
}
