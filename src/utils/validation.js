// Simple phone validator
export const phonePattern = /^\+?\d[\d\s\-()]{9,}$/;

export function validatePhone(phone) {
  return phonePattern.test(phone);
}
