# Contract: `hiring-approve-application`

**Kind**: Supabase Edge Function
**Auth**: `verify_jwt = true`; caller role MUST ∈ {`rh`, `socio`, `admin`}
(re-validated inside the handler — constitution IV).
**Path**: `POST /functions/v1/hiring-approve-application`

## Purpose

When RH confirms the admissão after a successful `hiring_decisions.outcome
= 'aprovado'`, this function:

1. Creates a `profiles` row for the new colaborador (pré-cadastro).
2. Inserts the corresponding `team_members` row (leader relationship).
3. Creates the `employee_onboarding_handoff` tying the application to the
   new profile.
4. Transitions the application from `aprovado` → `em_admissao`.
5. Sends the invite email via `supabase.auth.admin.inviteUserByEmail`
   (service role, server-side only — constitution IV).

All writes share a single DB transaction; if any step fails, nothing is
persisted.

## Request body

```json
{
  "application_id": "uuid",
  "expected_updated_at": "2026-04-16T12:00:00.000Z",
  "team_id": "uuid | null",
  "leader_id": "uuid | null",
  "final_title": "string | null",
  "contract_type": "clt | pj | estagio | pj_equity",
  "start_date": "YYYY-MM-DD | null",
  "cost_cents": 1234500
}
```

## Response 200

```json
{
  "application_id": "uuid",
  "profile_id": "uuid",
  "handoff_id": "uuid",
  "stage": "em_admissao",
  "updated_at": "2026-04-16T12:00:01.234Z"
}
```

## Response 409 (optimistic-lock conflict — FR-032)

```json
{
  "error": "stale_record",
  "latest_updated_at": "2026-04-16T12:00:00.789Z"
}
```

Client MUST refetch and reapply.

## Response 403

- Caller role not allowed.
- Caller's company scope does not include this application's company.

## Response 422

- `application.stage != 'aprovado'` (only approved applications can be
  handed off).
- Required fields missing (e.g., `leader_id` null in companies that
  require it).

## Side effects

- `applications.stage = 'em_admissao'`
- `application_stage_history` appended
- `candidate_access_log` row with `action='update'`, `resource='applications'`
- Notification to the new colaborador's email (invite link)
- Notification (in-app) to `requested_by` gestor

## Non-functional

- Idempotent per `application_id`: a second call when already in
  `em_admissao` returns 409 (not 500), letting RH retry safely.
- p95 latency target: < 1.5 s (accounts for invite email round-trip).
