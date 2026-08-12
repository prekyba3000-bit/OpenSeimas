# Local ops layer

Scheduled maintenance for a laptop that is switched off most nights.

```bash
./status.sh          # what ran, what is overdue, where the backups are
```

## Why systemd timers and not cron

cron has no memory. If the machine is asleep at 03:30 the backup does not
happen, and nothing anywhere records that it did not happen.

Worse, the original crontab redirected every job's output into `logs/`, which
did not exist. `/bin/sh` cannot create the redirect target, so it exits **before
running the command** — every job died silently from the day it was installed.
The machine was powered on continuously 7–12 Aug 2026, so the 03:30 backup had
four opportunities with the lid open and produced nothing.

systemd user timers fix the scheduling half:

| Timer | When | `Persistent` | Catch-up |
|---|---|---|---|
| `openseimas-uptime` | every 15 min | false | no — point-in-time probe |
| `openseimas-refresh` | every 30 min | false | no — next tick repairs it |
| `openseimas-backup` | 03:30 daily | **true** | yes |
| `openseimas-sync` | 06:00 daily | **true** | yes |
| `openseimas-offsite` | Mon 04:00 | **true** | yes |
| `openseimas-catchup` | boot + hourly | — | the reporting sweep |

`Persistent=true` means systemd remembers the last trigger and fires the job
**once** after the next boot or resume, however many occurrences were missed.

## Why the scripts are due-aware too

`lib/due.sh` gives every job a last-**success** stamp in
`~/.local/state/openseimas/`. Each script accepts `--if-due` and returns
immediately when it is not. That makes the same script safe to run from the
timer, from the boot sweep, or by hand, without double-running — and a job that
*failed* keeps its old stamp, so it stays due and gets retried.

Run something regardless: `OPS_FORCE=1 ./db_backup.sh` or just omit `--if-due`.

## Files

| | |
|---|---|
| `status.sh` | one-glance state; run this first |
| `catchup.sh` | boot/resume sweep, runs only what was missed, notifies once |
| `db_backup.sh` | pg_dump of production Neon → `~/backups/openseimas` (keeps 30) |
| `daily_sync.sh` | migrations + ingest + stats export (idempotent) |
| `uptime_check.sh` | production `/health` ping |
| `refresh_stats.sh` | materialised view refresh |
| `offsite_backup.sh` | encrypted off-machine bundle (below) |
| `offsite_setup.sh` | one-time: passphrase + rclone OAuth instructions |
| `install_timers.sh` | install/enable the units, retire the cron lines |
| `test_catchup.sh` | 8 assertions proving one-run-per-missed-job |
| `lib/due.sh`, `lib/notify.sh` | shared due-tracking and notification |

## Off-machine backup

Until this existed, the only copy of the database dump sat on the disk it was
protecting, and the two files that **cannot be regenerated** — the Android
release keystore and the production credentials — had no backup at all.

Weekly: newest dump + all of `~/.config/openseimas/` → `tar | gpg` (AES-256,
streamed so the plaintext never hits disk) → verified by decrypt-and-list →
`rclone` to Google Drive. Remote keeps 4, local keeps 4.

### ⚠️ Two irreplaceable secrets, not one

The keystore is irreplaceable — lose it and the installed app can never be
updated. The **passphrase that encrypts its backup is now equally
irreplaceable**, and it lives on the same laptop the backup exists to survive.

> `OFFSITE_PASSPHRASE` in `~/.config/openseimas/offsite.env` **must also be in
> your password manager.** If the disk dies and the passphrase dies with it, the
> archive is undecryptable and the keystore is gone anyway.

### Restore

```bash
rclone copy gdrive:OpenSeimas/backups/<file>.tar.gz.gpg .
gpg --decrypt --output bundle.tar.gz <file>.tar.gz.gpg
tar -xzf bundle.tar.gz
```

Verified 2026-08-12: keystore restores bit-identical (sha256 match) and the dump
is a valid `pg_restore` archive.

## Notifications

Failures — not skips — raise a desktop notification and append to
`logs/ops-failures.log`, which `status.sh` surfaces. `libnotify-bin` is not
installed here, so `notify-send` was a missing binary swallowed by `|| true`;
the working path is `gdbus`, and if you ever `apt install libnotify-bin` it
upgrades to `notify-send` automatically.
