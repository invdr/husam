import { useEffect, useRef } from "react";

/**
 * Реф, показывающий, смонтирован ли ещё компонент.
 * Используется как guard от setState после unmount в асинхронных fetch-хуках.
 */
export function useMountedRef() {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return mountedRef;
}
