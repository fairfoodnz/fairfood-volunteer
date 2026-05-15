import Image from "next/image";

import { cn } from "@/lib/utils";

const PROGRAM_PHOTOS: Record<
  string,
  { src: string; alt: string; position?: string }
> = {
  KAI_BOX: {
    src: "/photos/kai-box.webp",
    alt: "Volunteers packing rescued kai into boxes",
  },
  CONSCIOUS_KITCHEN: {
    src: "/photos/kitchen.webp",
    alt: "Cooks preparing a meal in the Conscious Kitchen",
  },
  INCLUSIVE: {
    src: "/photos/inclusive.webp",
    alt: "Volunteers from the inclusive programme working together",
    // Portrait group shot. The box aspect flips by breakpoint, so the crop
    // axis flips too: on the desktop band only the 2nd (vertical) value bites
    // — keep it low so faces stay in frame, not centred on the vests. On
    // mobile the box is portrait, full height shows, and only the 1st
    // (horizontal) value bites — pan it to keep the group centred.
    position: "object-[50%_50%]",
  },
};

export function ProgramArt({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const photo = PROGRAM_PHOTOS[slug];
  if (!photo) return null;
  return (
    <Image
      src={photo.src}
      alt={photo.alt}
      fill
      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      className={cn("object-cover", photo.position, className)}
    />
  );
}
