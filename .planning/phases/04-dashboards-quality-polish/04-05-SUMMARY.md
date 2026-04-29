---
plan: 04-05-cmd-k-palette-refactor
phase: 04-dashboards-quality-polish
status: complete
completed: 2026-04-29T08:31:20-03:00
tasks: 1/1
tdd: RED → GREEN
tests: 7/7 passing
---

# Plan 04-05 Summary — CmdK Palette Refactor

## What was built

Refactored `src/components/CmdKPalette.tsx` (309 → 296 lines) so the
dynamic search routes through the canonical `useScopedQuery` chokepoint
and calls the new `global_search` RPC signature with
`p_company_ids = scope.companyIds`. Static actions now match the D-07
lock (only "Criar nova vaga" + "Convidar / criar pessoa"); PDI entries
removed from the action set and the RPC result rendering. UI-SPEC
visuals (input row `px-4 py-3`, CommandItem `py-2 px-3`, debounce 150ms)
applied. Tests rewritten to lock the new contract (D-08 default state,
D-09 queryKey, P4-V02 contract, P4-V07 debounce, UI-SPEC copy).

## Why it matters

Before this refactor, after Plan 04-03 pushed the new `global_search`
signature to the remote, the production palette would fail at runtime
(it was still calling the 2-arg version). This closes the runtime gap
and brings the palette under the scope-aware query discipline established
in earlier phases.

## Tasks executed

| # | Phase | Commit | Description |
|---|-------|--------|-------------|
| 1 | RED   | `d983911` | 7 failing specs (default state, action lock, scoped search, PDI removal, debounce, queryKey contract, copy) |
| 1 | GREEN | `e137ff2` | Refactor: scoped useScopedQuery + RPC new signature, D-07 actions lock, drop 'pdi' RemoteKind, UI-SPEC visuals |

## Key files

### Modified
- `src/components/CmdKPalette.tsx` (309 → 296 lines)
- `src/components/CmdKPalette.test.tsx` (rewritten, 7 specs)

### Touched
- `.planning/phases/04-dashboards-quality-polish/deferred-items.md` (logged RHDashboard pre-existing tsc errors as out-of-scope)

## Tests

```
src/components/CmdKPalette.test.tsx
  ✓ Test 1 — default state shows only static groups (Ações + Ir para)
  ✓ Test 2 — action set respects canManage (lider does not see Ações)
  ✓ Test 3 — scoped search passes p_company_ids from current scope
  ✓ Test 4 — PDI rows from RPC are NOT rendered as a group
  ✓ Test 5 — debounce 150ms via fake timers (P4-V07)
  ✓ Test 6 — D-09 queryKey contract: ["scope", id, kind, ..., "global-search", q]
  ✓ Test 7 — placeholder and footer match UI-SPEC copy

  7 passed (7)
```

## Decisions honored

- **D-07 (action set lock)** — only "Criar nova vaga" + "Convidar / criar pessoa"
- **D-08 (default state)** — no recents; static groups only
- **D-09 (scoped search)** — `useScopedQuery` chokepoint with `p_company_ids`
- **P4-V02 (queryKey contract)** — `['scope', id, kind, 'global-search', q]`
- **P4-V07 (debounce)** — 150ms
- **UI-SPEC** — input `px-4 py-3`, CommandItem `py-2 px-3`, placeholder copy

## Deferred items

- RHDashboard pre-existing `tsc` errors logged in `deferred-items.md`
  (inherited from earlier phases; not introduced by this plan).

## Self-Check: PASSED

- All 7 tests green
- File ≤ 320 lines target (296)
- No modifications to STATE.md or ROADMAP.md
- TDD discipline followed (RED commit precedes GREEN commit)
- D-07 action set verified (no PDI, 1:1, avaliação, or trocar escopo)
- queryKey contract verified by Test 6
