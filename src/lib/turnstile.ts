import { z } from "zod";

export const turnstileTokenSchema = z
  .string()
  .trim()
  .min(1, "Complete the Cloudflare bot check")
  .max(2048, "The Cloudflare verification token is too long");

export function turnstileErrorMessage(code: string) {
  if (code === "110100" || code === "110110" || code === "400020") return "The Cloudflare site key is invalid";
  if (code === "110200" || code === "400021") return "This website is not authorized in the Cloudflare widget settings";
  if (code === "400070") return "This Cloudflare widget is disabled";
  if (code === "200500") return "Cloudflare could not load. Check your connection or content blocker";
  return "The bot check could not load. Please retry";
}
