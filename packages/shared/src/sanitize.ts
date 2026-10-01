import { CHAT_MAX_LENGTH, NAME_MAX_LENGTH } from "./constants";

const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;

function clean(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function sanitizeName(value: unknown): string {
  return clean(value, NAME_MAX_LENGTH);
}

export function sanitizeChat(value: unknown): string {
  return clean(value, CHAT_MAX_LENGTH);
}
