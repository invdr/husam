import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import Icon from "@/components/common/Icon";
import { QUIZ_DEFAULTS } from "@/data/quizDefaults";

const STEP_IDS = ["type", "direction", "budget", "contact"];
const WORK_TYPES = ["Строительство", "Ремонт", "Дизайн", "Проектирование"];

/** Приводит шаг из БД к форме для редактирования */
function stepToForm(step, index) {
  if (!step) return null;
  const id = step.id ?? STEP_IDS[index] ?? `step_${index}`;

  if (!step.options) {
    return {
      id,
      kind: "contact",
      question: typeof step.question === "string" ? step.question : "",
    };
  }

  if (Array.isArray(step.options)) {
    // Первый шаг (type) — фиксированный набор значений, редактируем только подписи
    if (id === "type") {
      const existing = step.options ?? [];
      return {
        id,
        kind: "simple",
        question: typeof step.question === "string" ? step.question : "",
        options: WORK_TYPES.map((t, i) => {
          const match = existing.find((o) => (o.value ?? o.label) === t);
          return {
            _localId:
              match?._localId ?? `simple-${id}-${i}`,
            value: t,
            label: match?.label ?? t,
          };
        }),
      };
    }

    return {
      id,
      kind: "simple",
      question: typeof step.question === "string" ? step.question : "",
      options: step.options.map((o, i) => ({
        _localId: o._localId ?? `simple-${id}-${i}`,
        value: o.value ?? o.label ?? "",
        label: o.label ?? o.value ?? "",
      })),
    };
  }

  // options — объект по типам
  return {
    id,
    kind: "per-type",
    questions: WORK_TYPES.reduce((acc, t) => {
      acc[t] =
        typeof step.question === "object" && step.question?.[t]
          ? step.question[t]
          : "";
      return acc;
    }, {}),
    optionsByType: WORK_TYPES.reduce((acc, t) => {
      acc[t] = (step.options?.[t] ?? []).map((o, i) => ({
        _localId: o._localId ?? `per-type-${id}-${t}-${i}`,
        value: o.value ?? o.label ?? "",
        label: o.label ?? o.value ?? "",
      }));
      return acc;
    }, {}),
  };
}

/** Собирает шаг из формы для сохранения */
function formToStep(form) {
  if (form.kind === "contact") {
    return { id: form.id, question: form.question.trim() };
  }

  if (form.kind === "simple") {
    // Первый шаг: фиксируем набор значений WORK_TYPES, сохраняем только подписи
    if (form.id === "type") {
      const byLabel = new Map(
        (form.options ?? [])
          .filter((o) => (o.value || o.label)?.trim())
          .map((o) => {
            const raw = (o.value || o.label || "").trim();
            const label = (o.label || o.value || "").trim();
            return [raw, label];
          })
      );

      const options = WORK_TYPES.map((t) => ({
        value: t,
        label: byLabel.get(t) ?? t,
      }));

      return {
        id: form.id,
        question: form.question.trim(),
        options,
      };
    }

    const options = (form.options ?? [])
      .filter((o) => (o.value || o.label)?.trim())
      .map((o) => ({
        value: (o.value || o.label || "").trim(),
        label: (o.label || o.value || "").trim(),
      }));
    return {
      id: form.id,
      question: form.question.trim(),
      options,
    };
  }

  // per-type
  const question = {};
  const options = {};
  WORK_TYPES.forEach((t) => {
    if ((form.questions?.[t] ?? "").trim()) question[t] = form.questions[t].trim();
    options[t] = (form.optionsByType?.[t] ?? [])
      .filter((o) => (o.value || o.label)?.trim())
      .map((o) => ({
        value: (o.value || o.label || "").trim(),
        label: (o.label || o.value || "").trim(),
      }));
  });
  return { id: form.id, question, options };
}

/** Шаг «контакт» всегда последний в списке */
function stepsWithContactLast(steps) {
  const contact = steps.find((s) => s.kind === "contact");
  if (!contact) return steps;
  const rest = steps.filter((s) => s.kind !== "contact");
  return [...rest, contact];
}

