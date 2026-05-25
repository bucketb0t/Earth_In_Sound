# Database Setup Guide

This guide explains how a collaborator can create their own Turso database and run the Earth In Sound project locally without accessing the project owner's private database.

## 1. What This Project Uses

Earth In Sound is being migrated to Turso for portable SQL-style database work.

The project expects these local environment variables:

```env
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
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

The local database needs the same tables expected by the app.

At minimum, the user system will use a `users` table with:

```text
email
username
role
status
createdAt
updatedAt
```

The exact SQL migration should be run from the project migration files once they are added.

Until migrations are finalized, ask the project owner for the current SQL setup step.

## 11. Run The Project

From the project root:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

## 12. Important Security Rules

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

## 13. Recommended Collaborator Workflow

Each collaborator should use:

```text
their own Turso database
their own .env.local file
their own local test data
```

The real production database should only be connected to the deployed website and trusted production environment variables.

