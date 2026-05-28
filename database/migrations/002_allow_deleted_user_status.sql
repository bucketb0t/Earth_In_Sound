BEGIN TRANSACTION;

CREATE TABLE users_next (
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

INSERT INTO users_next (
  id,
  auth_provider_user_id,
  email,
  email_lookup,
  username,
  username_lookup,
  role,
  status,
  created_at,
  updated_at
)
SELECT
  id,
  auth_provider_user_id,
  email,
  email_lookup,
  username,
  username_lookup,
  role,
  status,
  created_at,
  updated_at
FROM users;

DROP TABLE users;

ALTER TABLE users_next RENAME TO users;

CREATE INDEX IF NOT EXISTS users_role_index
ON users (role);

CREATE INDEX IF NOT EXISTS users_status_index
ON users (status);

CREATE INDEX IF NOT EXISTS users_created_at_index
ON users (created_at);

COMMIT;
