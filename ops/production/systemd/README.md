# PocketBase systemd hardening

`pocketbase.service.d/hardening.conf` is a drop-in for the existing
`pocketbase.service`; it does not replace its `ExecStart` or runtime user.

Apply only with a known-good database backup:

1. Copy the drop-in to `/etc/systemd/system/pocketbase.service.d/`.
2. Run `systemctl daemon-reload` and `systemd-analyze verify pocketbase.service`.
3. Restart PocketBase and immediately test `/api/health`, public reads, admin
   authentication, image uploads, and the CSV importer.
4. If any check fails, remove the drop-in and restart the service.

The `UMask` applies to newly-created files. Existing database and backup file
permissions are intentionally not changed by this drop-in because they belong
to the separate filesystem-permissions hardening task.
