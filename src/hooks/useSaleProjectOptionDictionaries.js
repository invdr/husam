import { useCallback, useEffect, useMemo, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { withRequestTimeout } from "@/lib/requestTimeout";
import { useMountedRef } from "@/hooks/useMountedRef";
import { SALE_PROJECT_OPTION_DICTIONARIES } from "@/data/saleProjectOptionDictionaries";

function uniqueSorted(items) {
  const set = new Set();
  for (const item of items || []) {
    const value = String(item ?? "").trim();
    if (value) set.add(value);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function uniqueInOrder(items) {
  const set = new Set();
  const values = [];
  for (const item of items || []) {
    const value = String(item ?? "").trim();
    if (!value || set.has(value)) continue;
    set.add(value);
    values.push(value);
  }
  return values;
}

function buildFallbackOptions(existingProjects) {
  return Object.fromEntries(
    SALE_PROJECT_OPTION_DICTIONARIES.map((dict) => [
      dict.key,
      uniqueSorted((existingProjects || []).map((project) => project?.[dict.projectField])),
    ]),
  );
}

export function useSaleProjectOptionDictionaries(existingProjects = []) {
  const mountedRef = useMountedRef();
  const fallbackOptions = useMemo(
    () => buildFallbackOptions(existingProjects),
    [existingProjects],
  );
  const [options, setOptions] = useState(fallbackOptions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDictionaries = useCallback(async () => {
    try {
      const results = await withRequestTimeout(
        Promise.allSettled(
          SALE_PROJECT_OPTION_DICTIONARIES.map((dict) =>
            pb.collection(dict.collection).getFullList({
              sort: "sort_order,name",
              fields: "name,sort_order",
            }),
          ),
        ),
        "sale project option dictionaries fetch",
      );
      if (!mountedRef.current) return;

      const nextOptions = {};
      const errors = [];
      results.forEach((result, index) => {
        const dict = SALE_PROJECT_OPTION_DICTIONARIES[index];
        if (result.status === "fulfilled") {
          const names = uniqueInOrder((result.value || []).map((row) => row.name));
          nextOptions[dict.key] = names.length > 0 ? names : fallbackOptions[dict.key];
          return;
        }
        nextOptions[dict.key] = fallbackOptions[dict.key];
        errors.push(result.reason);
      });

      setOptions(nextOptions);
      setError(errors[0] ?? null);
    } catch (err) {
      if (!mountedRef.current) return;
      setOptions(fallbackOptions);
      setError(err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fallbackOptions, mountedRef]);

  useEffect(() => {
    fetchDictionaries();
  }, [fetchDictionaries]);

  return { options, loading, error, refetch: fetchDictionaries };
}
