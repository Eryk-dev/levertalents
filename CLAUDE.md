# Lever Talents Hub — Working Guide

This project uses **GSD (Get Shit Done)** workflow. Read planning artifacts before suggesting changes.

## Read first

| Artifact | What it tells you |
|----------|-------------------|
| `.planning/PROJECT.md` | Core value, locked decisions, constraints, what's out of scope |
| `.planning/REQUIREMENTS.md` | 82 v1 REQ-IDs grouped by category (TEN, RBAC, ORG, AUTH, RS, TAL, PERF, ONE, DASH, QUAL) |
| `.planning/ROADMAP.md` | 4 phases with goals, REQ mapping, success criteria, research flags |
| `.planning/STATE.md` | Current phase, active TODOs, open blockers |
| `.planning/research/SUMMARY.md` | Stack additions, architecture cornerstones, top pitfalls |
| `.planning/codebase/CONCERNS.md` | 40+ existing tech debt findings |

## What this is

SaaS multi-tenant unifying Performance Management (1:1, climate, evaluations) and R&S (recruiting). Operated by Grupo Lever (7 internal companies) and offered as R&S service to external client companies. Brownfield refactor focused on coesão e estabilidade — sem features novas grandes.

**Critério de done:** fluxos principais sem erro + dados batendo por escopo de empresa (ou grupo).

## Stack (locked)

- Vite 5 + React 18 + TypeScript 5.8 (strict)
- Supabase (Postgres + Auth + Realtime + Storage), project `ehbxpbeijofxtsbezwxd`
- shadcn/ui + Radix + Tailwind + Linear design system primitives (`Btn`, `Chip`, `LinearAvatar`)
- Brand primitive: `LeverArrow` (NEVER use Lucide ArrowX or font-display custom as logo stand-in)
- Package manager: **npm** (`package-lock.json` is canonical; `bun.lockb` is debt to be removed in Phase 1)

## Stack additions coming in this refactor

- `@casl/ability` 6.8 + `@casl/react` — RBAC client-side (defense-in-depth; RLS is the security boundary)
- `zustand` 5.0 — global scope selector store with `persist` middleware
- `vitest` 3.2 + `@testing-library/react` 16 + `msw` 2.10 — test stack (zero tests today)
- pgTAP + supabase-test-helpers — only reliable way to test RLS
- `@sentry/react` 10.50 — observability with mandatory `beforeSend` PII scrubbing
- `date-fns-tz` — `America/Sao_Paulo` formatting on `timestamptz`
- **DO NOT upgrade Zod 3 → 4** (incompatible with `@hookform/resolvers` 5.2.2)

## Architecture cornerstones (after Phase 1)

1. **RLS helper functions** as `STABLE SECURITY DEFINER SET search_path = public` returning `uuid[]` — `visible_companies(uid)`, `visible_org_units(uid)`, `org_unit_descendants(unit_id)`. Use `(SELECT auth.uid())` for initPlan caching (94-99% improvement, Supabase docs).
2. **Org_units = adjacency list** (`parent_id` self-reference per company), not ltree. Recursive CTE on indexed `(company_id, parent_id)`. BEFORE-trigger anti-cycle.
3. **Scope propagation**: `ScopeProvider` (Context + URL `?scope=`) + every TanStack queryKey prefixed with `['scope', scope.id, ...]` via `useScopedQuery` chokepoint hook. Switching scope is zero-cost (cache reused, no refetch).
4. **Migrations expand → backfill → contract** in 7 phases A-G. Only G is irreversible — runs last after 1+ week of stability.
5. **LGPD audit** via `data_access_log` (append-only, 36mo retention via pg_cron). PII reads go through RPC `read_X_with_log(id, context)`.

## Conventions

- All `supabase.from()` calls live in `src/hooks/` or `src/integrations/` — feature code uses `useScopedQuery` chokepoint (will be enforced via custom ESLint rule in Phase 1)
- queryKey ALWAYS includes `scope.id` (will be checked via `@tanstack/eslint-plugin-query`)
- Forms use `react-hook-form` 7.73 + `@hookform/resolvers` 5.2.2 + Zod 3.25 (no `as any` casts)
- Components > 800 lines are debt — break them when you touch them (CONCERNS.md flagged 1169-line monolith)
- No PII in `console.log` in production (CONCERNS.md flagged)
- Onboarding messages go via WhatsApp (RH copies generated message and sends), NOT email

## Current phase

See `.planning/STATE.md`. After roadmap approval (2026-04-27), next step is `/gsd-plan-phase 1` for Phase 1: Tenancy Backbone (36 REQs, migrations A-D).

## Pre-execution research flags (BEFORE starting these phases)

- **Phase 2:** calibrar volume médio de candidatos por vaga (V2-06 virtualization decision)
- **Phase 3:** confirmar template de avaliação global default vs por empresa (V2-05)
- **Phase 4 (BLOQUEANTE):** entrevista 30 min com owner sobre KPIs exatos do dashboard de sócio

## GSD workflow commands

- `/gsd-progress` — see current state and next action
- `/gsd-plan-phase N` — create plan for phase N
- `/gsd-execute-phase N` — execute approved plan
- `/gsd-verify-work` — UAT after phase execution
- `/gsd-help` — full command list

---

*Last regenerated: 2026-04-27 after roadmap creation*
