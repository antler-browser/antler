/**
 * Migration: Create app_state table
 * Stores global application state
 */
export default `-- Migration: Create app_state table
-- Stores global application state

CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_did TEXT,
  has_completed_welcome INTEGER NOT NULL DEFAULT 0,
  CHECK (id = 1) -- Ensure only one row
);

-- Insert default app state
INSERT OR IGNORE INTO app_state (id, current_did, has_completed_welcome)
VALUES (1, NULL, 0);
`;
