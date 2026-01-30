-- Aegis AI Database Initialization Script
-- This script runs automatically when PostgreSQL starts in Docker

-- Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Additional indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_file_content_gin ON "File" USING GIN (to_tsvector('english', "content"));
CREATE INDEX IF NOT EXISTS idx_note_content_gin ON "Note" USING GIN (to_tsvector('english', "content"));

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Set up triggers for updated_at columns
CREATE TRIGGER update_project_updated_at BEFORE UPDATE ON "Project"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_updated_at BEFORE UPDATE ON "Chat"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_updated_at BEFORE UPDATE ON "File"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_note_updated_at BEFORE UPDATE ON "Note"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initialize system settings with defaults
INSERT INTO "SystemSetting" ("key", "value", "updatedAt") 
VALUES (
  'system:initialized',
  '{"timestamp":"' || NOW() || '","version":"1.0"}',
  NOW()
)
ON CONFLICT DO NOTHING;

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
