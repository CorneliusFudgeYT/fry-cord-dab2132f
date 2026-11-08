import { z } from "zod";

export const turnstileTokenSchema = z
  .string()
  .trim()
  .min(1, "Complete the Cloudflare bot check")
  .max(2048, "The Cloudflare verification token is too long");
