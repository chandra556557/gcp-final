-- Test Data Repository Tables
CREATE TABLE IF NOT EXISTS test_data_repositories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL, -- 'json', 'csv', 'database', 'api', 'synthetic'
  source TEXT, -- connection string, file path, or API endpoint
  config JSONB, -- configuration for data generation/connection
  row_count INTEGER DEFAULT 0,
  column_names JSONB,
  last_refreshed TIMESTAMP,
  auto_refresh BOOLEAN DEFAULT false,
  refresh_interval INTEGER, -- in minutes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_test_data_repo_user ON test_data_repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_test_data_repo_type ON test_data_repositories(data_type);

-- Test Data Snapshots
CREATE TABLE IF NOT EXISTS test_data_snapshots (
  id SERIAL PRIMARY KEY,
  repository_id INTEGER NOT NULL REFERENCES test_data_repositories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  snapshot_data JSONB NOT NULL,
  row_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_snapshot_repo ON test_data_snapshots(repository_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_created ON test_data_snapshots(created_at);

-- Data Cleanup Rules
CREATE TABLE IF NOT EXISTS data_cleanup_rules (
  id SERIAL PRIMARY KEY,
  repository_id INTEGER NOT NULL REFERENCES test_data_repositories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  cleanup_type VARCHAR(50) NOT NULL, -- 'post_test', 'scheduled', 'manual'
  schedule VARCHAR(100), -- cron expression
  query_template TEXT NOT NULL, -- SQL or cleanup logic
  enabled BOOLEAN DEFAULT true,
  last_executed TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cleanup_repo ON data_cleanup_rules(repository_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_enabled ON data_cleanup_rules(enabled);

-- Synthetic Data Templates
CREATE TABLE IF NOT EXISTS synthetic_data_templates (
  id SERIAL PRIMARY KEY,
  repository_id INTEGER NOT NULL REFERENCES test_data_repositories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  field_name VARCHAR(255) NOT NULL,
  data_type VARCHAR(50) NOT NULL, -- 'name', 'email', 'phone', 'address', 'custom'
  generator VARCHAR(100) NOT NULL, -- 'faker', 'ai', 'pattern', 'sequence'
  config JSONB, -- generator configuration
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_synthetic_repo ON synthetic_data_templates(repository_id);

-- API Test Suite Tables
CREATE TABLE IF NOT EXISTS api_test_suites (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  base_url VARCHAR(500),
  headers JSONB,
  auth_config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_suite_user ON api_test_suites(user_id);

-- API Test Cases
CREATE TABLE IF NOT EXISTS api_test_cases (
  id SERIAL PRIMARY KEY,
  suite_id INTEGER NOT NULL REFERENCES api_test_suites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE, PATCH
  endpoint VARCHAR(500) NOT NULL,
  headers JSONB,
  query_params JSONB,
  body TEXT,
  expected_status INTEGER,
  expected_response JSONB,
  assertions JSONB,
  timeout INTEGER DEFAULT 5000,
  retry_count INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_test_suite ON api_test_cases(suite_id);
CREATE INDEX IF NOT EXISTS idx_api_test_enabled ON api_test_cases(enabled);

-- API Contract Definitions
CREATE TABLE IF NOT EXISTS api_contracts (
  id SERIAL PRIMARY KEY,
  suite_id INTEGER NOT NULL REFERENCES api_test_suites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  contract_type VARCHAR(50) NOT NULL, -- 'openapi', 'swagger', 'graphql', 'custom'
  contract_data JSONB NOT NULL,
  validation_rules JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_suite ON api_contracts(suite_id);

-- API Mock Servers
CREATE TABLE IF NOT EXISTS api_mocks (
  id SERIAL PRIMARY KEY,
  suite_id INTEGER NOT NULL REFERENCES api_test_suites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  method VARCHAR(10) NOT NULL,
  response_status INTEGER DEFAULT 200,
  response_headers JSONB,
  response_body TEXT,
  response_delay INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mock_suite ON api_mocks(suite_id);
CREATE INDEX IF NOT EXISTS idx_mock_enabled ON api_mocks(enabled);

-- API Performance Benchmarks
CREATE TABLE IF NOT EXISTS api_performance_benchmarks (
  id SERIAL PRIMARY KEY,
  test_case_id INTEGER NOT NULL REFERENCES api_test_cases(id) ON DELETE CASCADE,
  run_id VARCHAR(255) NOT NULL,
  response_time INTEGER NOT NULL, -- in milliseconds
  status_code INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  error_msg TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_benchmark_test ON api_performance_benchmarks(test_case_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_timestamp ON api_performance_benchmarks(timestamp);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_test_data_repo_updated_at ON test_data_repositories;
CREATE TRIGGER update_test_data_repo_updated_at BEFORE UPDATE ON test_data_repositories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cleanup_rule_updated_at ON data_cleanup_rules;
CREATE TRIGGER update_cleanup_rule_updated_at BEFORE UPDATE ON data_cleanup_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_synthetic_template_updated_at ON synthetic_data_templates;
CREATE TRIGGER update_synthetic_template_updated_at BEFORE UPDATE ON synthetic_data_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_suite_updated_at ON api_test_suites;
CREATE TRIGGER update_api_suite_updated_at BEFORE UPDATE ON api_test_suites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_test_updated_at ON api_test_cases;
CREATE TRIGGER update_api_test_updated_at BEFORE UPDATE ON api_test_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_contract_updated_at ON api_contracts;
CREATE TRIGGER update_api_contract_updated_at BEFORE UPDATE ON api_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_mock_updated_at ON api_mocks;
CREATE TRIGGER update_api_mock_updated_at BEFORE UPDATE ON api_mocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
