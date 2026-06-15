-- The database, not only application code, prevents multiple owner rows.
CREATE UNIQUE INDEX IF NOT EXISTS users_single_owner_index
ON users (role)
WHERE role = 'owner';
