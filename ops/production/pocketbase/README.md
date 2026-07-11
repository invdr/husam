# PocketBase production migrations

Files in `pb_migrations/` are intended for `/opt/pocketbase/pb_migrations/` on
the VPS. They are version-controlled here so that production access rules and
settings cannot silently diverge from the repository.

## Pinned backend

Production recovery is pinned to PocketBase `v0.37.5` on Linux amd64.
Download `pocketbase_0.37.5_linux_amd64.zip` only from the official release
and verify this SHA-256 before replacing `/opt/pocketbase/pocketbase`:

```text
8faf6fc372604c62a20450daadbbe83b090e191a9784ff0eb1fb361d288fdb98
```

Keep the backend binary and this checksum with the restore runbook. The
frontend JavaScript SDK version is independent of the PocketBase server
version.

## Applying a migration safely

1. Create and verify a quiesced backup of both SQLite files and `storage/`.
2. Copy only the new migration file to the VPS.
3. Stop PocketBase, then start it again. The service applies unapplied
   migrations transactionally during startup.
4. Verify `/api/health`, the public catalogue, and an admin login/import.

For a restore drill, stop PocketBase, verify `SHA256SUMS`, restore both SQLite
files and `storage.tar.gz`, install the pinned backend binary, then start the
service and repeat the smoke tests.

To undo the last migration, stop the service, run
`/opt/pocketbase/pocketbase migrate down 1`, then start the service and repeat
the same smoke tests. Do not edit the production database directly while the
service is running.
