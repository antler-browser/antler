/**
 * Migration: Create social_links table
 * Stores social media links for user profiles
 */
export default `-- Migration: Create social_links table
-- Stores social media links for user profiles

CREATE TABLE IF NOT EXISTS social_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_did TEXT NOT NULL,
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER,
  FOREIGN KEY (profile_did) REFERENCES user_profiles(did) ON DELETE CASCADE
);

-- Index for faster lookups by user DID
CREATE INDEX IF NOT EXISTS idx_social_links_profile_did ON social_links(profile_did);
`;
