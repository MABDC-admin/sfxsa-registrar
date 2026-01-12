# Database Migrations

This directory contains SQL migration scripts for updating the Railway PostgreSQL database schema.

## Current Migrations

### 001_add_profile_columns.sql (2026-01-12)
**Purpose:** Adds missing columns and tables to support refactored user management system

**Changes:**
- Adds `email` column to `profiles` table
- Adds `is_active` column to `profiles` table  
- Creates `subjects` table with default subjects
- Creates `teacher_subjects` junction table (many-to-many)
- Creates `teacher_grade_levels` junction table (many-to-many)

**Why needed:** The refactored user management utility requires these columns and tables to function properly. Without this migration, user creation will fail with "profile setup failed" error.

---

## How to Run Migrations

### Option 1: Using PowerShell Script (Windows - Recommended)

```powershell
cd backend\migrations
.\run-migration.ps1
```

The script will:
1. Check if `psql` is installed
2. Prompt for Railway connection string
3. Execute the migration
4. Show success/error messages

### Option 2: Using Bash Script (Mac/Linux)

```bash
cd backend/migrations
chmod +x run-migration.sh
./run-migration.sh
```

### Option 3: Manual Execution

If you prefer to run manually:

```bash
# Get your connection string from Railway Dashboard > Database > Connect
# It looks like: postgresql://postgres:PASSWORD@shortline.proxy.rlwy.net:35335/railway

psql 'YOUR_CONNECTION_STRING' -f backend/migrations/001_add_profile_columns.sql
```

### Option 4: Using Railway CLI

```bash
# Install Railway CLI if not already installed
# npm i -g @railway/cli

# Login and connect
railway login
railway link

# Run migration
railway connect postgres < backend/migrations/001_add_profile_columns.sql
```

### Option 5: Using Database Client GUI

You can also use GUI tools like:
- **TablePlus** (Mac/Windows)
- **DBeaver** (Cross-platform)
- **pgAdmin** (Cross-platform)

Steps:
1. Connect to Railway PostgreSQL using connection string
2. Open SQL query window
3. Copy contents of `001_add_profile_columns.sql`
4. Execute the script

---

## Prerequisites

Before running migrations, ensure you have:

1. **PostgreSQL Client Tools** (`psql`)
   - Windows: [Download from PostgreSQL.org](https://www.postgresql.org/download/windows/)
   - Mac: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql-client`

2. **Railway Connection String**
   - Go to Railway Dashboard
   - Select your project
   - Click on PostgreSQL database
   - Click "Connect" tab
   - Copy the connection string

---

## Troubleshooting

### Error: "psql: command not found"
Install PostgreSQL client tools (see Prerequisites above) or use Railway CLI.

### Error: "could not connect to server"
- Check your connection string is correct
- Ensure your IP is whitelisted in Railway (if applicable)
- Check your internet connection

### Error: "column already exists"
This is safe to ignore - the migration script checks for existing columns before adding them.

### Error: "relation already exists"
This is safe to ignore - the migration uses `CREATE TABLE IF NOT EXISTS`.

---

## Migration Status

| Migration | Status | Date Applied | Notes |
|-----------|--------|--------------|-------|
| 001_add_profile_columns.sql | ⏳ Pending | - | Run this ASAP |

After running a migration, update this table with:
- Status: ✅ Applied
- Date Applied: 2026-01-12
- Any notes or issues encountered

---

## Important Notes

⚠️ **CRITICAL:** You must run migration `001_add_profile_columns.sql` before using the refactored user management pages, otherwise user creation will fail.

✅ **Safe to run multiple times:** All migrations are idempotent - they check if changes already exist before applying them.

🔒 **Backup first:** While migrations are designed to be safe, it's always good practice to backup your database before running migrations on production data.

---

## Questions?

If you encounter issues:
1. Check the error message carefully
2. Verify your connection string
3. Ensure `psql` is installed and in PATH
4. Try using Railway CLI as alternative
5. Contact support if problems persist
