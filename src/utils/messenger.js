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

export function openMessenger(message, phone = MESSENGER_PHONE) {
  window.open(messengerLink(phone, message || ""), "_blank", "noopener");
}
