-- Fix test data management tables to use VARCHAR user_id instead of INTEGER
-- This aligns with the authentication system that uses UUID strings

-- Drop foreign key constraints first
ALTER TABLE test_data_repositories DROP CONSTRAINT IF EXISTS test_data_repositories_user_id_fkey;
ALTER TABLE test_data_snapshots DROP CONSTRAINT IF EXISTS test_data_snapshots_created_by_fkey;
ALTER TABLE data_cleanup_rules DROP CONSTRAINT IF EXISTS data_cleanup_rules_user_id_fkey;
ALTER TABLE synthetic_data_templates DROP CONSTRAINT IF EXISTS synthetic_data_templates_user_id_fkey;
ALTER TABLE api_test_suites DROP CONSTRAINT IF EXISTS api_test_suites_user_id_fkey;

-- Update test_data_repositories table
ALTER TABLE test_data_repositories ALTER COLUMN user_id TYPE VARCHAR(255);

-- Update test_data_snapshots table
ALTER TABLE test_data_snapshots ALTER COLUMN created_by TYPE VARCHAR(255);

-- Update data_cleanup_rules table (if exists)
ALTER TABLE data_cleanup_rules ALTER COLUMN user_id TYPE VARCHAR(255);

-- Update synthetic_data_templates table (if exists)
ALTER TABLE synthetic_data_templates ALTER COLUMN user_id TYPE VARCHAR(255);

-- Update api_test_suites table (if exists)
ALTER TABLE api_test_suites ALTER COLUMN user_id TYPE VARCHAR(255);

-- Re-add foreign key constraints (assuming users.id is also VARCHAR)
-- Note: We'll reference the User table with proper case
ALTER TABLE test_data_repositories ADD CONSTRAINT test_data_repositories_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE test_data_snapshots ADD CONSTRAINT test_data_snapshots_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE data_cleanup_rules ADD CONSTRAINT data_cleanup_rules_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE synthetic_data_templates ADD CONSTRAINT synthetic_data_templates_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;

ALTER TABLE api_test_suites ADD CONSTRAINT api_test_suites_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;