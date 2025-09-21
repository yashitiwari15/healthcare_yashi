# PostgreSQL Setup Guide

This guide will help you set up PostgreSQL for the AI Healthcare Management System.

## Prerequisites

- Windows 10/11
- Node.js (already installed)
- npm (already installed)

## Step 1: Install PostgreSQL

### Option A: Download from Official Website (Recommended)

1. Go to [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)
2. Click "Download the installer"
3. Run the downloaded `.exe` file
4. Follow the installation wizard:
   - Choose installation directory (default is fine)
   - Select components (keep all selected)
   - Choose data directory (default is fine)
   - Set password for `postgres` user (remember this password!)
   - Choose port (default 5432 is fine)
   - Choose locale (default is fine)
5. Complete the installation

### Option B: Using Package Manager

If you have Chocolatey installed:
```bash
choco install postgresql
```

If you have Scoop installed:
```bash
scoop install postgresql
```

## Step 2: Verify Installation

1. Open Command Prompt or PowerShell
2. Navigate to PostgreSQL bin directory (usually `C:\Program Files\PostgreSQL\16\bin`)
3. Run: `psql --version`
4. You should see the PostgreSQL version

## Step 3: Start PostgreSQL Service

### Option A: Using Services (Recommended)
1. Press `Win + R`, type `services.msc`, press Enter
2. Find "postgresql-x64-16" (or similar)
3. Right-click and select "Start" if not already running
4. Set startup type to "Automatic" for auto-start

### Option B: Using Command Line
```bash
# Start PostgreSQL service
net start postgresql-x64-16

# Stop PostgreSQL service
net stop postgresql-x64-16
```

## Step 4: Configure Database

1. Update your `config.env` file with the correct credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=healthcare_db
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password_here
   ```

2. Run the database setup script:
   ```bash
   node setup-database.js
   ```

## Step 5: Test the Connection

1. Start your application:
   ```bash
   node server.js
   ```

2. You should see:
   ```
   ✅ Database connection established successfully.
   ✅ Database models synchronized.
   🚀 Server is running on port 3000
   ```

## Troubleshooting

### Common Issues:

1. **"Connection refused" error:**
   - Make sure PostgreSQL service is running
   - Check if port 5432 is not blocked by firewall

2. **"Authentication failed" error:**
   - Verify the password in `config.env`
   - Make sure you're using the correct username (usually `postgres`)

3. **"Database does not exist" error:**
   - Run `node setup-database.js` to create the database

4. **"Permission denied" error:**
   - Make sure the postgres user has permission to create databases
   - Try running as administrator

### Useful Commands:

```bash
# Connect to PostgreSQL using psql
psql -U postgres -h localhost

# List all databases
\l

# Connect to specific database
\c healthcare_db

# List all tables
\dt

# Exit psql
\q
```

## Production Deployment

For production deployment, consider:

1. **Environment Variables:**
   - Use environment variables instead of config.env
   - Set strong passwords
   - Use connection pooling

2. **Security:**
   - Enable SSL connections
   - Use non-default ports
   - Implement proper user roles and permissions

3. **Cloud Options:**
   - AWS RDS PostgreSQL
   - Google Cloud SQL
   - Azure Database for PostgreSQL
   - Heroku Postgres

## Next Steps

Once PostgreSQL is set up:

1. Your application will automatically create all necessary tables
2. You can start using the healthcare management system
3. All data will be stored in PostgreSQL instead of SQLite
4. You're ready for production deployment!

## Support

If you encounter any issues:
1. Check the PostgreSQL logs
2. Verify your configuration
3. Ensure all services are running
4. Check firewall settings
