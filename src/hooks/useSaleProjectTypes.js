import { useState, useEffect, useCallback } from "react";
import { pb } from "@/lib/pocketbase";
import { withRequestTimeout } from "@/lib/requestTimeout";
import { useMountedRef } from "@/hooks/useMountedRef";

/**
 * Загружает категории готовых проектов (sale_project_types).
 * Пустая или недоступная таблица не должна воскрешать удалённые категории.
 */
export function useSaleProjectTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useMountedRef();

  const fetchTypes = useCallback(async () => {
    try {
      const data = await withRequestTimeout(
        pb.collection("sale_project_types").getFullList({
          sort: "sort_order",
        }),
        "sale project types fetch"
      );
      if (!mountedRef.current) return;

      const names = (data || [])
        .map((row) => row.name)
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
