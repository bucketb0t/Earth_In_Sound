-- Historical no-op: 001 already allowed the deleted status.
-- Keep this migration ID because existing databases may have recorded it.
SELECT 1;
