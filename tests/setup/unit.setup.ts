// Pin the runtime timezone to UTC so date-dependent assertions are stable
// across a dev machine (often Pacific/Auckland) and CI (UTC). Helpers that
// format for display pass an explicit `timeZone: "Pacific/Auckland"` to Intl,
// so that behaviour is unaffected — this only fixes the *ambient* zone that
// bare `Date` methods like `toDateString()` read.
process.env.TZ = "UTC";
