import { describe, expect, it } from "vitest";
import { QUIZ_DEFAULTS } from "@/data/quizDefaults";
import { getQuizValidationError, isValidQuizConfig } from "./quizValidation";

describe("quiz validation", () => {
  it("accepts the default configuration", () => {
    expect(isValidQuizConfig(QUIZ_DEFAULTS)).toBe(true);
  });

  it("requires exactly one contact step at the end", () => {
    const steps = QUIZ_DEFAULTS.steps.filter((step) => step.id !== "contact");
    expect(getQuizValidationError({ steps })).toContain("контактный");
  });

  it("requires the type-selection step before per-type questions", () => {
    const steps = QUIZ_DEFAULTS.steps.filter((step) => step.id !== "type");
    expect(getQuizValidationError({ steps })).toContain("типа работ");
  });

  it("rejects steps without answer options", () => {
    const steps = QUIZ_DEFAULTS.steps.map((step) =>
      step.id === "project" ? { ...step, options: [] } : step,
    );
    expect(getQuizValidationError({ steps })).toContain("вариант");
  });

  it("rejects options missing either the submitted value or visible label", () => {
    const labelOnlySteps = QUIZ_DEFAULTS.steps.map((step) =>
      step.id === "project"
        ? { ...step, options: [{ label: "Только подпись" }] }
        : step,
    );
    const valueOnlySteps = QUIZ_DEFAULTS.steps.map((step) =>
      step.id === "project"
        ? { ...step, options: [{ value: "only_value" }] }
        : step,
    );

    expect(getQuizValidationError({ steps: labelOnlySteps })).toContain("вариант");
    expect(getQuizValidationError({ steps: valueOnlySteps })).toContain("вариант");
  });

  it("rejects mixed valid and malformed options", () => {
    const regularMixedSteps = QUIZ_DEFAULTS.steps.map((step) =>
      step.id === "project"
        ? { ...step, options: [step.options[0], null] }
        : step,
    );
    const perTypeMixedSteps = QUIZ_DEFAULTS.steps.map((step) => {
      if (step.id !== "direction") return step;
      const type = Object.keys(step.options)[0];
      return {
        ...step,
        options: {
          ...step.options,
          [type]: [step.options[type][0], { value: "only_value" }],
        },
      };
    });

    expect(getQuizValidationError({ steps: regularMixedSteps })).toBeTruthy();
    expect(getQuizValidationError({ steps: perTypeMixedSteps })).toBeTruthy();
  });

  it("rejects a per-type step with a missing selectable branch", () => {
    const steps = QUIZ_DEFAULTS.steps.map((step) => {
      if (step.id !== "direction") return step;
      const typeToRemove = Object.keys(step.options)[1];
      const options = Object.fromEntries(
        Object.entries(step.options).filter(([type]) => type !== typeToRemove),
      );
      const question = Object.fromEntries(
        Object.entries(step.question).filter(([type]) => type !== typeToRemove),
      );
      return { ...step, options, question };
    });

    expect(getQuizValidationError({ steps })).toContain("всех типов");
  });
});
