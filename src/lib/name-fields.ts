import { z } from "zod";
import { ENGLISH_NAME_MESSAGE, isEnglishName } from "@/lib/users";

/**
 * Zod fields for volunteer-entered names. Kept apart from lib/users.ts so the
 * client components that import those display helpers don't pull Zod into the
 * browser bundle.
 */

const TOO_LONG = "That name is a bit long - 80 characters max.";

export const FirstNameSchema = z
  .string({ message: "Please add your first name." })
  .trim()
  .min(1, "Please add your first name.")
  .max(80, TOO_LONG)
  .refine(isEnglishName, ENGLISH_NAME_MESSAGE);

/** Optional; an empty string means "no last name" (mononym). */
export const LastNameSchema = z
  .string()
  .trim()
  .max(80, TOO_LONG)
  .refine((v) => v === "" || isEnglishName(v), ENGLISH_NAME_MESSAGE)
  .optional();
