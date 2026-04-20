<!--
SYNC IMPACT REPORT
==================
Version change: (none) → 1.0.0
Bump rationale: Initial ratification. No prior constitution existed; all sections
authored from scratch based on codebase audit performed on 2026-04-16.

Modified principles: N/A (initial creation).
Added sections:
  - Core Principles (5 principles, all new)
  - Stack & Operational Constraints (new)
  - Development Workflow & Quality Gates (new)
  - Governance (new)
Removed sections: None.

Templates requiring updates:
  ✅ .specify/memory/constitution.md (this file, populated)
  ⚠ .specify/templates/plan-template.md — "Constitution Check" section is generic
     ("[Gates determined based on constitution file]"). Acceptable for v1.0.0;
     authors of plans MUST manually surface the 5 principles below as gates until
     a future amendment introduces concrete gate language.
  ⚠ .specify/templates/spec-template.md — No constitution-specific gates required
     at this version. Specs MUST still respect Principle III (no mock data masquerading
     as real behaviour) when defining acceptance scenarios.
  ⚠ .specify/templates/tasks-template.md — No category changes required at this
     version. Implementation tasks affecting Postgres schema, RLS, or Supabase
     Edge Functions MUST be tagged so reviewers can apply Principles I, II, IV.

Follow-up TODOs:
  - On the first amendment that touches schema, role model, or Edge Function
    contracts, revisit plan-template "Constitution Check" to encode explicit
    pass/fail criteria for each principle (currently human-judged).
-->

# Lever Talents Hub Constitution

Lever Talents Hub is a multi-tenant talent management platform that supports
performance evaluations, 1:1 meetings, individual development plans (PDIs),
climate surveys, and team/company structure for a consultancy serving multiple
client companies. This constitution governs how the codebase, schema, and
operational practices evolve so the product remains coherent across rounds of
refactoring.

## Core Principles

### I. Database is the Source of Truth

The Postgres schema served by Supabase is the single authoritative model of the
domain. Every change to it MUST land as a versioned file under
`supabase/migrations/`, applied in chronological order. The generated
`src/integrations/supabase/types.ts` MUST be regenerated after any schema change
and committed in the same change. The frontend MUST NOT reference tables,
columns, enum values, RLS policies, storage buckets, or RPCs that are absent
from the migrations on disk. Manual edits to the production database without a
corresponding migration are prohibited.

**Rationale**: The current breakage (orphaned `pending_tasks`, unused
`meeting-recordings` bucket, `'gestor'` role used in code but absent from the
enum) traces directly to drift between schema, types, and call sites. A single
source eliminates an entire class of "looks fine, fails at runtime" bugs.

### II. Roles and Row-Level Security Are Non-Negotiable

Authorization MUST be enforced in the database via RLS, not only in the UI.
Every public table MUST have RLS enabled and at least one explicit policy. The
set of roles used anywhere in the code (route guards, conditional rendering,
hooks, edge functions) MUST be a subset of the values in the `app_role` enum;
references to undeclared roles are prohibited. The Supabase service-role key
MUST never be embedded in or shipped to the browser; any operation that
requires it MUST run inside an Edge Function (see Principle IV). Self-signup
MUST always assign a default role so no authenticated user is left without a
policy match.

**Rationale**: A frontend-only check is a UX hint, not a security boundary. The
existing app routes admins to pages that immediately reject them, treats
`'gestor'` as a real role even though Postgres has no such value, and creates
profiles via trigger without assigning a role — every one of these is fixed by
keeping role logic anchored in the database.

### III. No Mock Data in Shipped UI

Every metric, chart, list, badge, or status indicator displayed in production
UI MUST be sourced from a live query (React Query against Supabase, or a
documented Edge Function). Hardcoded sample data is allowed only inside
Storybook-style isolated examples, fixtures used by automated tests, or
explicitly labelled "preview" surfaces. When real data is unavailable for a
view, the UI MUST render an empty state, skeleton, or "coming soon" notice that
makes the absence obvious to the user, never fabricated numbers.

**Rationale**: Today's dashboards (RH, Sócio, Gestor, Climate) display fake
9BOX distributions, fake clima scores, fake team counts. Stakeholders interpret
these as real, which destroys trust the moment they notice the data does not
move. The app exists to surface honest signal about people; lying with mock
data contradicts that purpose.

### IV. Privileged Operations Live in Edge Functions

Any action that requires the Supabase service role, calls a third-party paid
API (OpenAI, Lovable AI Gateway, etc.), aggregates data across users, or
mutates auth.users MUST be implemented as a Supabase Edge Function. Edge
Functions MUST set `verify_jwt = true` and re-check the caller's role inside
the handler before performing the privileged action. Browser code MUST NEVER
call `supabase.auth.admin.*`. API keys MUST be read from environment variables
in the function runtime, never from the client bundle. Functions that consume
billable APIs MUST validate input size before forwarding and SHOULD log
structured usage metrics.

