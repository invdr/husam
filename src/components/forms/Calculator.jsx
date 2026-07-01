import { useReducer } from "react";
import { Badge, Card, CardContent } from "@/components/common";
import { openWhatsApp } from "@/utils/whatsapp";
import { phonePattern } from "@/utils/constants";
import { useQuiz } from "@/hooks/useQuiz";
import { QUIZ_DEFAULTS } from "@/data/quizDefaults";

const initialState = {
  step: 0,
  answers: {},
  name: "",
  nameError: false,
  phone: "",
  phoneError: false,
};

function calculatorReducer(state, action) {
  switch (action.type) {
    case "RESET":
      return initialState;
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SELECT_ANSWER": {
      if (action.key === "type") {
        return { ...state, answers: { type: action.value } };
      }
      return {
        ...state,
        answers: { ...state.answers, [action.key]: action.value },
      };
    }
    case "DELETE_ANSWER": {
      if (!(action.key in state.answers)) return state;
      const nextAnswers = { ...state.answers };
      delete nextAnswers[action.key];
      return { ...state, answers: nextAnswers };
    }
    case "SET_NAME":
      return { ...state, name: action.name, nameError: false };
    case "SET_PHONE":
      return { ...state, phone: action.phone, phoneError: false };
    case "SET_CONTACT_ERRORS":
      return {
        ...state,
        nameError: action.nameError,
        phoneError: action.phoneError,
      };
    default:
      return state;
  }
}

