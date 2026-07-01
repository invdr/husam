import { useState, useEffect, useCallback } from "react";
import { pb } from "@/lib/pocketbase";

const DEFAULT_TYPES = ["Дома", "Бани", "Гаражи"];

/**
 * Загружает категории готовых проектов (sale_project_types).
 * Если таблица пока не создана, используется дефолтный список.
 */
export function useSaleProjectTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTypes = useCallback(async () => {
    try {
      const data = await pb.collection("sale_project_types").getFullList({
        sort: "sort_order",
      });

      const names = (data || [])
        .map((row) => row.name)
        .filter(Boolean);

      setTypes(names.length > 0 ? names : DEFAULT_TYPES);
      setError(null);
    } catch (err) {
      setTypes(DEFAULT_TYPES);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  return { types, loading, error, refetch: fetchTypes };
}