export default function QuizEditor({
  config,
  loading,
  error,
  refetch,
  updateQuiz,
}) {
  const [form, setForm] = useState(() => ({
    badge: config.badge ?? "",
    title: config.title ?? "",
    subtitle: config.subtitle ?? "",
  }));
  const [stepForms, setStepForms] = useState(() => {
    const steps = config.steps ?? [];
    const forms = steps.map((s, i) => stepToForm(s, i)).filter(Boolean);
    return stepsWithContactLast(forms);
  });
  const [saving, setSaving] = useState(false);
  const [dirtyOptions, setDirtyOptions] = useState({});
  const addedStepIdRef = useRef(null);

  useEffect(() => {
    const id = addedStepIdRef.current;
    if (!id) return;
    addedStepIdRef.current = null;
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stepForms]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateStep = (index, updates) => {
    setStepForms((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  const updateStepQuestion = (index, value) => {
    updateStep(index, { question: value });
  };

  const updateStepOptions = (index, options) => {
    updateStep(index, { options });
  };

  const addOption = (stepIndex) => {
    const step = stepForms[stepIndex];
    if (!step) return;
    if (step.id === "type") {
      toast.warning(
        "Добавление новых вариантов первого шага настраивается через разработчика, чтобы не поломать логику квиза."
      );
      return;
    }
    if (step.kind === "simple") {
      const newOpt = {
        _localId: `simple-${step.id}-${Date.now()}-${(step.options ?? []).length}`,
        value: "",
        label: "",
      };
      const nextOptions = [...(step.options ?? []), newOpt];
      updateStepOptions(stepIndex, nextOptions);
      setDirtyOptions((prev) => ({ ...prev, [newOpt._localId]: true }));
    } else if (step.kind === "per-type") {
      WORK_TYPES.forEach((t) => {
        const opts = step.optionsByType?.[t] ?? [];
        const newOpt = {
          _localId: `per-type-${step.id}-${t}-${Date.now()}-${opts.length}`,
          value: "",
          label: "",
        };
        updateStep(stepIndex, {
          optionsByType: {
            ...step.optionsByType,
            [t]: [...opts, newOpt],
          },
        });
        setDirtyOptions((prev) => ({ ...prev, [newOpt._localId]: true }));
      });
    }
  };

  const updateOption = (stepIndex, optIndex, field, value) => {
    const step = stepForms[stepIndex];
    if (step?.kind !== "simple" || !step.options) return;
    const next = [...step.options];
    const current = next[optIndex];
    const localId = current._localId ?? `simple-${step.id}-${optIndex}`;
    next[optIndex] = { ...current, _localId: localId, [field]: value };
    updateStepOptions(stepIndex, next);
    setDirtyOptions((prev) => ({ ...prev, [localId]: true }));
  };

  const removeOption = (stepIndex, optIndex) => {
    const step = stepForms[stepIndex];
    if (!step || step.id === "type" || step.kind !== "simple" || !step.options)
      return;
    const toRemove = step.options[optIndex];
    const localId = toRemove?._localId;
    const nextOptions = step.options.filter((_, i) => i !== optIndex);
    updateStepOptions(stepIndex, nextOptions);
    if (localId) {
      setDirtyOptions((prev) => {
        const next = { ...prev };
        delete next[localId];
        return next;
      });
    }
  };

  const updatePerTypeQuestion = (stepIndex, type, value) => {
    const step = stepForms[stepIndex];
    if (step?.kind !== "per-type") return;
    updateStep(stepIndex, {
      questions: { ...step.questions, [type]: value },
    });
  };

  const updatePerTypeOption = (stepIndex, type, optIndex, field, value) => {
    const step = stepForms[stepIndex];
    if (step?.kind !== "per-type" || !step.optionsByType?.[type]) return;
    const opts = [...step.optionsByType[type]];
    const current = opts[optIndex];
    const localId =
      current._localId ?? `per-type-${step.id}-${type}-${optIndex}`;
    // При изменении подписи синхронизируем и value, чтобы не было дублей значений
    if (field === "label") {
      opts[optIndex] = {
        ...current,
        _localId: localId,
        label: value,
        value: value,
      };
    } else {
      opts[optIndex] = { ...current, _localId: localId, [field]: value };
    }
    updateStep(stepIndex, {
      optionsByType: { ...step.optionsByType, [type]: opts },
    });
    setDirtyOptions((prev) => ({ ...prev, [localId]: true }));
  };

  const removePerTypeOption = (stepIndex, type, optIndex) => {
    const step = stepForms[stepIndex];
    if (step?.kind !== "per-type" || !step.optionsByType?.[type]) return;
    const toRemove = step.optionsByType[type][optIndex];
    const localId = toRemove?._localId;
    updateStep(stepIndex, {
      optionsByType: {
        ...step.optionsByType,
        [type]: step.optionsByType[type].filter((_, i) => i !== optIndex),
      },
    });
    if (localId) {
      setDirtyOptions((prev) => {
        const next = { ...prev };
        delete next[localId];
        return next;
      });
    }
  };

  const addPerTypeOption = (stepIndex, type) => {
    const step = stepForms[stepIndex];
    if (step?.kind !== "per-type") return;
    const opts = step.optionsByType?.[type] ?? [];
    const newOpt = {
      _localId: `per-type-${step.id}-${type}-${Date.now()}-${opts.length}`,
      value: "",
      label: "",
    };
    updateStep(stepIndex, {
      optionsByType: {
        ...step.optionsByType,
        [type]: [...opts, newOpt],
      },
    });
    setDirtyOptions((prev) => ({ ...prev, [newOpt._localId]: true }));
  };

  const moveStep = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index >= stepForms.length - 1) return;
    const next = [...stepForms];
    const current = next[index];
    const target = next[index + direction];
    // Не даём двигать первый шаг type и не даём «перепрыгивать» через него
    if (current?.id === "type" || target?.id === "type") return;
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setStepForms(stepsWithContactLast(next));
  };

  /** Добавить новый шаг в конец (перед шагом «оставить телефон», если он последний) */
  const addStep = () => {
    const newId = `step_${Date.now()}`;
    const newStep = {
      id: newId,
      kind: "simple",
      question: "",
      options: [{ value: "", label: "" }],
    };
    setStepForms((prev) => {
      const last = prev[prev.length - 1];
      if (last?.kind === "contact") {
        return [...prev.slice(0, -1), newStep, last];
      }
      return [...prev, newStep];
    });
    addedStepIdRef.current = newId;
  };

  const removeStep = (index) => {
    if (stepForms.length <= 1) return;
    setStepForms((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let steps = stepForms.map((f) => formToStep(f)).filter((s) => s.id);
    if (steps.length === 0) {
      toast.error("Добавьте хотя бы один шаг");
      return;
    }
    // Шаг «оставить телефон» (без options) всегда последний
    const contactStep = steps.find((s) => !s.options);
    if (contactStep) {
      steps = [...steps.filter((s) => s.options), contactStep];
    }

    setSaving(true);
    try {
      await updateQuiz({
        badge: form.badge.trim(),
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        steps,
      });
      toast.success("Квиз сохранен");
      setDirtyOptions({});
      refetch();
    } catch (err) {
      toast.error(err?.message ?? "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const restoreDefaults = () => {
    setForm({
      badge: QUIZ_DEFAULTS.badge,
      title: QUIZ_DEFAULTS.title,
      subtitle: QUIZ_DEFAULTS.subtitle,
    });
    setStepForms(
      (QUIZ_DEFAULTS.steps ?? []).map((s, i) => stepToForm(s, i)).filter(Boolean)
    );
    toast.success("Восстановлены стандартные настройки");
  };

  const inputClass =
    "w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand";
  const labelClass = "mb-1 block text-sm text-gray-300";

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Icon name="loader" className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-red-400">Не удалось загрузить квиз: {error.message}</p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400">
        Заголовок и вопросы квиза отображаются на главной странице.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-brand/20 bg-ink/30 p-4 space-y-4">
          <h3 className="font-play text-lg font-bold text-white">
            Заголовок блока
          </h3>
          <div>
            <label htmlFor="quiz-badge" className={labelClass}>Метка (бейдж)</label>
            <input
              id="quiz-badge"
              type="text"
              value={form.badge}
              onChange={(e) => handleChange("badge", e.target.value)}
              placeholder="Квиз"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="quiz-title" className={labelClass}>Заголовок</label>
            <input
              id="quiz-title"
              type="text"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Подберем решение за 4 шага"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="quiz-subtitle" className={labelClass}>Подзаголовок</label>
            <input
              id="quiz-subtitle"
              type="text"
              value={form.subtitle}
              onChange={(e) => handleChange("subtitle", e.target.value)}
              placeholder="Ответьте на пару вопросов..."
              className={inputClass}
            />
          </div>
        </div>

        <div className="rounded-xl border border-brand/20 bg-ink/30 p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-play text-lg font-bold text-white">
              Шаги квиза
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={addStep}
                className="rounded border border-brand/30 px-3 py-1 text-sm text-brand hover:bg-brand/10 flex items-center gap-1"
              >
                <Icon name="plus" className="h-4 w-4" />
                Добавить шаг
              </button>
              <button
                type="button"
                onClick={restoreDefaults}
                className="rounded border border-brand/30 px-3 py-1 text-sm text-gray-400 hover:text-brand"
              >
                Восстановить стандартные
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Порядок шагов: 1) выбор типа работ → 2) уточнение по типу → 3) бюджет → 4) контакт (и при необходимости — дополнительные шаги). Шаг «по типам» должен идти после выбора типа.
          </p>

          {stepForms.map((step, idx) => (
            <div
              id={step.id}
              key={step.id}
              className="rounded-xl border border-brand/20 bg-ink/40 p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">Шаг {idx + 1}</span>
                <div className="flex gap-1 items-center">
                  <button
                    type="button"
                    onClick={() => moveStep(idx, -1)}
                    disabled={idx === 0}
                    className="rounded p-1 text-gray-400 hover:text-brand disabled:opacity-30"
                    title="Выше"
                  >
                    <Icon name="chevron-up" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(idx, 1)}
                    disabled={idx === stepForms.length - 1}
                    className="rounded p-1 text-gray-400 hover:text-brand disabled:opacity-30"
                    title="Ниже"
                  >
                    <Icon name="chevron-down" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    disabled={stepForms.length <= 1 || step.id === "type"}
                    className="rounded p-1 text-gray-400 hover:text-red-400 disabled:opacity-30"
                    title="Удалить шаг"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {step.kind === "contact" && (
                <>
                  <div>
                    <label htmlFor={`quiz-contact-question-${idx}`} className={labelClass}>Текст вопроса</label>
                    <input
                      id={`quiz-contact-question-${idx}`}
                      type="text"
                      value={step.question ?? ""}
                      onChange={(e) => updateStepQuestion(idx, e.target.value)}
                      placeholder="Оставьте имя и телефон — пришлем расчет"
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Заголовок блока. Ниже на сайте отображаются два поля:
                    </p>
                  </div>
                  <div className="rounded border border-brand/10 bg-ink/20 p-3 space-y-2">
                    <p className="text-xs font-medium text-gray-400">Поля на этом шаге</p>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="rounded bg-ink/50 px-2 py-1">Имя</span>
                      <span className="text-gray-500">— поле «Ваше имя»</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="rounded bg-ink/50 px-2 py-1">Телефон</span>
                      <span className="text-gray-500">— поле «+7 (___) ___-__-__»</span>
                    </div>
                  </div>
                </>
              )}

              {step.kind === "simple" && (
                <>
                  <div>
                    <label htmlFor={`quiz-simple-question-${idx}`} className={labelClass}>Вопрос</label>
                    <input
                      id={`quiz-simple-question-${idx}`}
                      type="text"
                      value={step.question ?? ""}
                      onChange={(e) => updateStepQuestion(idx, e.target.value)}
                      placeholder="Что вас интересует?"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className={labelClass}>Варианты ответа</span>
                      {step.id !== "type" && (
                        <button
                          type="button"
                          onClick={() => addOption(idx)}
                          className="rounded border border-brand/30 px-2 py-1 text-xs text-brand hover:bg-brand/10"
                        >
                          <Icon name="plus" className="mr-1 inline h-3 w-3" />
                          Добавить
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {(step.options ?? []).map((opt, oi) => {
                        const localId = opt._localId ?? `simple-${step.id}-${oi}`;
                        const isDirty = !!dirtyOptions[localId];
                        const hasValue = (opt.label ?? opt.value ?? "").trim().length > 0;
                        const showSave = isDirty && hasValue;
                        return (
                        <div key={localId} className="flex gap-2">
                          <input
                            id={`quiz-simple-option-${idx}-${oi}`}
                            type="text"
                            value={opt.label}
                            onChange={(e) =>
                              updateOption(idx, oi, "label", e.target.value)
                            }
                            placeholder="Надпись на кнопке"
                            maxLength={40}
                            className={`flex-1 ${inputClass}`}
                          />
                          {showSave && (
                            <button
                              type="submit"
                              className="rounded p-2 text-gray-400 hover:text-brand"
                              title="Сохранить изменения"
                            >
                              <Icon name="check" className="h-4 w-4" />
                            </button>
                          )}
                          {step.id !== "type" && (
                            <button
                              type="button"
                              onClick={() => removeOption(idx, oi)}
                              className="rounded p-2 text-gray-400 hover:text-red-400"
                              title="Удалить"
                            >
                              <Icon name="trash" className="h-4 w-4" />
                            </button>
                          )}
                        </div>);
                      })}
                    </div>
                  </div>
                </>
              )}

              {step.kind === "per-type" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Для каждого типа работ — свой вопрос и варианты
                  </p>
                  {WORK_TYPES.map((wt) => (
                    <div
                      key={wt}
                      className="rounded border border-brand/10 bg-ink/30 p-3 space-y-2"
                    >
                      <span className="text-sm font-medium text-brand">{wt}</span>
                      <div>
                        <label htmlFor={`quiz-per-type-question-${idx}-${wt}`} className={labelClass}>Вопрос</label>
                        <input
                          id={`quiz-per-type-question-${idx}-${wt}`}
                          type="text"
                          value={step.questions?.[wt] ?? ""}
                          onChange={(e) =>
                            updatePerTypeQuestion(idx, wt, e.target.value)
                          }
                          placeholder={`Вопрос для ${wt.toLowerCase()}`}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <span className={labelClass}>Варианты</span>
                          <button
                            type="button"
                            onClick={() => addPerTypeOption(idx, wt)}
                            className="rounded border border-brand/30 px-2 py-0.5 text-xs text-brand hover:bg-brand/10"
                          >
                            + Добавить
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(step.optionsByType?.[wt] ?? []).map((opt, oi) => {
                            const localId =
                              opt._localId ?? `per-type-${step.id}-${wt}-${oi}`;
                            const isDirty = !!dirtyOptions[localId];
                            const hasValue = (opt.label ?? opt.value ?? "").trim().length > 0;
                            const showSave = isDirty && hasValue;
                            return (
                            <div key={localId} className="flex gap-2">
                              <input
                                id={`quiz-per-type-option-${idx}-${wt}-${oi}`}
                                type="text"
                                value={opt.label}
                                onChange={(e) =>
                                  updatePerTypeOption(idx, wt, oi, "label", e.target.value)
                                }
                                placeholder="Надпись"
                                maxLength={40}
                                className={`flex-1 ${inputClass}`}
                              />
                              {showSave && (
                                <button
                                  type="submit"
                                  className="rounded p-2 text-gray-400 hover:text-brand"
                                  title="Сохранить изменения"
                                >
                                  <Icon name="check" className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removePerTypeOption(idx, wt, oi)}
                                className="rounded p-2 text-gray-400 hover:text-red-400"
                              >
                                <Icon name="trash" className="h-4 w-4" />
                              </button>
                            </div>);
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {stepForms.length === 0 && (
            <p className="py-4 text-center text-gray-500">
              Нажмите «Добавить шаг» или «Восстановить стандартные», чтобы загрузить шаги
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl border border-brand/30 bg-brand/10 px-6 py-2 font-medium text-white transition hover:bg-brand/20 disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить квиз"}
        </button>
      </form>
    </div>
  );
}
