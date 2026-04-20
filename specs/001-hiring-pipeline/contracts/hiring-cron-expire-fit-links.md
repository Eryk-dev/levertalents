# Contract: `hiring-cron-expire-fit-links`

**Kind**: Supabase Edge Function (invoked by pg_cron via `net.http_post`)
**Auth**: `verify_jwt = false`; **protected by a shared-secret header**
(`x-cron-secret`).
**Schedule**: `*/30 * * * *` (every 30 minutes).

## Purpose

Enforces the 3-day Fit Cultural link expiration (Clarifications Q3,
FR-015). Finds every `cultural_fit_tokens` row with `expires_at < now()`
and `consumed_at IS NULL` and `revoked_at IS NULL`, marks them
`revoked_at = now()`, and flips the associated application's stage to
`sem_retorno` if it is still in `aguardando_fit_cultural`.

## Request body

Empty.

## Response 200

```json
{
  "tokens_revoked": 7,
  "applications_updated": 5,
  "duration_ms": 230
}
```

## Response 403

If `x-cron-secret` header is missing or wrong.

## Side effects

- `cultural_fit_tokens.revoked_at = now()` for matched rows.
- `applications.stage = 'sem_retorno'` where applicable.
- `application_stage_history` appended.
- In-app notification to RH owners of affected applications.

## Non-functional

- Single transaction per application (optimistic concurrency: if the
  application has moved off `aguardando_fit_cultural` in the meantime,
  the stage update is skipped — the token is still revoked).
- Wall-clock budget: < 30 s per run.
