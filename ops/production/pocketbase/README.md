# PocketBase production migrations

Files in `pb_migrations/` are intended for `/opt/pocketbase/pb_migrations/` on
the VPS. They are version-controlled here so that production access rules and
settings cannot silently diverge from the repository.

## Applying a migration safely

1. Create and verify an online SQLite backup of `data.db` and `auxiliary.db`.
2. Copy only the new migration file to the VPS.
3. Stop PocketBase, then start it again. The service applies unapplied
   migrations transactionally during startup.
4. Verify `/api/health`, the public catalogue, and an admin login/import.

To undo the last migration, stop the service, run
`/opt/pocketbase/pocketbase migrate down 1`, then start the service and repeat
the same smoke tests. Do not edit the production database directly while the
service is running.
