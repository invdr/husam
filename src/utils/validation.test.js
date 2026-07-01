import { describe, it, expect } from "vitest";
import { validatePhone, phonePattern } from "./validation.js";

describe("validation", () => {
  describe("validatePhone", () => {
    it("принимает российский номер с +7 и пробелами", () => {
      expect(validatePhone("+7 999 123 45 67")).toBe(true);
    });

    it("принимает номер без плюса", () => {
      expect(validatePhone("89991234567")).toBe(true);
    });

    it("принимает номер с дефисами и скобками", () => {
      expect(validatePhone("+7 (999) 123-45-67")).toBe(true);
    });

    it("отклоняет слишком короткую строку", () => {
      expect(validatePhone("123")).toBe(false);
    });

    it("отклоняет пустую строку", () => {
      expect(validatePhone("")).toBe(false);
    });

    it("отклоняет null и undefined", () => {
      expect(validatePhone(null)).toBe(false);
      expect(validatePhone(undefined)).toBe(false);
    });

    it("отклоняет строку с буквами", () => {
      expect(validatePhone("+7 999 abc 45 67")).toBe(false);
    });
  });

  describe("phonePattern", () => {
    it("регулярка экспортируется и совпадает с валидным номером", () => {
      expect(phonePattern.test("+79991234567")).toBe(true);
    });
  });
});
