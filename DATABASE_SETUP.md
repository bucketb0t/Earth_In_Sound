# Database Setup Guide

This guide explains how a collaborator can create their own Turso database and run the Earth In Sound project locally without accessing the project owner's private database.

## 1. What This Project Uses

Earth In Sound is being migrated to Turso for portable SQL-style database work.

Database-related files are split by role:

```text
backend/database/turso-client.ts
  Server-only Turso client.

backend/database/users
  User database code split by role:
  validation/validate-user-input.ts
  permissions/user-permissions.ts
  read/read-users.ts
  write/write-users.ts

backend/database/migrations
  SQL files that create or change database tables.

backend/database/scripts
  Terminal setup scripts and database test hubs.
```

The project expects these local environment variables:

```env
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
```

Never commit real values for these variables to GitHub.

## 2. Install Project Dependencies

From the project root:

```powershell
cd "D:\Projects\Personal Projects\earth-in-sound"
npm install
```

If Turso support has already been added to the project, `@libsql/client` should be installed from `package.json`.

If it is missing, install it:

```powershell
npm install @libsql/client
```

## 3. Create A Turso Account

Go to:

```text
https://turso.tech
```

Create an account or log in.

Each collaborator should use their own Turso account and their own development database.

## 4. Install Turso CLI

On Windows, Turso CLI is usually installed through WSL.

Open PowerShell as Administrator and install WSL if needed:

```powershell
wsl --install -d Ubuntu
```

After Ubuntu is installed, open Ubuntu and install Turso:

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

Close and reopen Ubuntu, then confirm Turso works:

```bash
turso --version
```

## 5. Log In To Turso

Inside Ubuntu/WSL:

```bash
turso auth login --headless
```

Copy the URL/code into your normal browser and complete login.

Check the logged-in account:

```bash
turso auth whoami
```

## 6. Create A Development Database

Inside Ubuntu/WSL:

```bash
turso db create earth-in-sound-dev
```

This creates a personal development database.

## 7. Get Database Credentials

Show the database information:

```bash
turso db show earth-in-sound-dev
```

Copy the database URL. It should start with:

```text
libsql://
```

Create an auth token:

```bash
turso db tokens create earth-in-sound-dev
```

Copy the token and keep it private.

## 8. Create `.env.local`

In the project root, create:

```text
.env.local
```

Add:

```env
TURSO_DATABASE_URL=libsql://your-database-url-here
TURSO_AUTH_TOKEN=your-token-here
BETTER_AUTH_SECRET=generate-a-long-random-secret
BETTER_AUTH_URL=http://localhost:3000
```

Do not use quotes.

Do not commit `.env.local`.

## 9. Confirm `.env.local` Is Ignored

Make sure `.gitignore` includes:

```gitignore
.env*.local
```

Check Git status:

```powershell
git status --short
```

`.env.local` should not appear.

## 10. Create The Database Tables

The database schema is stored in committed SQL migration files.

Run the database setup hub from the project root:

```powershell
npm run database:setup
```

The setup hub applies project migrations in filename order, records each applied
migration, and then runs Better Auth's own migrations.

This creates the `users` table with:

```text
id
auth_provider_user_id
email
email_lookup
username
username_lookup
role
status
created_at
updated_at
```

The lookup fields are lowercase search/uniqueness helpers. The original `email` and `username` fields keep the visible values exactly as typed.

Account status rules:

```text
active
  The account can act normally.
  The user can change their own username.

disabled
  The account cannot act.
  The email and username remain reserved.
  The account can be reactivated later.

deleted
  The account cannot act.
  The Better Auth account and sessions are removed.
  The email lookup is released for a new account.
  The username remains permanently reserved to prevent impersonation.
  The account cannot be reactivated through the normal account flow.
```

## 11. Create The First Owner Account

The project includes a setup script for creating the first owner account.

In Command Prompt:

```cmd
set LOCAL_OWNER_EMAIL=owner@example.com
set LOCAL_OWNER_USERNAME=OwnerName
set LOCAL_OWNER_PASSWORD=use-a-strong-password
npm run database:setup
```

In PowerShell:

```powershell
$env:LOCAL_OWNER_EMAIL="owner@example.com"
$env:LOCAL_OWNER_USERNAME="OwnerName"
$env:LOCAL_OWNER_PASSWORD="use-a-strong-password"
npm run database:setup
```

`run-database-setup.ts` applies project migrations, runs Better Auth migrations,
and creates or repairs the first owner as a real Better Auth account.

The owner setup refuses to create a second owner. Existing legacy owner rows
without an auth id are securely linked by this server-only setup flow.

Run all database tests from the test hub:

```powershell
npm run test:database
```

The user database test can also be run by itself:

```powershell
npx tsx backend/database/scripts/users/test-users/test-user-database.ts
```

## 12. Run The Project

From the project root:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

## 13. Important Security Rules

Do not commit:

```text
.env.local
TURSO_AUTH_TOKEN
production database URLs
production database tokens
```

Safe to commit:

```text
source code
SQL migration files
.env.example
documentation
```

If a token is accidentally shared, revoke it from Turso and create a new one.

## 14. Recommended Collaborator Workflow

Each collaborator should use:

```text
their own Turso database
their own .env.local file
their own local test data
```

The real production database should only be connected to the deployed website and trusted production environment variables.
