-- Tag each off-platform slot hold (corporate day, school class, community
-- group, …) so the volunteer-facing surfaces can render a discreet
-- "Corporate group joining" pill on the relevant shift. The admin note stays
-- admin-only — it can contain contact details and head counts that aren't
-- meant for the public roster.
CREATE TYPE "SlotBlockKind" AS ENUM ('CORPORATE', 'SCHOOL', 'COMMUNITY', 'OTHER');

-- OTHER is the quiet default: legacy rows pre-dating this column show as a
-- neutral "Group joining" pill until a coordinator re-categorises them.
ALTER TABLE "SlotBlock"
  ADD COLUMN "kind" "SlotBlockKind" NOT NULL DEFAULT 'OTHER';
