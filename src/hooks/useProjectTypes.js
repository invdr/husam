import { useState, useEffect, useCallback } from "react";
import { pb } from "@/lib/pocketbase";
import { useMountedRef } from "@/hooks/useMountedRef";

const DEFAULT_TYPES = ["Дизайн проекты", "Ремонт", "Строительство"];

/**
 * Загружает категории проектов из PocketBase (коллекция project_types).
 * При ошибке или пустой таблице — используется дефолтный список.
 * @returns {{ types: string[], loading: boolean, error: Error | null, refetch: () => Promise<void> }}
 */
export function useProjectTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useMountedRef();

  const fetchTypes = useCallback(async () => {
    try {
      const data = await pb.collection("project_types").getFullList({
        sort: "sort_order",
      });
      if (!mountedRef.current) return;

      const names = (data || [])
        .map((r) => r.name)
        .filter(Boolean);

      setTypes(names.length > 0 ? names : DEFAULT_TYPES);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setTypes(DEFAULT_TYPES);
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
