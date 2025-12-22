-- Migration: Add monitor_checkpoints table for checkpoint-based monitoring
-- Purpose: Track the last processed checkpoint per network for sequential monitoring
-- This replaces deriving checkpoint from sui_package_deployments which fails when checkpoints have no deployments

-- Create monitor_checkpoints table
CREATE TABLE IF NOT EXISTS monitor_checkpoints (
  network TEXT PRIMARY KEY,
  last_processed_checkpoint BIGINT NOT NULL,
  last_processed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment explaining the table
COMMENT ON TABLE monitor_checkpoints IS 'Tracks the last processed checkpoint per network for the background monitor';
COMMENT ON COLUMN monitor_checkpoints.network IS 'Network identifier (mainnet or testnet)';
COMMENT ON COLUMN monitor_checkpoints.last_processed_checkpoint IS 'Sequence number of the last fully processed checkpoint';
COMMENT ON COLUMN monitor_checkpoints.last_processed_at IS 'Timestamp when this checkpoint was processed';
COMMENT ON COLUMN monitor_checkpoints.updated_at IS 'Timestamp of last update to this row';

-- Enable RLS (Row Level Security)
ALTER TABLE monitor_checkpoints ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for backend operations)
CREATE POLICY "Service role can manage monitor_checkpoints" ON monitor_checkpoints
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow public read access (for status endpoints)
CREATE POLICY "Public can read monitor_checkpoints" ON monitor_checkpoints
  FOR SELECT
  USING (true);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monitor_checkpoints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_monitor_checkpoints_updated_at ON monitor_checkpoints;
CREATE TRIGGER trigger_update_monitor_checkpoints_updated_at
  BEFORE UPDATE ON monitor_checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_monitor_checkpoints_updated_at();
