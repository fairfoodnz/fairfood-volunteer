-- The inclusive programme is now enquiry-only, but its description still
-- referenced a sign-up "form" that no longer exists for it (the description
-- renders on /programs/inclusive). The InclusiveBand copy was updated in code;
-- this brings the seeded DB copy in lockstep. A separate migration rather than
-- an edit to the already-applied 20260519000000_* one (never modify an applied
-- migration). Matched by stable slug — no-op on a fresh DB seeded afterwards.
UPDATE "Program"
SET "description" = 'We modify tasks, allow support people to come along, and welcome groups like the Young Onset Dementia Collective every Monday. We arrange these sessions directly with your group — tell us what you need when you get in touch. There''s nearly always a way.'
WHERE "slug" = 'inclusive';
