# Contract: `hiring-export-pipeline-csv`

**Kind**: Supabase Edge Function
**Auth**: `verify_jwt = true`; caller role MUST ∈ {`rh`, `socio`, `admin`,
`lider` (scoped to their companies)}.
**Path**: `GET /functions/v1/hiring-export-pipeline-csv`

## Purpose

Streams a CSV export of pipeline data for use in external reports
(FR-031). The query is scoped server-side to the caller's allowed
companies (RLS is re-enforced inside the function body by building the
`WHERE` clause from `app_role` + `user_allowed_companies(caller)`).

## Query params

| Name          | Type          | Notes |
|---------------|---------------|-------|
| `company_id`  | uuid, multi   | optional; if absent, use all caller-allowed |
| `from_date`   | YYYY-MM-DD    | opened_at ≥ |
| `to_date`     | YYYY-MM-DD    | opened_at ≤ |
| `status`      | enum, multi   | `job_status_enum` |
| `stage`       | enum, multi   | `application_stage_enum` |

## Response 200

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="hiring-export-YYYYMMDD-HHMM.csv"`
- Transfer-encoding: chunked

### Column set (stable)

```
company_name,job_id,job_title,job_status,job_opened_at,job_closed_at,
candidate_id,candidate_full_name,candidate_email,application_id,
application_stage,stage_entered_at,days_in_stage,
fit_cultural_submitted_at,background_status_flag,
last_interview_kind,last_interview_scheduled_at,
decision_outcome,hired_at
```

Anonymized candidates appear with `candidate_full_name = '[anonymized]'`
and `candidate_email = 'anon-<uuid>@anon.invalid'`; aggregate columns
are preserved.

## Response 403

- Caller role not allowed.
- Requested `company_id` outside caller scope (silently dropped from
  filter; if that empties the filter, returns 403).

## Side effects

- One audit log line per export (actor, filters, row count, duration).

## Non-functional

- Memory-bounded streaming (no `array.push` of all rows in Deno).
- p95 latency: < 3 s for ≤ 10 000 rows.
