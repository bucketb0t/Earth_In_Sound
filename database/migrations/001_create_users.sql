-- Project user profile table.
-- Better Auth owns passwords/sessions; this table owns username, role, status.
CREATE TABLE IF NOT EXISTS users (
  -- Internal project id.
  id TEXT PRIMARY KEY NOT NULL,

  -- Better Auth user.id, attached after signup/auth connection.
  auth_provider_user_id TEXT UNIQUE,

  -- Visible email and lowercase lookup key.
  email TEXT NOT NULL,
  email_lookup TEXT NOT NULL UNIQUE,

  -- Visible username and lowercase lookup key.
  username TEXT NOT NULL,
  username_lookup TEXT NOT NULL UNIQUE,

  -- Permission role used by owner/admin/user actions.
  role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('owner', 'admin', 'user')),

  -- Lifecycle status; deleted is soft-delete, not physical removal.
  status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'disabled', 'deleted')),

  -- Unix millisecond timestamps written by TypeScript.
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Role/status/time indexes support admin searches and dashboards.
CREATE INDEX IF NOT EXISTS users_role_index
ON users (role);

CREATE INDEX IF NOT EXISTS users_status_index
ON users (status);

CREATE INDEX IF NOT EXISTS users_created_at_index
ON users (created_at);
