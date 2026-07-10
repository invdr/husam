# Production monitoring and backups

This baseline creates an online, consistent SQLite backup of PocketBase every
day and records a five-minute nginx/PocketBase health check in the systemd
journal. It deliberately stores backups locally with root-only permissions.

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
S3-compatible bucket or another storage destination before adding transfer
credentials. The bucket and retention policy must be chosen by the owner; do
not put those credentials in Git or in the PocketBase database.
