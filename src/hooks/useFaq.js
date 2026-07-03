import { useState, useEffect, useCallback } from "react";
import { pb } from "@/lib/pocketbase";
import { useMountedRef } from "@/hooks/useMountedRef";
import { FAQ_DEFAULTS } from "@/data/faqDefaults";

/**
 * Загружает список FAQ из PocketBase (коллекция faq), отсортированный по sort_order.
 * При ошибке или пустом ответе подставляется FAQ_DEFAULTS.
 * @returns {{ items: Array<{ id: string, question: string, answer: string, sort_order: number }>, loading: boolean, error: Error | null, refetch: () => Promise<void> }}
 */
export function useFaq() {
  const [items, setItems] = useState(() => [...FAQ_DEFAULTS]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useMountedRef();

  const fetchFaq = useCallback(async () => {
    try {
      const data = await pb.collection("faq").getFullList({
        sort: "sort_order",
      });
      if (!mountedRef.current) return;
      const list = data ?? [];
      setItems(list.length > 0 ? list : [...FAQ_DEFAULTS]);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err);
      setItems([...FAQ_DEFAULTS]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [mountedRef]);

  useEffect(() => {
    fetchFaq();
  }, [fetchFaq]);

  return { items, loading, error, refetch: fetchFaq };
}
