-- Migration: Historical Checkpoints Table
-- Purpose: Track progress of historical backfill monitor (separate from live monitoring)
-- This allows dual-cursor system: live monitor for real-time, historical for backfill

-- Create historical_checkpoints table
CREATE TABLE IF NOT EXISTS historical_checkpoints (
  network TEXT PRIMARY KEY,
  last_processed_checkpoint BIGINT NOT NULL DEFAULT 0,
  backfill_enabled BOOLEAN DEFAULT true,
  backfill_start_checkpoint BIGINT DEFAULT 0,
  last_processed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_historical_checkpoints_network
  ON historical_checkpoints(network);

CREATE INDEX IF NOT EXISTS idx_historical_checkpoints_enabled
  ON historical_checkpoints(backfill_enabled)
  WHERE backfill_enabled = true;

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_historical_checkpoint_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_historical_checkpoint_timestamp
  BEFORE UPDATE ON historical_checkpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_historical_checkpoint_timestamp();

-- Enable Row Level Security
ALTER TABLE historical_checkpoints ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to historical_checkpoints"
  ON historical_checkpoints FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow service role full access to historical_checkpoints"
  ON historical_checkpoints FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert initial values for both networks
INSERT INTO historical_checkpoints (
  network,
  last_processed_checkpoint,
  backfill_start_checkpoint,
  backfill_enabled
)
VALUES
  ('testnet', 0, 0, true),
  ('mainnet', 0, 0, true)
ON CONFLICT (network) DO NOTHING;

-- Add index to sui_package_deployments for efficient deployment time queries
CREATE INDEX IF NOT EXISTS idx_sui_deployments_timestamp_network
  ON sui_package_deployments(timestamp DESC, network);

CREATE INDEX IF NOT EXISTS idx_sui_deployments_network_timestamp
  ON sui_package_deployments(network, timestamp DESC);

-- Comments for documentation
COMMENT ON TABLE historical_checkpoints IS 'Tracks progress of historical backfill monitor (separate from live monitoring). Enables dual-cursor system for real-time + backfill.';
COMMENT ON COLUMN historical_checkpoints.network IS 'Network identifier (testnet or mainnet)';
COMMENT ON COLUMN historical_checkpoints.last_processed_checkpoint IS 'Last checkpoint processed by historical backfill monitor';
COMMENT ON COLUMN historical_checkpoints.backfill_enabled IS 'Toggle to enable/disable historical backfill for this network';
COMMENT ON COLUMN historical_checkpoints.backfill_start_checkpoint IS 'Checkpoint to start backfill from (configurable, default 0)';
COMMENT ON COLUMN historical_checkpoints.last_processed_at IS 'Timestamp of last successful checkpoint processing';
COMMENT ON COLUMN historical_checkpoints.updated_at IS 'Auto-updated timestamp on any change';
