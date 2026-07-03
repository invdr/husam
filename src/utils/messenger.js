import { GOALS, reachGoal } from "@/lib/analytics";
import { appendLeadContext } from "@/utils/leadContext";

export const MESSENGER_PHONE = "+79289453131";

export function phoneDigits(phone = MESSENGER_PHONE) {
  return (phone || MESSENGER_PHONE).replace(/\D+/g, "");
}

export function telLink(phone = MESSENGER_PHONE) {
  return `tel:+${phoneDigits(phone)}`;
}

export function messengerLink(phone, message = "") {
  return `https://wa.me/${phoneDigits(phone)}?text=${encodeURIComponent(message)}`;
}

export function openMessenger(
  message,
  phone = MESSENGER_PHONE,
  { context, goal = GOALS.MESSENGER_CLICK, goalParams } = {}
) {
  const messageWithContext = appendLeadContext(message || "", context);
  reachGoal(goal, goalParams ?? context ?? {});
  window.open(messengerLink(phone, messageWithContext), "_blank", "noopener");
}