export default function Calculator() {
  const { config, loading } = useQuiz();
  const allSteps = loading ? QUIZ_DEFAULTS.steps : (config.steps ?? QUIZ_DEFAULTS.steps);
  const badge = loading ? QUIZ_DEFAULTS.badge : (config.badge ?? QUIZ_DEFAULTS.badge);
  const title = loading ? QUIZ_DEFAULTS.title : (config.title ?? QUIZ_DEFAULTS.title);
  const subtitle = loading ? QUIZ_DEFAULTS.subtitle : (config.subtitle ?? QUIZ_DEFAULTS.subtitle);

  const [state, dispatch] = useReducer(calculatorReducer, initialState);

  const isNameValid = (val) => (val || "").trim().length >= 2;

  const selectedType = state.answers.type;
  const quizSteps =
    selectedType && selectedType !== "Строительство"
      ? allSteps.filter((s) => s.id !== "project")
      : allSteps;
  const currentStep = quizSteps[state.step];
  const totalSteps = quizSteps.length;
  const isLastStep = state.step === totalSteps - 1;
  const isContactStep = currentStep?.id === "contact";

  const getQuestion = () => {
    if (!currentStep) return "";
    if (typeof currentStep.question === "string") return currentStep.question;
    if (typeof currentStep.question === "object" && selectedType) {
      return currentStep.question[selectedType] ?? currentStep.question["Строительство"] ?? "";
    }
    return "";
  };

  const getOptions = () => {
    if (!currentStep?.options) return [];
    if (Array.isArray(currentStep.options)) return currentStep.options;
    if (currentStep.options && selectedType) {
      return currentStep.options[selectedType] || [];
    }
    return [];
  };

  const resetQuiz = () => {
    dispatch({ type: "RESET" });
  };

  const selectAnswer = (key, value) => {
    dispatch({ type: "SELECT_ANSWER", key, value });
  };

  const handleNext = () => {
    if (isContactStep) {
      const nameValid = isNameValid(state.name);
      const phoneValid = state.phone && phonePattern.test(state.phone);
      dispatch({
        type: "SET_CONTACT_ERRORS",
        nameError: !nameValid,
        phoneError: !phoneValid,
      });
      if (!nameValid || !phoneValid) return;

      const text = [
        "Здравствуйте! Заявка с сайта:",
        state.answers.type && `— Услуга: ${state.answers.type.toLowerCase()}`,
        state.answers.direction && `— Объект: ${state.answers.direction}`,
        state.answers.project && `— Наличие проекта: ${state.answers.project}`,
        state.answers.budget &&
          (state.answers.type === "Проектирование"
            ? `— Тип объекта (проектирование): ${state.answers.budget}`
            : `— Бюджет: ${state.answers.budget} млн ₽`),
        "",
        `Меня зовут ${state.name.trim()}, телефон: ${state.phone}.`,
      ]
        .filter(Boolean)
        .join("\n");
      openWhatsApp(text);
      // Мягкий reset после успешной отправки
      setTimeout(() => {
        resetQuiz();
      }, 500);
      return;
    }
    const nextStep = Math.min(state.step + 1, totalSteps - 1);
    dispatch({ type: "SET_STEP", step: nextStep });
  };

  const handleBack = () => {
    const prevStep = Math.max(0, state.step - 1);
    dispatch({ type: "SET_STEP", step: prevStep });
    if (isContactStep) {
      dispatch({
        type: "SET_CONTACT_ERRORS",
        nameError: false,
        phoneError: false,
      });
    }
  };

  const canProceed = () => {
    if (isContactStep) return true;
    const key = currentStep?.id;
    return key && state.answers[key];
  };

  if (!currentStep) return null;

  const clearPreviousStepAnswer = () => {
    const prevIndex = state.step - 1;
    if (prevIndex < 0) return;
    const prevStep = quizSteps[prevIndex];
    const key = prevStep?.id;
    if (!key || key === "contact") return;
    dispatch({ type: "DELETE_ANSWER", key });
  };

  return (
    <section id="calculator" className="relative py-[30px] md:py-24 will-reveal">
      <div className="container mx-auto px-6 md:px-10 lg:px-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-12 text-center">
            <Badge>{badge}</Badge>
            <h2 className="mb-4 mt-4 font-play text-5xl font-bold md:text-6xl">
              {title}
            </h2>
            <p className="text-lg text-gray-400">
              {subtitle}
            </p>
          </div>

          <Card className="border-brand/20 bg-[#2A2A28]">
            <CardContent className="p-6 pt-6 md:p-8 md:pt-8">
              {/* Прогресс */}
              <div className="mb-8 flex gap-2">
                {quizSteps.map((s, i) => (
                  <div
                    key={`progress-${s?.id ?? s?.question ?? "unknown"}`}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= state.step ? "bg-brand" : "bg-white/10"
                    }`}
                  />
                ))}
              </div>

              {/* Вопрос */}
              <h3 className="mb-6 text-xl font-semibold md:text-2xl">
                {getQuestion()}
              </h3>

              {isContactStep ? (
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={state.name}
                      onChange={(e) => {
                        dispatch({ type: "SET_NAME", name: e.target.value });
                      }}
                      placeholder="Ваше имя"
                      className={`w-full rounded-xl border bg-ink px-4 py-3 text-white outline-none transition focus:border-brand ${
                        state.nameError ? "border-red-500" : "border-brand/20"
                      }`}
                    />
                    {state.nameError && (
                      <p className="mt-1 text-sm text-red-400">
                        Введите имя (минимум 2 символа)
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      type="tel"
                      value={state.phone}
                      onChange={(e) => {
                        dispatch({ type: "SET_PHONE", phone: e.target.value });
                      }}
                      placeholder="+7 (___) ___-__-__"
                      className={`w-full rounded-xl border bg-ink px-4 py-3 text-white outline-none transition focus:border-brand ${
                        state.phoneError ? "border-red-500" : "border-brand/20"
                      }`}
                    />
                    {state.phoneError && (
                      <p className="mt-1 text-sm text-red-400">
                        Введите номер в формате +7 999 999-99-99
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {getOptions().map((opt) => (
                    <button
                      key={`${currentStep.id}-${opt.value ?? opt.label ?? ""}`}
                      type="button"
                      onClick={() => selectAnswer(currentStep.id, opt.value)}
                      className={`w-full break-words rounded-xl border px-4 py-3 text-left transition ${
                        state.answers[currentStep.id] === opt.value
                          ? "border-brand bg-brand/20 text-white"
                          : "border-brand/20 bg-ink text-white hover:border-brand/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Навигация */}
              <div className="mt-8 flex gap-2.5 sm:gap-3">
                {state.step > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      clearPreviousStepAnswer();
                      handleBack();
                    }}
                    className="rounded-xl border border-brand/30 px-4 py-2.5 text-sm text-white transition hover:border-brand/50 sm:px-6 sm:py-3 sm:text-base"
                  >
                    Назад
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed() && !isContactStep}
                  className={`rounded-xl bg-brand px-3 text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 ${
                    isLastStep
                      ? "flex-1 py-2 text-sm leading-tight sm:py-4 sm:text-lg"
                      : "flex-1 py-2.5 text-base sm:py-4 sm:text-lg"
                  }`}
                >
                  {isLastStep ? (
                    <>
                      <span className="sm:hidden">В WhatsApp</span>
                      <span className="hidden sm:inline">Отправить в WhatsApp</span>
                    </>
                  ) : (
                    "Далее"
                  )}
                </button>
              </div>

              {isContactStep && (
                <p className="mt-4 text-center text-xs text-gray-500">
                  Нажимая кнопку, вы соглашаетесь с Политикой конфиденциальности
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
