import { useState, useEffect, useCallback } from "react";
import { pb } from "@/lib/pocketbase";
import { useMountedRef } from "@/hooks/useMountedRef";

const DEFAULT_TYPES = ["Дома", "Бани", "Гаражи"];

/**
 * Загружает категории готовых проектов (sale_project_types).
 * Если таблица пока не создана, используется дефолтный список.
 */
export function useSaleProjectTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useMountedRef();

  const fetchTypes = useCallback(async () => {
    try {
      const data = await pb.collection("sale_project_types").getFullList({
        sort: "sort_order",
      });
      if (!mountedRef.current) return;

      const names = (data || [])
        .map((row) => row.name)
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
