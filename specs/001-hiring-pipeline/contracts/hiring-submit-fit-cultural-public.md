# Contract: `hiring-submit-fit-cultural-public`

**Kind**: Supabase Edge Function
**Auth**: **Public** — `verify_jwt = false`. The function itself
validates the token. **This is the ONLY public function introduced by
this feature.**
**Path**: `POST /functions/v1/hiring-submit-fit-cultural-public`

## Purpose

Endpoint hit by the public Fit Cultural form (`/hiring/fit/<token>`).
Validates the token, writes the response, marks the token consumed.

## Request body

```json
{
  "token": "base64url-32-byte",
  "honeypot": "string (MUST be empty)",
  "responses": {
    "<question_id>": <answer>,
    ...
  }
}
```

## Token validation (in order)

1. `honeypot` empty? Otherwise 400 and rate-limit strike.
2. Rate-limit: ≤ 10 submissions per IP per hour; ≤ 3 for the same
   token. If exceeded → 429.
3. SHA-256 the raw `token`; look up `cultural_fit_tokens` row by
   `token_hash`.
4. Reject if `consumed_at IS NOT NULL` or `revoked_at IS NOT NULL` or
   `expires_at < now()`.
5. Validate that every `cultural_fit_questions.id` for the survey is
   answered and the answer shape matches the `kind` (scale ≤ bounds,
   multi_choice ∈ options, text non-empty if required).

## Response 200

```json
{
  "application_id": "uuid",
  "submitted_at": "2026-04-16T12:00:00.000Z"
}
```

## Response 400

- Malformed body / missing question answer / honeypot not empty.

## Response 404

- Token not found / already consumed / revoked / expired.

## Response 429

- Rate-limit exceeded.

## Side effects

- `cultural_fit_responses` insert (`application_id`, `survey_id`,
  `payload`).
- `cultural_fit_tokens.consumed_at = now()`.
- `applications.stage = 'fit_recebido'`.
- `application_stage_history` appended.
- In-app notification to the RH that owns the vaga.

## Security

- `verify_jwt = false`, so the function **must not** trust any user
  identity from the request. It runs with the service role internally
  and performs writes via the admin client — never returning sensitive
  data in the response beyond `application_id` and `submitted_at`.
- Rate limit implemented with an in-memory per-instance counter plus a
  `fit_submission_attempts(ip inet, window_start timestamptz, count
  int)` table for cross-instance safety.
- Honeypot field present in the HTML form is named generically
  (`website` or `subject_line`) and hidden via CSS; bots that fill it
  fail closed.