**Rationale**: `AdminDashboard.tsx` and `useTeams.ts` currently call
`auth.admin.listUsers()` from the browser with the anon key — a guaranteed
failure mode and a security smell. `transcribe-audio` and `summarize-meeting`
are exposed with `verify_jwt = false`, so anyone on the internet can drain
quota. Concentrating privilege in audited functions fixes both classes of
problem.

### V. The 1:1 → PDI Loop Is the Backbone

The product's primary value loop — schedule a 1:1, conduct it (with optional
audio capture, transcription, and AI summary), create a PDI tied to that 1:1,
track progress against that PDI, and review it in the next 1:1 — MUST remain
intact through every refactor. Foreign keys (`development_plans.one_on_one_id`,
`development_plan_updates.plan_id`, `team_members.leader_id`) MUST be preserved
or replaced with stricter constraints, never silently dropped. Features added
to the app MUST integrate with this loop or stay clearly orthogonal; they MUST
NOT replace it with a parallel mechanism. Any change that breaks the
end-to-end flow (schedule → conduct → link PDI → progress) is a regression and
blocks release until restored.

**Rationale**: Everything else (climate surveys, evaluations, team management)
exists to feed signal into this loop. If a refactor disconnects 1:1 from PDI
or PDI from progress tracking, the app loses the ability to deliver its
central promise even if every screen still renders.

## Stack & Operational Constraints

The shipped stack is fixed for this version of the product:

- **Frontend**: Vite 5 + React 18 + TypeScript 5.8, routed with
  `react-router-dom@6`, data layer via `@tanstack/react-query@5`, UI via
  shadcn/ui (Radix primitives + Tailwind 3.4 + `class-variance-authority`).
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions in Deno).
- **AI**: OpenAI Whisper for transcription, Lovable AI Gateway (Gemini) for
  summarisation. No additional AI vendors without an amendment.
- **Auth model**: email + password, single role per user stored in
  `public.user_roles`, role enum is `app_role`.

Adding a new top-level dependency (anything that becomes a `dependencies` entry
in `package.json`) MUST be justified in writing inside the PR description.
Removing a Radix primitive that is in use without replacing the affected
components is forbidden. The required environment variables
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, plus any function
secrets) MUST be documented in a committed `.env.example`. Secrets MUST NEVER
be committed; `.env*` (except `.env.example`) MUST be in `.gitignore`.

## Development Workflow & Quality Gates

- **Schema changes** MUST go through `supabase migration new <name>`, be
  reviewed alongside the regenerated `types.ts`, and include the RLS policies
  for any newly created table in the same migration.
- **Pull requests** that touch RLS, the `app_role` enum, Edge Function
  contracts, or the 1:1/PDI relationship require a second reviewer who
  explicitly notes that Principles I, II, IV, and V were considered.
- **Type safety**: the codebase compiles cleanly under
  `tsc --noEmit`; PRs MUST NOT introduce new `any` casts on Supabase responses
  unless the row shape is genuinely dynamic and a comment explains why.
- **Linting**: `npm run lint` MUST pass. Disabled rules require a justification
  comment.
- **Local verification**: a UI change MUST be exercised in a running dev server
  (`npm run dev`) before merge; the reviewer SHOULD be told what was clicked.
- **Edge Functions**: deployable via `supabase functions deploy`; secrets
  configured via `supabase secrets set`. Functions MUST be tested locally with
  `supabase functions serve` before deploy when feasible.

## Governance

This constitution supersedes ad-hoc conventions, comments in individual files,
and prior verbal agreements. When code disagrees with the constitution, the
constitution wins and the code MUST be updated.

Amendments follow this procedure:

1. Open a change that edits `.specify/memory/constitution.md` and any
   templates affected by the amendment.
2. The change MUST include a refreshed Sync Impact Report at the top of the
   file (HTML comment) covering version delta, modified/added/removed
   principles, template propagation status, and follow-up TODOs.
3. Versioning follows semantic versioning:
   - **MAJOR** for removing or redefining a principle in a backward-incompatible
     way (e.g., relaxing RLS-enforcement, dropping the 1:1→PDI backbone).
   - **MINOR** for adding a new principle or materially expanding a section.
   - **PATCH** for clarifications, wording, or non-semantic refinements.
4. The amendment MUST be reviewed by at least one maintainer who confirms the
   propagation checklist is complete.
5. After merge, all open feature plans MUST be re-evaluated against the new
   constitution at their next touch.

Compliance is verified at PR review time. Reviewers MUST flag violations of
any principle as blocking. Justified exceptions MUST be recorded in the PR
description and revisited in the next quarterly review of this document.

**Version**: 1.0.0 | **Ratified**: 2026-04-16 | **Last Amended**: 2026-04-16
