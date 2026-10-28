import { paragraphs } from "@/lib/site-copy";

/**
 * The dress code plus what we hand out on the day, worded by the coordinators
 * in /admin/settings. Shared by the shift page and the home page FAQ so the
 * two can never drift apart. The booking emails carry the dress code only.
 */
export function WhatToWear({
  dressCode,
  provided,
}: {
  dressCode: string;
  provided: string;
}) {
  return (
    <div className="space-y-2">
      {[...paragraphs(dressCode), provided].map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
