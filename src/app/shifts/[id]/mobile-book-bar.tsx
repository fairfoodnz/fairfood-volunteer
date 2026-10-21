"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Below `lg` the booking card stacks under the whole shift description, so a
 * phone visitor would scroll past everything to find it. This bar keeps
 * "Book this shift" in reach and jumps to the card (`#book`); it steps aside
 * once the card itself is on screen so the two CTAs never compete. A spacer
 * the same height stops it covering the end of the page.
 */
export function MobileBookBar({
  title,
  summary,
}: {
  title: string;
  summary: string;
}) {
  const [cardVisible, setCardVisible] = useState(false);

  useEffect(() => {
    const card = document.getElementById("book");
    if (!card || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setCardVisible(entry.isIntersecting),
      { threshold: 0.25 },
    );
    io.observe(card);
    return () => io.disconnect();
  }, []);

  return (
    <div className="lg:hidden">
      <div aria-hidden className="h-24" />
      <div
        role="region"
        aria-label="Book this shift"
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur transition-opacity supports-[backdrop-filter]:bg-background/85 ${
          cardVisible ? "pointer-events-none invisible opacity-0" : "opacity-100"
        }`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
      >
        <div className="mx-auto flex max-w-[78rem] items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {title}
            </p>
            <p className="truncate text-xs text-foreground/70">{summary}</p>
          </div>
          <Button asChild className="shrink-0 px-5 font-semibold">
            <a href="#book">Book this shift</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
