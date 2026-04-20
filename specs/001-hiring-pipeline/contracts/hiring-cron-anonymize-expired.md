# Contract: `hiring-cron-anonymize-expired`

**Kind**: Supabase Edge Function (invoked by pg_cron via `net.http_post`)
**Auth**: `verify_jwt = false`; **protected by a shared-secret header**
(`x-cron-secret`) sourced from the Supabase Vault. Function rejects any
request where the header does not match the secret.
**Schedule**: `0 3 * * *` (daily at 03:00 UTC).

## Purpose

Automatic LGPD retention enforcement (FR-029). Finds every candidate
whose processes are all closed more than 5 years ago and has not been
anonymized yet, and calls the same SQL function
`anonymize_candidate(id)` used by the on-demand path.

## Request body

Empty. The function queries candidates internally.

## Response 200

```json
{
  "scanned": 1234,
  "anonymized": 42,
  "errors": 0,
  "duration_ms": 871
}
```

## Response 403

If `x-cron-secret` header is missing or wrong.

## Side effects

- Calls `anonymize_candidate(id)` for each matching candidate.
- Writes a cron-run log entry (actor = cron service user).
- Surfaces errors in Supabase function logs; a run with errors > 0
  alerts (operational dashboards — outside this feature scope, but the
  log format is stable for later wiring).

## Non-functional

- Processes candidates in batches of 100 to keep transaction size
  bounded.
- Wall-clock budget: < 5 minutes for expected volumes over next 5 y.
