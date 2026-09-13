-- Enforce at most one owner row.
CREATE UNIQUE INDEX IF NOT EXISTS users_single_owner_index
ON users (role)
WHERE role = 'owner';
