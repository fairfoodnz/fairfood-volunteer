-- The seeds used to write the placeholder "(09) 555-1234" into every
-- programme's contactPhone, so programme pages told the public to "call"
-- a number that isn't Fair Food's. Clear only that exact placeholder; any
-- number a coordinator has entered is left untouched.
UPDATE "Program" SET "contactPhone" = NULL WHERE "contactPhone" = '(09) 555-1234';
