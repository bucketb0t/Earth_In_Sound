CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,

  auth_provider_user_id TEXT UNIQUE,

  email TEXT NOT NULL,
  email_lookup TEXT NOT NULL UNIQUE,

  username TEXT NOT NULL,
  username_lookup TEXT NOT NULL UNIQUE,

  role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('owner', 'admin', 'user')),

  status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'disabled', 'deleted')),

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS users_role_index
ON users (role);

CREATE INDEX IF NOT EXISTS users_status_index
ON users (status);

CREATE INDEX IF NOT EXISTS users_created_at_index
ON users (created_at);