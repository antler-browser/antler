/**
 * Migration: Create scan_history table
 * Stores QR code scan history with mini app manifest data
 */
export default `-- Migration: Create scan_history table
-- Stores QR code scan history with mini app manifest data

CREATE TABLE IF NOT EXISTS scan_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  profile_did TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  name TEXT,
  description TEXT,
  location TEXT,
  icon TEXT,
  type TEXT,
  FOREIGN KEY (profile_did) REFERENCES user_profiles(did) ON DELETE CASCADE
);

-- Index for faster lookups by profile and date (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_scan_history_profile_date ON scan_history(profile_did, created_at DESC);

-- Index for finding all scans of a particular profile
CREATE INDEX IF NOT EXISTS idx_scan_history_profile_did ON scan_history(profile_did);

-- Index for finding all scans by URL
CREATE INDEX IF NOT EXISTS idx_scan_history_url ON scan_history(url);
`;
