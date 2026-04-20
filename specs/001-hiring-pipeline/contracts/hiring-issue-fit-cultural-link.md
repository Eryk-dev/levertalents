# Contract: `hiring-issue-fit-cultural-link`

**Kind**: Supabase Edge Function
**Auth**: `verify_jwt = true`; caller role MUST ∈ {`rh`, `socio`, `admin`}.
**Path**: `POST /functions/v1/hiring-issue-fit-cultural-link`

## Purpose

Mints a single-use token that allows the candidato to submit the Fit
Cultural form via the public endpoint (FR-015). Writes a
`cultural_fit_tokens` row containing only the **hash** of the token.
Returns the raw token to the caller once; the raw token is never
persisted.

## Request body

```json
{
  "application_id": "uuid",
  "survey_id": "uuid"
}
```

## Response 200

```json
{
  "application_id": "uuid",
  "survey_id": "uuid",
  "token": "base64url-32-byte",
  "public_url": "https://<app-host>/hiring/fit/<token>",
  "expires_at": "2026-04-19T12:00:00.000Z"
}
```

The RH-side UI uses this URL to compose a message (email/WhatsApp —
handled outside the app per spec Assumptions). The backend **does not**
send the message itself in v1.

## Response 403 / 404 / 409

- 403: role not allowed / company scope mismatch.
- 404: application or survey not found.
- 409: there is already an active (unconsumed, unexpired, unrevoked)
  token for this application — includes `existing_token_id` and
  `existing_expires_at`. The client can choose to call `revoke` before
  re-issuing.

## Side effects

- `cultural_fit_tokens` insert.
- `applications.stage = 'aguardando_fit_cultural'` (if not already).
- `application_stage_history` appended.
- `candidate_access_log` row.

## Non-functional

- Token is 32 bytes (base64url, 43 chars) generated via
  `crypto.getRandomValues` in Deno.
- Token hash: SHA-256 hex over the raw token.
- Expiry: `issued_at + INTERVAL '3 days'` (Clarifications Q3).
