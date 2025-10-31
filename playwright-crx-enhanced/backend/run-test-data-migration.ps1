# PowerShell script to run Test Data Management SQL migration

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Data Management Migration Runner" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env file
if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Yellow
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value)
        }
    }
} else {
    Write-Host "WARNING: .env file not found. Using default values." -ForegroundColor Red
}

# Database connection parameters
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "playwright_user" }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "playwright123" }
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "playwright_crx" }

Write-Host "Database Configuration:" -ForegroundColor Green
Write-Host "  Host: $DB_HOST" -ForegroundColor White
Write-Host "  Port: $DB_PORT" -ForegroundColor White
Write-Host "  Database: $DB_NAME" -ForegroundColor White
Write-Host "  User: $DB_USER" -ForegroundColor White
Write-Host ""

# Set PGPASSWORD for non-interactive authentication
$env:PGPASSWORD = $DB_PASSWORD

# Migration file path
$migrationFile = "migrations\004_test_data_management.sql"

if (-Not (Test-Path $migrationFile)) {
    Write-Host "ERROR: Migration file not found at $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Running migration: $migrationFile" -ForegroundColor Cyan
Write-Host ""

# Execute migration
try {
    $psqlCommand = "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $migrationFile"
    
    Write-Host "Executing SQL migration..." -ForegroundColor Yellow
    Invoke-Expression $psqlCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "New tables created:" -ForegroundColor Cyan
        Write-Host "  - TestDataRepository" -ForegroundColor White
        Write-Host "  - TestDataSnapshot" -ForegroundColor White
        Write-Host "  - DataCleanupRule" -ForegroundColor White
        Write-Host "  - SyntheticDataTemplate" -ForegroundColor White
        Write-Host "  - ApiTestSuite" -ForegroundColor White
        Write-Host "  - ApiTestCase" -ForegroundColor White
        Write-Host "  - ApiContract" -ForegroundColor White
        Write-Host "  - ApiMock" -ForegroundColor White
        Write-Host "  - ApiPerformanceBenchmark" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Migration failed with error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart your backend server" -ForegroundColor White
Write-Host "  2. Test the new endpoints at /api/test-data-management and /api/api-testing" -ForegroundColor White
Write-Host "  3. Check API documentation at http://localhost:3000/api-docs" -ForegroundColor White
Write-Host ""
