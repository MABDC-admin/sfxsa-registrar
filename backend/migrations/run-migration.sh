#!/bin/bash

# Database Migration Script
# Applies schema updates to Railway PostgreSQL database
# Date: 2026-01-12

echo "🔧 Railway PostgreSQL Migration Script"
echo "========================================"
echo ""

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql is not installed"
    echo "Please install PostgreSQL client tools:"
    echo "  Windows: https://www.postgresql.org/download/windows/"
    echo "  Mac: brew install postgresql"
    echo "  Linux: sudo apt-get install postgresql-client"
    exit 1
fi

echo "✅ psql found"
echo ""

# Prompt for connection string
echo "📝 Please enter your Railway PostgreSQL connection string:"
echo "   (Get it from Railway Dashboard > Database > Connect)"
echo ""
read -p "Connection string: " CONNECTION_STRING

if [ -z "$CONNECTION_STRING" ]; then
    echo "❌ Error: Connection string is required"
    exit 1
fi

echo ""
echo "🚀 Running migration..."
echo ""

# Run the migration
psql "$CONNECTION_STRING" -f backend/migrations/001_add_profile_columns.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📊 Changes applied:"
    echo "  - Added profiles.email column"
    echo "  - Added profiles.is_active column"
    echo "  - Created subjects table"
    echo "  - Created teacher_subjects junction table"
    echo "  - Created teacher_grade_levels junction table"
    echo ""
    echo "🎉 Your database is now ready for the refactored user management!"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above and try again."
    exit 1
fi
