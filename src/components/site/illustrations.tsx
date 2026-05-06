// Hand-drawn-feel SVG illustrations for the four programmes.
// Inline so they animate / inherit colour and stay sharp at any size.

import { cn } from "@/lib/utils";

type Props = { className?: string };

export function KaiBoxArt({ className }: Props) {
  return (
    <svg viewBox="0 0 240 200" className={cn(className)} aria-hidden>
      <defs>
        <pattern id="kbStrip" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M-1 5 L5 -1" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
        </pattern>
      </defs>
      <g transform="translate(20 30)" stroke="currentColor" strokeWidth="2" fill="none">
        <path
          d="M2 30 L100 12 L198 30 L198 145 L100 165 L2 145 Z"
          fill="url(#kbStrip)"
        />
        <path d="M2 30 L100 50 L198 30" />
        <path d="M100 50 L100 165" />
        <circle cx="60" cy="0" r="14" fill="currentColor" opacity="0.85" />
        <path d="M55 -8 Q60 -16 70 -10" strokeLinecap="round" />
        <path d="M120 5 Q140 -2 160 6" strokeLinecap="round" />
        <ellipse cx="140" cy="2" rx="10" ry="6" fill="currentColor" opacity="0.7" />
        <path d="M85 20 q5 -8 14 0" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function KitchenArt({ className }: Props) {
  return (
    <svg viewBox="0 0 240 200" className={cn(className)} aria-hidden>
      <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M40 90 L40 150 Q40 165 55 165 L185 165 Q200 165 200 150 L200 90 Z" fill="currentColor" fillOpacity="0.08" />
        <path d="M30 90 L210 90" />
        <path d="M120 90 L120 50" />
        <path d="M105 50 q15 -22 30 0" />
        <path d="M115 30 q5 -8 10 0" />
        <path d="M125 20 q5 -10 10 0" />
        <path d="M75 120 q15 -10 30 0 q15 10 30 0 q15 -10 30 0" />
        <circle cx="70" cy="140" r="3" fill="currentColor" />
        <circle cx="170" cy="140" r="3" fill="currentColor" />
      </g>
    </svg>
  );
}

export function SkillsArt({ className }: Props) {
  return (
    <svg viewBox="0 0 240 200" className={cn(className)} aria-hidden>
      <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
        <path
          d="M30 130 q40 -90 95 -50 q60 -40 90 30 q-30 50 -90 30 q-55 35 -95 -10 Z"
          fill="currentColor"
          fillOpacity="0.06"
        />
        <path d="M70 110 L100 90 L130 110" />
        <path d="M110 90 L110 130" />
        <path d="M95 130 L130 130" />
        <path d="M150 95 q20 0 25 25 q-5 25 -25 25" />
        <path d="M150 95 L150 145" />
        <circle cx="55" cy="80" r="6" fill="currentColor" opacity="0.85" />
      </g>
    </svg>
  );
}

export function InclusiveArt({ className }: Props) {
  return (
    <svg viewBox="0 0 240 200" className={cn(className)} aria-hidden>
      <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
        <circle cx="60" cy="70" r="14" fill="currentColor" opacity="0.85" />
        <circle cx="120" cy="60" r="16" fill="currentColor" opacity="0.55" />
        <circle cx="180" cy="80" r="12" fill="currentColor" opacity="0.95" />
        <path d="M30 130 q15 -22 30 -22 q15 0 22 12 q12 -22 30 -22 q22 0 30 22 q15 -22 30 -22 q15 0 28 22" />
        <path d="M30 150 L210 150" strokeDasharray="3 6" />
        <path d="M52 96 L68 96" />
        <path d="M112 86 L128 86" />
        <path d="M172 106 L188 106" />
      </g>
    </svg>
  );
}

export function CorporateArt({ className }: Props) {
  return (
    <svg viewBox="0 0 240 200" className={cn(className)} aria-hidden>
      <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
        <rect x="30" y="60" width="180" height="100" rx="4" fill="currentColor" fillOpacity="0.05" />
        <path d="M30 90 L210 90" />
        <path d="M70 60 L70 30 L170 30 L170 60" />
        <path d="M120 30 L120 60" />
        <circle cx="80" cy="125" r="6" fill="currentColor" opacity="0.85" />
        <circle cx="120" cy="125" r="6" fill="currentColor" opacity="0.85" />
        <circle cx="160" cy="125" r="6" fill="currentColor" opacity="0.85" />
        <path d="M70 145 q10 -8 20 0" />
        <path d="M110 145 q10 -8 20 0" />
        <path d="M150 145 q10 -8 20 0" />
      </g>
    </svg>
  );
}

export function ProgramArt({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  switch (slug) {
    case "KAI_BOX":
      return <KaiBoxArt className={className} />;
    case "CONSCIOUS_KITCHEN":
      return <KitchenArt className={className} />;
    case "WORK_SKILLS":
      return <SkillsArt className={className} />;
    case "INCLUSIVE":
      return <InclusiveArt className={className} />;
    case "CORPORATE":
      return <CorporateArt className={className} />;
    default:
      return null;
  }
}
