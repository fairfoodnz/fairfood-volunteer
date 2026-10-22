-- EmailLog used to store reset / verification / invite emails verbatim, raw
-- single-use token included, so any admin (or anyone with a DB backup) could
-- lift a live link. New rows are redacted on write (src/lib/redact-tokens.ts);
-- this scrubs the rows written before that, with the same two patterns.
UPDATE "EmailLog"
SET
  "bodyHtml" = regexp_replace(
    regexp_replace("bodyHtml", '([?&;]token=)[^&"''<>[:space:]#]+', '\1redacted', 'g'),
    '(/auth/invite/)[^/?#"''<>[:space:]]+', '\1redacted', 'g'
  ),
  "bodyText" = regexp_replace(
    regexp_replace("bodyText", '([?&;]token=)[^&"''<>[:space:]#]+', '\1redacted', 'g'),
    '(/auth/invite/)[^/?#"''<>[:space:]]+', '\1redacted', 'g'
  )
WHERE "bodyHtml" LIKE '%token=%'
   OR "bodyText" LIKE '%token=%'
   OR "bodyHtml" LIKE '%/auth/invite/%'
   OR "bodyText" LIKE '%/auth/invite/%';
