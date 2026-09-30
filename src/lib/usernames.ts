import { z } from "zod";

/**
 * Frying Pan has no email sign-up. Auth still needs an address internally, so
 * every account gets a deterministic, unreachable one derived from the username.
 */
export const USERNAME_EMAIL_DOMAIN = "users.fryingpan.app";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, { message: "Username must be at least 3 characters" })
  .max(24, { message: "Username must be 24 characters or less" })
  .regex(/^[a-zA-Z0-9._-]+$/, {
    message: "Only letters, numbers, dots, dashes and underscores",
  });

export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(72, { message: "Password must be 72 characters or less" });

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Display name cannot be empty" })
  .max(32, { message: "Display name must be 32 characters or less" });

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${USERNAME_EMAIL_DOMAIN}`;
}

export function emailToUsername(email: string | null | undefined): string {
  if (!email) return "unknown";
  return email.endsWith(`@${USERNAME_EMAIL_DOMAIN}`) ? email.split("@")[0]! : email;
}

export const credentialsSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const signUpSchema = credentialsSchema.extend({
  displayName: displayNameSchema.optional(),
});
