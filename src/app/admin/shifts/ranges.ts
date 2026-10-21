/** Manage shifts range filter — shared by the page (query) and toolbar (UI). */
export const RANGES = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
] as const;

export type RangeKey = (typeof RANGES)[number]["key"];
