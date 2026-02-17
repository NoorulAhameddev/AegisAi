-- Create fallback queue table for Redis fallback mechanism
CREATE TABLE IF NOT EXISTS fallback_queue (
  id VARCHAR(255) PRIMARY KEY,
  queue_name VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);

-- Create indexes for queue operations
CREATE INDEX IF NOT EXISTS idx_fallback_queue_status ON fallback_queue(queue_name, status);
CREATE INDEX IF NOT EXISTS idx_fallback_queue_created ON fallback_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_fallback_queue_processed ON fallback_queue(processed_at);

-- Grant privileges if needed
GRANT ALL PRIVILEGES ON fallback_queue TO CURRENT_USER;
