import { db } from "@/lib/db";
import { BookingStatus } from "@/generated/prisma";
import { getSiteCopy } from "@/lib/site-copy";

/**
 * The label for the "this is my first time" tick box on a booking form, or
 * null when we shouldn't be asking.
 *
 * Both booking surfaces go through this so the rule lives in one place: ask
 * only signed-in volunteers whose answer we don't have (accounts that finished
 * the questionnaire before the question existed) and who have never been marked
 * attended — someone who has already worked a shift plainly isn't new, and
 * putting the box in front of them every time they book would be noise.
 */
export async function firstTimePrompt(
  user: { id: string; volunteeredBefore: boolean | null } | null,
): Promise<string | null> {
  if (!user || user.volunteeredBefore !== null) return null;

  const attended = await db.booking.count({
    where: { userId: user.id, status: BookingStatus.ATTENDED },
  });
  if (attended > 0) return null;

  return (await getSiteCopy()).firstTimeCheckboxLabel;
}
