# Contract: `hiring-anonymize-candidate`

**Kind**: Supabase Edge Function
**Auth**: `verify_jwt = true`; caller role MUST ∈ {`rh`, `socio`, `admin`}.
**Path**: `POST /functions/v1/hiring-anonymize-candidate`

## Purpose

On-demand LGPD anonymization (FR-029) — invoked when a candidato asks
to be removed. Calls the SQL `anonymize_candidate(id)` function, deletes
the candidate's storage objects under `hiring/companies/*/jobs/*/
candidates/<id>/*`, and writes a log entry.

Also re-used internally by `hiring-cron-anonymize-expired` (service-role
call path); the two paths converge on the same SQL function so behaviour
is identical.

## Request body

```json
{
  "candidate_id": "uuid",
  "reason": "solicitacao | retencao_expirada",
  "requested_by_candidate_channel": "email | formulario | dpo_contact | outros",
  "evidence_note": "string | null"
}
```

## Response 200

```json
{
  "candidate_id": "uuid",
  "anonymized_at": "2026-04-16T12:00:00.000Z",
  "storage_objects_deleted": 4
}
```

## Response 403

- Caller role not allowed.
- Candidate not visible to caller's role/company scope.

## Response 404

Candidate does not exist.

## Response 409

Candidate is already anonymized (`anonymized_at IS NOT NULL`). Idempotent:
returns the existing `anonymized_at`.

## Side effects

- All tables named in `data-model.md#anonymization-contract` are
  rewritten.
- Storage objects under the candidate's prefix are deleted.
- `candidate_access_log` row with `action='update'`, `resource='candidates'`.
- If `reason = 'solicitacao'`, an auditable record is written with the
  `requested_by_candidate_channel` and `evidence_note` for LGPD
  compliance. If `reason = 'retencao_expirada'`, `actor_id` is the cron
  service user.

## Non-functional

- Idempotent.
- p95 latency: < 2 s including storage deletes (batch).
