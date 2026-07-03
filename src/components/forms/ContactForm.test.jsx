import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "./ContactForm";

vi.mock("@/utils/messenger", () => ({
  openMessenger: vi.fn(),
}));

const openMessenger = (await import("@/utils/messenger")).openMessenger;

/** Один экземпляр формы. */
function getForm() {
  const inputs = screen.getAllByPlaceholderText("Ваше имя");
  return inputs[0].closest("form");
}

describe("ContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("рендерит форму с полями и кнопкой отправки", () => {
    render(<ContactForm />);
    const form = getForm();
    expect(within(form).getByPlaceholderText("Ваше имя")).toBeInTheDocument();
    expect(within(form).getByPlaceholderText("Телефон")).toBeInTheDocument();
    expect(within(form).getByRole("combobox")).toBeInTheDocument();
    expect(within(form).getByRole("button", { name: /отправить заявку в мессенджер/i })).toBeInTheDocument();
  });

  it("при отправке с пустыми полями не вызывает openMessenger и помечает поля ошибкой", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    const form = getForm();
    const submitBtn = within(form).getByRole("button", { name: /отправить заявку/i });
    await user.click(submitBtn);

    expect(openMessenger).not.toHaveBeenCalled();
    const nameEl = form.querySelector('[name="name"]');
    const telEl = form.querySelector('[name="tel"]');
    expect(nameEl).toHaveClass("form-error");
    expect(telEl).toHaveClass("form-error");
  });

  it("при невалидном телефоне не вызывает openMessenger", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    const form = getForm();
    await user.type(within(form).getByPlaceholderText("Ваше имя"), "Иван");
    await user.type(within(form).getByPlaceholderText("Телефон"), "123");
    await user.selectOptions(within(form).getByRole("combobox"), "Строительство");
    await user.click(within(form).getByRole("button", { name: /отправить заявку/i }));

    expect(openMessenger).not.toHaveBeenCalled();
    const telEl = form.querySelector('[name="tel"]');
    expect(telEl).toHaveClass("form-error");
  });

  it("при неотмеченном согласии не вызывает openMessenger", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    const form = getForm();
    await user.type(within(form).getByPlaceholderText("Ваше имя"), "Иван");
    await user.type(within(form).getByPlaceholderText("Телефон"), "79991234567");
    await user.selectOptions(within(form).getByRole("combobox"), "Строительство");
    await user.click(within(form).getByRole("button", { name: /отправить заявку/i }));

    expect(openMessenger).not.toHaveBeenCalled();
    expect(within(form).getByRole("checkbox")).toHaveClass("form-error");
  });

  it("при валидных данных валидация проходит и поля не помечаются ошибкой", async () => {
    render(<ContactForm />);
    const form = getForm();
    const nameInput = within(form).getByPlaceholderText("Ваше имя");
    const telInput = within(form).getByPlaceholderText("Телефон");
    const serviceSelect = within(form).getByRole("combobox");
    fireEvent.change(nameInput, { target: { value: "Иван", name: "name" } });
    fireEvent.change(telInput, { target: { value: "+7 999 123 45 67", name: "tel" } });
    fireEvent.change(serviceSelect, { target: { value: "Ремонт", name: "service" } });
    fireEvent.click(within(form).getByRole("checkbox"));
    fireEvent.submit(form);

    expect(form.querySelector('[name="name"]')).not.toHaveClass("form-error");
    expect(form.querySelector('[name="tel"]')).not.toHaveClass("form-error");
    expect(openMessenger).toHaveBeenCalledTimes(1);
  });

  it("при заполненном комментарии отправка проходит без ошибки валидации", async () => {
    render(<ContactForm />);
    const form = getForm();
    fireEvent.change(within(form).getByPlaceholderText("Ваше имя"), { target: { value: "Мария", name: "name" } });
    fireEvent.change(within(form).getByPlaceholderText("Телефон"), { target: { value: "+7 999 123 45 67", name: "tel" } });
    fireEvent.change(within(form).getByRole("combobox"), { target: { value: "Дизайн", name: "service" } });
    fireEvent.change(within(form).getByPlaceholderText("Комментарий"), { target: { value: "Нужен срочный выезд", name: "comment" } });
    fireEvent.change(within(form).getByRole("checkbox"), { target: { checked: true } });
    fireEvent.submit(form);

    expect(form.querySelector('[name="tel"]')).not.toHaveClass("form-error");
    expect(openMessenger).toHaveBeenCalledWith(
      expect.stringContaining("Нужен срочный выезд"),
      undefined,
      expect.objectContaining({
        context: expect.objectContaining({
          form: "Форма контактов",
          service: "Дизайн",
        }),
        goal: "contact_form_submit",
      }),
    );
  });
});
