import Image from "next/image";

import { cn } from "@/lib/utils";

const PROGRAM_PHOTOS: Record<string, { src: string; alt: string }> = {
  KAI_BOX: {
    src: "/photos/kai-box.webp",
    alt: "Volunteers packing rescued kai into boxes",
  },
  CONSCIOUS_KITCHEN: {
    src: "/photos/kitchen.webp",
    alt: "Cooks preparing a meal in the Conscious Kitchen",
  },
  WORK_SKILLS: {
    src: "/photos/skills.webp",
    alt: "Trainees learning kitchen and food-handling skills",
  },
  INCLUSIVE: {
    src: "/photos/inclusive.webp",
    alt: "Volunteers from the inclusive programme working together",
  },
  CORPORATE: {
    src: "/photos/team.webp",
    alt: "A corporate team volunteering at the warehouse",
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
      className={cn("object-cover", className)}
    />
  );
}
