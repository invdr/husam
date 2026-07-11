# Production monitoring and backups

This baseline creates a consistent PocketBase backup every day by briefly
quiescing the PocketBase service, includes the uploaded files from
`pb_data/storage`, and records a five-minute nginx/PocketBase health check in
the systemd journal. Each backup is assembled in a private temporary directory
and published with an atomic rename after its checksums are written.

Set `POCKETBASE_DATA_ROOT` when PocketBase uses a data directory other than
`/opt/pocketbase/pb_data`.

## Installation

Copy the files from `bin/` to `/usr/local/sbin/` with mode `0750`, and the
files from `systemd/` to `/etc/systemd/system/`. Then run:

```bash
systemctl daemon-reload
systemctl enable --now husam-pocketbase-backup.timer husam-healthcheck.timer
systemctl start husam-pocketbase-backup.service
systemctl start husam-healthcheck.service
systemctl list-timers 'husam-*'
```

## Off-site copy

Local backups do not protect against loss of the VPS. Configure a separate
S3-compatible bucket or another storage destination and copy the completed
timestamped directory only after `SHA256SUMS` has been verified. The bucket
and retention policy must be chosen by the owner; do not put those credentials
in Git or in the PocketBase database. Perform a restore drill that verifies
both SQLite files and `storage.tar.gz` before relying on the backup.
