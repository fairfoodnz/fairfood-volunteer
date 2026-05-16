import Image from "next/image";

import { cn } from "@/lib/utils";
import { programmeImageSrc } from "@/lib/programs";

type ProgrammeImage = {
  id: string;
  title: string;
  imageUrl: string | null;
  imageKey: string | null;
};

/**
 * Renders a programme's image (uploaded → Garage, or a seeded static path).
 * Returns null when a programme has no image yet so callers can keep their
 * empty-state styling.
 */
export function ProgramArt({
  program,
  className,
}: {
  program: ProgrammeImage;
  className?: string;
}) {
  const src = programmeImageSrc(program);
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={program.title}
      fill
      // imageKey-backed images are arbitrary uploads; skip the optimizer so we
      // don't need remotePatterns config for the same-origin stream route.
      unoptimized={Boolean(program.imageKey)}
      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      className={cn("object-cover", className)}
    />
  );
}
