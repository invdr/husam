import { useReducer } from "react";
import { toast } from "sonner";
import {
  Badge,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Modal,
  Icon,
} from "@/components/common";
import EditBlockButton from "./EditBlockButton";
import { usePageContent } from "@/hooks/usePageContent";
import { PROCESS_DEFAULTS } from "@/data/pageContentDefaults";

function processReducer(state, action) {
  switch (action.type) {
    case "OPEN_EDIT":
      return {
        ...state,
        showEdit: true,
        saving: false,
        formBadge: action.formBadge,
        formTitle: action.formTitle,
        formSubtitle: action.formSubtitle,
        formSteps: action.formSteps,
      };
    case "CLOSE_EDIT":
      return { ...state, showEdit: false };
    case "SAVE_START":
      return { ...state, saving: true };
    case "SAVE_SUCCESS":
      return { ...state, saving: false, showEdit: false };
    case "SAVE_FAILURE":
      return { ...state, saving: false };
    case "SET_FORM_BADGE":
      return { ...state, formBadge: action.value };
    case "SET_FORM_TITLE":
      return { ...state, formTitle: action.value };
    case "SET_FORM_SUBTITLE":
      return { ...state, formSubtitle: action.value };
    case "UPDATE_STEP":
      return {
        ...state,
        formSteps: state.formSteps.map((item, i) =>
          i === action.index ? { ...item, [action.field]: action.value } : item,
        ),
      };
    case "REMOVE_STEP":
      return {
        ...state,
        formSteps: state.formSteps.filter((_, i) => i !== action.index),
      };
    case "ADD_STEP":
      return {
        ...state,
        formSteps: [...state.formSteps, { title: "", description: "" }],
      };
    default:
      return state;
  }
}

