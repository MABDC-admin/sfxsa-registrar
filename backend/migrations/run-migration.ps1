# Database Migration Script for Windows PowerShell
# Applies schema updates to Railway PostgreSQL database
# Date: 2026-01-12

Write-Host "🔧 Railway PostgreSQL Migration Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if psql is installed
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "❌ Error: psql is not installed" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools from:" -ForegroundColor Yellow
    Write-Host "  https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or use Railway CLI: railway connect postgres" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ psql found at: $($psqlPath.Source)" -ForegroundColor Green
Write-Host ""

# Prompt for connection string
Write-Host "📝 Please enter your Railway PostgreSQL connection string:" -ForegroundColor Yellow
Write-Host "   (Get it from Railway Dashboard > Database > Connect)" -ForegroundColor Gray
Write-Host ""
$connectionString = Read-Host "Connection string"

if ([string]::IsNullOrWhiteSpace($connectionString)) {
    Write-Host "❌ Error: Connection string is required" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Running migration..." -ForegroundColor Cyan
Write-Host ""

# Run the migration
$migrationFile = "backend\migrations\001_add_profile_columns.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Error: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

try {
    & psql $connectionString -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Changes applied:" -ForegroundColor Cyan
        Write-Host "  - Added profiles.email column" -ForegroundColor White
        Write-Host "  - Added profiles.is_active column" -ForegroundColor White
        Write-Host "  - Created subjects table" -ForegroundColor White
        Write-Host "  - Created teacher_subjects junction table" -ForegroundColor White
        Write-Host "  - Created teacher_grade_levels junction table" -ForegroundColor White
        Write-Host ""
        Write-Host "🎉 Your database is now ready for the refactored user management!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed!" -ForegroundColor Red
        Write-Host "Please check the error messages above and try again." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error executing migration: $_" -ForegroundColor Red
    exit 1
}
