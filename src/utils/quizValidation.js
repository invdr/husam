function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasOption(option) {
  return hasText(option?.value) && hasText(option?.label);
}

export function getQuizValidationError(config) {
  const steps = Array.isArray(config?.steps) ? config.steps : [];
  const contactSteps = steps.filter((step) => step?.id === "contact");
  const typeSteps = steps.filter((step) => step?.id === "type");
  const typeValues = (Array.isArray(steps[0]?.options) ? steps[0].options : [])
    .map((option) => String(option?.value ?? option?.label ?? "").trim())
    .filter(Boolean);

  if (typeSteps.length !== 1 || steps[0]?.id !== "type") {
    return "Квиз должен начинаться с единственного шага выбора типа работ";
  }

  if (typeValues.length === 0) {
    return "Добавьте варианты в шаг выбора типа работ";
  }

  if (contactSteps.length !== 1) {
    return "Квиз должен содержать ровно один контактный шаг";
  }

  if (steps.at(-1)?.id !== "contact") {
    return "Контактный шаг должен быть последним";
  }

  for (const step of steps) {
    if (step?.id === "contact") {
      if (!hasText(step.question)) {
        return "Заполните текст контактного шага";
      }
      continue;
    }

    if (!step || (typeof step.question !== "object" && !hasText(step.question))) {
      return "Заполните вопрос каждого шага";
    }

    if (Array.isArray(step.options)) {
      if (step.options.length === 0 || !step.options.every(hasOption)) {
        return "Добавьте хотя бы один вариант ответа в каждый шаг";
      }
      continue;
    }

    if (!step.options || typeof step.options !== "object") {
      return "Настройте варианты ответа каждого шага";
    }

    const optionTypes = Object.keys(step.options);
    if (optionTypes.length === 0) {
      return "Добавьте варианты ответа в шаг по типам";
    }

    if (typeValues.some((type) => !Object.prototype.hasOwnProperty.call(step.options, type))) {
      return "Добавьте варианты ответа для всех типов работ";
    }

    for (const type of optionTypes) {
      if (!hasText(step.question?.[type])) {
        return "Заполните вопросы для всех типов работ";
      }
      if (
        !Array.isArray(step.options[type]) ||
        step.options[type].length === 0 ||
        !step.options[type].every(hasOption)
      ) {
        return "Добавьте варианты ответа для всех типов работ";
      }
    }
  }

  return null;
}

export function isValidQuizConfig(config) {
  return getQuizValidationError(config) === null;
}