export default function Process() {
  const { content, loading, updateContent } = usePageContent();
  const c = loading ? PROCESS_DEFAULTS : content;
  const badge = c.process_badge ?? PROCESS_DEFAULTS.process_badge;
  const title = c.process_title ?? PROCESS_DEFAULTS.process_title;
  const subtitle = c.process_subtitle ?? PROCESS_DEFAULTS.process_subtitle;
  const steps = Array.isArray(c.process_steps)
    ? c.process_steps
    : PROCESS_DEFAULTS.process_steps;

  const [state, dispatch] = useReducer(processReducer, {
    showEdit: false,
    saving: false,
    formBadge: badge,
    formTitle: title,
    formSubtitle: subtitle,
    formSteps: [],
  });

  const openEdit = () => {
    dispatch({
      type: "OPEN_EDIT",
      formBadge: badge,
      formTitle: title,
      formSubtitle: subtitle,
      formSteps: steps.map((it) => ({
        title: it.title || "",
        description: it.description || "",
      })),
    });
  };

  const updateStep = (index, field, value) => {
    dispatch({ type: "UPDATE_STEP", index, field, value });
  };

  const removeStep = (index) => {
    if (state.formSteps.length <= 1) return;
    dispatch({ type: "REMOVE_STEP", index });
  };

  const addStep = () => {
    dispatch({ type: "ADD_STEP" });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const stepsToSave = state.formSteps.map((it, i) => ({
      step: String(i + 1).padStart(2, "0"),
      title: (it.title || "").trim(),
      description: (it.description || "").trim(),
    }));
    dispatch({ type: "SAVE_START" });
    try {
      await updateContent({
        process_badge: state.formBadge.trim(),
        process_title: state.formTitle.trim(),
        process_subtitle: state.formSubtitle.trim(),
        process_steps: stepsToSave,
      });
      toast.success("Блок сохранен");
      dispatch({ type: "SAVE_SUCCESS" });
    } catch (err) {
      toast.error(err?.message ?? "Ошибка сохранения");
    } finally {
      dispatch({ type: "SAVE_FAILURE" });
    }
  };

  return (
    <section id="process" className="relative py-[30px] md:py-24 will-reveal">
      <EditBlockButton onClick={openEdit} label="Изменить блок" />

      <div className="container mx-auto px-6 md:px-10 lg:px-12">
        <div className="mb-12 text-center">
          <Badge>{badge}</Badge>
          <h2 className="mb-4 mt-4 font-play text-5xl font-bold md:text-6xl">
            {title}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            {subtitle}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((it) => (
            <div key={it.step} className="will-reveal">
              <Card className="h-full border-brand/20 bg-[#2A2A28] transition-all duration-300 hover:border-brand">
                <CardHeader>
                  <div className="mb-2 font-play text-6xl font-bold text-brand">
                    {it.step}
                  </div>
                  <CardTitle className="font-play text-2xl text-white">
                    {it.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">{it.description}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {state.showEdit && (
        <Modal
          title="Редактировать блок: Процесс работы"
          onClose={() => dispatch({ type: "CLOSE_EDIT" })}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label htmlFor="process-badge" className="mb-1 block text-sm text-gray-400">Бейдж</label>
              <input
                id="process-badge"
                type="text"
                value={state.formBadge}
                onChange={(e) =>
                  dispatch({ type: "SET_FORM_BADGE", value: e.target.value })
                }
                className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
                placeholder="Как мы работаем"
              />
            </div>
            <div>
              <label htmlFor="process-title" className="mb-1 block text-sm text-gray-400">
                Заголовок
              </label>
              <input
                id="process-title"
                type="text"
                value={state.formTitle}
                onChange={(e) =>
                  dispatch({ type: "SET_FORM_TITLE", value: e.target.value })
                }
                className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
                placeholder="Процесс работы"
              />
            </div>
            <div>
              <label htmlFor="process-subtitle" className="mb-1 block text-sm text-gray-400">
                Подзаголовок
              </label>
              <input
                id="process-subtitle"
                type="text"
                value={state.formSubtitle}
                onChange={(e) =>
                  dispatch({
                    type: "SET_FORM_SUBTITLE",
                    value: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
                placeholder="6 этапов до сдачи объекта"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm text-gray-400">Этапы</span>
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center gap-1 rounded-lg border border-brand/30 px-3 py-1.5 text-sm text-brand hover:bg-brand/10"
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Добавить этап
                </button>
              </div>
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                {state.formSteps.map((step, index) => (
                  <div
                    key={step.step ?? `step-${index}`}
                    className="rounded-xl border border-brand/20 bg-ink/50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-300">
                        Этап {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        disabled={state.formSteps.length <= 1}
                        className="rounded p-1 text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Удалить этап"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <label htmlFor={`process-step-title-${index}`} className="mb-1 block text-xs text-gray-500">
                        Название этапа
                      </label>
                      <input
                        id={`process-step-title-${index}`}
                        type="text"
                        value={step.title}
                        onChange={(e) =>
                          updateStep(index, "title", e.target.value)
                        }
                        className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
                        placeholder="Например: Бриф"
                      />
                    </div>
                    <div>
                      <label htmlFor={`process-step-description-${index}`} className="mb-1 block text-xs text-gray-500">
                        Описание
                      </label>
                      <textarea
                        id={`process-step-description-${index}`}
                        value={step.description}
                        onChange={(e) =>
                          updateStep(index, "description", e.target.value)
                        }
                        rows={2}
                        className="w-full rounded-xl border border-brand/20 bg-ink px-4 py-2 text-white outline-none focus:border-brand"
                        placeholder="Краткое описание этапа"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-brand/20">
              <button
                type="button"
                onClick={() => dispatch({ type: "CLOSE_EDIT" })}
                className="rounded-xl border border-brand/20 px-4 py-2 text-gray-400 hover:bg-ink"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={state.saving}
                className="rounded-xl bg-brand px-4 py-2 text-ink hover:opacity-90 disabled:opacity-50"
              >
                {state.saving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
