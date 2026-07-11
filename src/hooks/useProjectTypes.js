import { useState, useEffect, useCallback } from "react";
import { pb } from "@/lib/pocketbase";
import { withRequestTimeout } from "@/lib/requestTimeout";
import { useMountedRef } from "@/hooks/useMountedRef";

/**
 * Загружает категории проектов из PocketBase (коллекция project_types).
 * Пустая таблица означает, что публичных категорий сейчас нет.
 * @returns {{ types: string[], loading: boolean, error: Error | null, refetch: () => Promise<void> }}
 */
export function useProjectTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useMountedRef();

  const fetchTypes = useCallback(async () => {
    try {
      const data = await withRequestTimeout(
        pb.collection("project_types").getFullList({
          sort: "sort_order",
        }),
        "project types fetch"
      );
      if (!mountedRef.current) return;

      const names = (data || [])
        .map((r) => r.name)
        .filter(Boolean);

      setTypes(names);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setTypes([]);
      setError(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [mountedRef]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  return { types, loading, error, refetch: fetchTypes };
}
