# Credential rotation — production database password and `SYNC_SECRET`

**Who:** the human only (charter §4.3). Agents prepare and verify; they do not
rotate, and they never read or print the values.

**Why now (2026-11-22):** the evaluation (`.evaluation/20261118-235807`,
finding SECF-02) found that both credentials have been recorded as exposed
through chat transcripts since 2026-08-11. `prod.env` has not changed since
2026-08-12, and backups using it still succeeded on 2026-11-21, so the database
password is live. Two local agent transcripts hold the full connection string;
the newest was written 2026-11-12.

## Order of operations

Work in this order, so that nothing runs against a half-rotated set:

1. **Pause the timers** for the duration (a sync started mid-swap fails):
   `systemctl --user stop 'openseimas-*.timer'`
2. **Keep the old values for the check** (optional, recommended): write them to
   `~/.config/openseimas/rotation-old.env` (mode 600) as `OLD_DB_DSN=…` and
   `OLD_SYNC_SECRET=…`. `rotate_check.sh` proves they are dead, then deletes
   the file.
3. **Neon:** reset the password of the database role the DSN uses. Copy the
   new connection string.
4. **Render, `DB_DSN`:** paste the new connection string into the service's
   environment. Render redeploys.
5. **Render, `SYNC_SECRET`:** generate a new value in the service's
   environment. Render redeploys again.
6. **Laptop:** put both new values into `~/.config/openseimas/prod.env`.
   Keep the file at mode 600.
7. **GitHub:** if a repository secret `DB_DSN` exists (it feeds the dormant
   workflows), update or delete it: `gh secret list`.
8. **Verify:** `scripts/local-ops/rotate_check.sh`. All checks must pass.
9. **Resume the timers:** `systemctl --user start 'openseimas-*.timer'`, then
   confirm the next sync and backup succeed with `scripts/local-ops/status.sh`.
10. **Record** the date below. Never the values.

## Summary draft and approval credentials (SECA-05)

Summary publication uses two additional, distinct credentials. They are not
replacements for the rotation above:

- Render holds `SUMMARY_DRAFT_SECRET`, `SUMMARY_APPROVE_SECRET` and the public
  reviewer label `SUMMARY_APPROVER_NAME`. All three values must be configured;
  the two secrets must differ from each other and from `SYNC_SECRET`.
- Add only `SUMMARY_DRAFT_SECRET` to `prod.env` for
  `Seimas.v2/scripts/publish_summaries.py`. That script now creates drafts and
  cannot approve them.
- Keep `SUMMARY_APPROVE_SECRET` and `SUMMARY_APPROVER_NAME` in a separate
  `~/.config/openseimas/summary-approver.env` (mode 600), and source it only for
  an interactive approval request. Do not source it for the batch publisher.
- The server ignores any request-body `approved_by`; the public value comes from
  `SUMMARY_APPROVER_NAME`.

## After rotating

- Agent sessions do not source `prod.env`. If an agent needs to read
  production, give it a read-only role (evaluation SECF-03), never the owner
  DSN or the admin token.
- Do not paste a connection string into a chat. That is how this exposure
  happened, and it recurred three months later.

## Rotation log

| Date | What | Verified by |
|---|---|---|
| — | Not yet rotated (exposure recorded 2026-08-11) | — |
