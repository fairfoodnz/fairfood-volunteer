-- At most one linked account per provider per user (e.g. one Google per user).
-- Backs the application-level "one Google per user" guard at the DB level so a
-- concurrent double-connect cannot slip past it (TOCTOU).
CREATE UNIQUE INDEX "OAuthAccount_userId_provider_key" ON "OAuthAccount"("userId", "provider");
