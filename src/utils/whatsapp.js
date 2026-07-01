export const WHATSAPP_PHONE = "+79289453131";

export function phoneDigits(phone = WHATSAPP_PHONE) {
  return (phone || WHATSAPP_PHONE).replace(/\D+/g, "");
}

export function telLink(phone = WHATSAPP_PHONE) {
  return `tel:+${phoneDigits(phone)}`;
}

// Helper to build wa.me link with digits only
export function waLink(phone, message = "") {
  return `https://wa.me/${phoneDigits(phone)}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(message, phone = WHATSAPP_PHONE) {
  window.open(waLink(phone, message || ""), "_blank", "noopener");
}
