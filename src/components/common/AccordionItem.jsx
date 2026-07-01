import { useState } from "react";
import Icon from "./Icon";

export default function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={
        "rounded-xl border border-brand/20 bg-ink px-6 " +
        (open ? "border-brand" : "")
      }
    >
      <button
        className="flex w-full items-center justify-between py-4 text-left text-white"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <Icon name={open ? "chevron-up" : "chevron-down"} className="h-5 w-5" />
      </button>
      {open && <div className="pb-4 text-gray-400">{a}</div>}
    </div>
  );
}
