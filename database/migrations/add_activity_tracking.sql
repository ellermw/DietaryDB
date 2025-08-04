-- /opt/dietarydb/database/migrations/add_activity_tracking.sql
-- Add last_activity column to users table for real-time activity tracking

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE;

-- Create an index for performance when querying active users
CREATE INDEX IF NOT EXISTS idx_users_last_activity 
ON users(last_activity) 
WHERE is_active = true;

-- Update existing users to set last_activity to last_login if available
UPDATE users 
SET last_activity = last_login 
WHERE last_activity IS NULL AND last_login IS NOT NULL;

-- Create table for scheduled backups
CREATE TABLE IF NOT EXISTS backup_schedules (
    schedule_id SERIAL PRIMARY KEY,
    schedule_name VARCHAR(100) NOT NULL,
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
    schedule_time TIME NOT NULL,
    schedule_day_of_week INTEGER CHECK (schedule_day_of_week >= 0 AND schedule_day_of_week <= 6),
    schedule_day_of_month INTEGER CHECK (schedule_day_of_month >= 1 AND schedule_day_of_month <= 31),
    retention_days INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create table for backup history
CREATE TABLE IF NOT EXISTS backup_history (
    backup_id SERIAL PRIMARY KEY,
    backup_name VARCHAR(255) NOT NULL,
    backup_type VARCHAR(20) NOT NULL CHECK (backup_type IN ('manual', 'scheduled')),
    backup_size BIGINT,
    backup_path VARCHAR(500),
    schedule_id INTEGER REFERENCES backup_schedules(schedule_id),
    created_by VARCHAR(100),
    created_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'failed')),
    error_message TEXT
);