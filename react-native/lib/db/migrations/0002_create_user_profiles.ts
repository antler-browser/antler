/**
 * Migration: Create user_profiles table
 * Stores user profile information
 */
export default `-- Migration: Create user_profiles table
-- Stores user profile information

CREATE TABLE IF NOT EXISTS user_profiles (
  did TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER
);

-- Index for faster lookups by DID
CREATE INDEX IF NOT EXISTS idx_user_profiles_did ON user_profiles(did);

-- Index for faster lookups by position
CREATE INDEX IF NOT EXISTS idx_user_profiles_position ON user_profiles(position);
`;
