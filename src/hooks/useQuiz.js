import { useState, useEffect, useCallback } from "react";
import { pb } from "@/lib/pocketbase";
import { withRequestTimeout } from "@/lib/requestTimeout";
import { useMountedRef } from "@/hooks/useMountedRef";
import { QUIZ_DEFAULTS } from "@/data/quizDefaults";

const QUIZ_KEY = "quiz_config";

function parseQuizConfig(value) {
  if (value == null || value === "") return QUIZ_DEFAULTS;
  try {
    const parsed = JSON.parse(value);
    const baseSteps = Array.isArray(parsed.steps)
      ? parsed.steps
      : QUIZ_DEFAULTS.steps;

    // Нормализация первого шага: фиксируем набор типов работ и значения
    const workTypes = (QUIZ_DEFAULTS.steps?.[0]?.options ?? []).map(
      (o) => o.value
    );
    const normalizedSteps = [...baseSteps];
    if (normalizedSteps.length > 0) {
      const first = normalizedSteps[0] ?? {};
      if (Array.isArray(first.options)) {
        const existing = first.options ?? [];
        normalizedSteps[0] = {
          ...first,
          id: first.id ?? "type",
          options: workTypes.map((t) => {
            const match = existing.find((o) => (o.value ?? o.label) === t);
            return {
              value: t,
              label: match?.label ?? t,
            };
          }),
        };
      }
    }

    return {
      badge: parsed.badge ?? QUIZ_DEFAULTS.badge,
      title: parsed.title ?? QUIZ_DEFAULTS.title,
      subtitle: parsed.subtitle ?? QUIZ_DEFAULTS.subtitle,
      steps: normalizedSteps,
    };
  } catch {
    return QUIZ_DEFAULTS;
  }
}

/**
 * Загружает конфиг квиза из page_content (PocketBase). Для админа: updateQuiz(config) для сохранения.
 * @returns {{ config: object, loading: boolean, error: Error | null, refetch: () => Promise<void>, updateQuiz: (config: object) => Promise<void> }}
 */
export function useQuiz() {
  const [config, setConfig] = useState(() => ({ ...QUIZ_DEFAULTS }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useMountedRef();

  const fetchQuiz = useCallback(async () => {
    try {
      const filter = `key = "${QUIZ_KEY}"`;
      const data = await withRequestTimeout(
        pb
          .collection("page_content")
          .getFirstListItem(filter)
          .catch(() => null),
        "quiz fetch"
      );
      if (!mountedRef.current) return;
      setConfig(parseQuizConfig(data?.value ?? null));
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err);
      setConfig({ ...QUIZ_DEFAULTS });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [mountedRef]);

  useEffect(() => {
    fetchQuiz();
  }, [fetchQuiz]);

  const updateQuiz = useCallback(async (updates) => {
    const merged = {
      ...config,
      ...updates,
      steps: updates.steps ?? config.steps,
    };
    const filter = `key = "${QUIZ_KEY}"`;
    const existing = await pb
      .collection("page_content")
      .getFirstListItem(filter)
      .catch(() => null);
    if (existing) {
      await pb.collection("page_content").update(existing.id, {
        key: QUIZ_KEY,
        value: JSON.stringify(merged),
      });
    } else {
      await pb.collection("page_content").create({
        key: QUIZ_KEY,
        value: JSON.stringify(merged),
      });
    }
    setConfig(merged);
  }, [config]);

  return {
    config,
    loading,
    error,
    refetch: fetchQuiz,
    updateQuiz,
  };
}
