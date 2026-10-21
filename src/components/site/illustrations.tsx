import Image from "next/image";

import { cn } from "@/lib/utils";
import { programmeImageSrc } from "@/lib/programs";
import { programmeTheme } from "@/lib/programme-theme";

type ProgrammeImage = {
  id: string;
  title: string;
  imageUrl: string | null;
  imageKey: string | null;
  /** Card theme key — colours the no-image fallback. Defaults to cream. */
  theme?: string | null;
};

/**
 * Renders a programme's image (uploaded → Garage, or a seeded static path)
 * filling its positioned parent.
 *
 * Decorative by default (`alt=""`): every caller shows the programme title
 * right next to the art, so a title alt makes screen readers say it twice.
 * Pass `alt` only where the image carries meaning on its own.
 *
 * A programme with no image yet gets a themed block with its initial rather
 * than an empty box, so every caller (cards, thumbnails, detail heroes)
 * degrades the same way.
 */
export function ProgramArt({
  program,
  alt = "",
  className,
}: {
  program: ProgrammeImage;
  alt?: string;
  className?: string;
}) {
  const src = programmeImageSrc(program);
  if (!src) {
    const palette = programmeTheme(program.theme);
    return (
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 grid place-items-center overflow-hidden [container-type:size]",
          palette.card,
          className,
        )}
      >
        <span
          className={cn(
            "display select-none text-[length:55cqmin] leading-none",
            palette.art,
          )}
        >
          {program.title.trim().charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      // imageKey-backed images are arbitrary uploads; skip the optimizer so we
      // don't need remotePatterns config for the same-origin stream route.
      unoptimized={Boolean(program.imageKey)}
      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      className={cn("object-cover", className)}
    />
  );
}
