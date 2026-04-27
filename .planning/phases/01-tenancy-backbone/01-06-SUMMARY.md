---
phase: 1
plan: 06
subsystem: tenancy
tags: [scope-selector, header-ui, dropdown, dialog, empty-state, accessibility, tests]
requires: [01-05]
provides:
  - "ScopeTrigger header button (Linear/Notion-style ghost btn with kind icon + label + chevron)"
  - "ScopeDropdown panel (shadcn Popover + cmdk Command, GRUPOS/EMPRESAS, fuzzy search)"
  - "EmptyScopeState (D-09 sócio-without-empresa screen)"
  - "DirtyFormConfirmDialog (D-05 dirty-form gate UI)"
  - "Layout-level scope-null guard (replaces routed Outlet with empty state)"
  - "src/components/scope/ barrel export"
affects:
  - src/components/Header.tsx
  - src/components/Layout.tsx
  - tests/setup.ts (jsdom polyfills for ResizeObserver + Radix pointer-capture)
tech-stack:
  added: []
  patterns:
    - "shadcn Popover (align=end, sideOffset=6) wrapping cmdk Command — workspace switcher analog of CmdKPalette"
    - "shadcn Dialog (NOT AlertDialog) for the dirty-form confirmation — action is reversible per UI-SPEC.md § 4"
    - "Reuse of EmptyState wrapper (variant=decorated) for D-09 instead of building a new primitive"
    - "Inline ScopedOutlet helper inside Layout.tsx — gates <Outlet /> on useScope().scope without restructuring the chrome"
key-files:
  created:
    - src/components/scope/ScopeTrigger.tsx (89 LOC — ghost-btn trigger, aria-label = 'Você está vendo: X. Abrir seletor de escopo.')
    - src/components/scope/ScopeDropdown.tsx (154 LOC — Popover + Command + grouped list + DirtyFormConfirmDialog mount)
    - src/components/scope/EmptyScopeState.tsx (20 LOC — D-09 screen via EmptyState wrapper)
    - src/components/scope/DirtyFormConfirmDialog.tsx (67 LOC — D-05 modal driven by pendingScope)
    - src/components/scope/index.ts (4 LOC — barrel)
    - tests/scope/ScopeTrigger.test.tsx (89 LOC — 6 assertions)
    - tests/scope/ScopeDropdown.test.tsx (95 LOC — 3 assertions)
  modified:
    - src/components/Header.tsx (added ScopeDropdown import + mount BEFORE PendingTasksDropdown)
    - src/components/Layout.tsx (added ScopedOutlet helper + EmptyScopeState fallback)
    - tests/setup.ts (added jsdom polyfills for ResizeObserver + scrollIntoView + pointer-capture)
decisions:
  - "Drop the redundant <Search> icon next to <CommandInput> (the shadcn primitive already wraps itself with cmdk-input-wrapper + Search) — Rule 1 deviation, prevents double-search-icon visual bug."
  - "Use plain shadcn <CommandInput> instead of the custom flex+icon row from CmdKPalette — closer to the UI-SPEC.md § 2 minimal panel and avoids divergence with the CommandInput primitive."
  - "Polyfill ResizeObserver + scrollIntoView + pointer-capture in tests/setup.ts (Rule 3 deviation) so cmdk + Radix Popover render under jsdom; no-op stubs are safe because no test asserts on scroll/resize side effects."
  - "Wire <DirtyFormConfirmDialog /> as a sibling of <Popover> inside ScopeDropdown rather than mounting it globally — keeps the confirmation visually adjacent to the trigger and avoids changing App.tsx (handled by Plan 05's provider stack)."
metrics:
  duration_min: 18
  completed_date: 2026-04-27
  task_count: 6
  files_created: 7
  files_modified: 3
  lines_added: 542
---

# Phase 1 Plan 06: Scope Selector UI Summary

Visual scope-selector chokepoint (header trigger + Linear/Notion dropdown + dirty-form gate + sócio-without-empresa empty state) wired into Header + Layout, with 9 component tests asserting accessibility, kind-icon switching, and scope-change side effects.

## What was built

### Components shipped (src/components/scope/)

1. **`ScopeTrigger.tsx`** — header right-cluster ghost button.
   - Renders `Building2` (company) or `Layers` (group) at 14×14 + truncated 180px label + `ChevronDown` 12×12 (rotates 180° when popover open).
   - `aria-label="Você está vendo: ${scope.name}. Abrir seletor de escopo."` mirrors RBAC-07's persistent badge in a single visual element (D-03).
   - Hidden (returns `null`) while `isResolving` OR when `scope === null` (D-09 takes over).
   - Disabled state (`isFixed === true`, D-06) wraps the button in a Radix Tooltip with content `Seu escopo é fixo`; chevron is removed (visual cue that it doesn't open).
   - `data-state={open|closed}` for transition styling.
   - No Lucide ArrowX glyphs (brand fidelity rule).

2. **`ScopeDropdown.tsx`** — Popover + cmdk Command panel.
   - shadcn Popover (`align="end"`, `sideOffset={6}`) anchored to `<ScopeTrigger />` (used as `<PopoverTrigger asChild>`).
   - 320px wide surface, `bg-surface border border-border rounded-md shadow-popup`.
   - `<Command shouldFilter={true}>` — uses cmdk's built-in fuzzy scorer.
   - `<CommandInput placeholder="Buscar empresa ou grupo…">` — shadcn primitive already includes a `<Search>` glyph in `cmdk-input-wrapper` (we deliberately do NOT add a second).
   - Two `CommandGroup`s: `heading="GRUPOS"` (top, hidden if `visibleGroups.length === 0`) and `heading="EMPRESAS"` (hidden if `visibleCompanies.length === 0`). Eyebrow heading style via Tailwind `[&_[cmdk-group-heading]]:…` selectors (10.5px uppercase, 0.06em tracking, `text-text-subtle`).
   - Each `CommandItem` renders kind icon (Layers/Building2 14×14) + name + persistent `<Check>` (`text-accent-text`) when item matches the active scope.
   - Selected item gets `bg-accent-soft` background (overrides cmdk's `data-[selected=true]` hover).
   - `<CommandEmpty>`: `"Nenhum escopo encontrado."`.
   - Mounts `<DirtyFormConfirmDialog />` as a sibling so D-05 fires automatically whenever `setScope` triggers `pendingScope !== null`.
   - Returns `null` when `scope === null` (D-09 owns the screen — no orphan trigger).

3. **`EmptyScopeState.tsx`** — D-09 sócio-without-empresa screen.
   - Reuses `<EmptyState>` wrapper (which uses `variant="decorated"` by default — dashed border, 9×9 icon square, centered).
   - Title `"Sem empresa atribuída ainda"`.
   - Body `"Você ainda não tem empresa atribuída. Fale com o admin para liberar seu acesso."`.
   - Icon `Building2` (same semantic glyph as company-kind elsewhere).
   - No CTA — sócio has no in-app path forward; admin/RH resolves via `/empresas`.

4. **`DirtyFormConfirmDialog.tsx`** — D-05 dirty-form gate UI.
   - shadcn `Dialog` (NOT `AlertDialog` — UI-SPEC.md § Component Inventory: action is reversible).
   - Title `"Descartar alterações?"`, body explanation.
   - Primary CTA `"Trocar mesmo assim"` (autoFocus, calls `confirmPendingScope` from `useScope()`).
   - Secondary CTA `"Continuar editando"` (`Btn variant="ghost"`, calls `cancelPendingScope`).
   - NOT marked destructive — no `variant="danger"`, no red, per UI-SPEC.md § Copywriting (lost form state is recoverable).
   - Esc / overlay click both route through `cancelPendingScope` via `onOpenChange`.

5. **`index.ts`** — barrel with the 4 named exports.

### Wiring (Header + Layout)

- **`Header.tsx`** — added import `import { ScopeDropdown } from "@/components/scope";` and mounted `<ScopeDropdown />` as the FIRST element of the right cluster (line 76), BEFORE `<PendingTasksDropdown />` per UI-SPEC.md § 1 order: `[ScopeDropdown] [PendingTasksDropdown] [Btn Criar]`.
- **`Layout.tsx`** — added imports for `useScope` + `EmptyScopeState`, plus an inline `ScopedOutlet` helper that wraps the routed `<Outlet />`:
  - while `isResolving`: returns `null` (sidebar/header/banner stay mounted but main is empty)
  - when `scope === null`: returns `<EmptyScopeState />`
  - otherwise: returns `<Outlet />`
  The helper sits inside the existing `<PageTransition>` wrapper, so the page-fade animation still runs when scope flips.

### Tests (tests/scope/)

- **`ScopeTrigger.test.tsx`** (6 assertions):
  - aria-label exact-match for group scope
  - visible label renders the scope name
  - null DOM when `isResolving=true`
  - null DOM when `scope=null`
  - `disabled` attr when `isFixed=true`
  - company-kind scope label + aria-label end-to-end
- **`ScopeDropdown.test.tsx`** (3 assertions):
  - trigger click opens panel showing both GRUPOS + EMPRESAS sections + the search input
  - clicking an empresa item calls `setScope({kind:"company", id})`
  - null DOM when `scope=null`

### Test infrastructure

`tests/setup.ts` gained jsdom polyfills (no-op stubs):
- `ResizeObserver` — cmdk reads it on mount.
- `Element.prototype.scrollIntoView`, `hasPointerCapture`, `releasePointerCapture` — Radix Popover touches them.

## Verification results

| Check | Status |
|------:|:------:|
| `npm test` (entire suite) | 39/39 passing (was 29 — added 9, no regressions) |
| `npm test -- tests/scope/` | 38/38 passing |
| `npm run build` | clean (4.2s, no errors) |
| `npx tsc --noEmit -p tsconfig.app.json` | 42 errors — ALL pre-existing, none from `src/components/scope/` or my modifications |
| Header order check (`<ScopeDropdown />` before `<PendingTasksDropdown />`) | PASS (line 76 vs 77) |
| Layout guards present (`useScope` + `EmptyScopeState`) | PASS |
| Brand fidelity (no Lucide ArrowX in scope/) | PASS |
| Plan 06 grep gates (06-01..06-04 acceptance) | ALL PASS |

## Deviations from plan

### Auto-fixed Issues

**1. [Rule 1 - Visual Bug] Removed redundant `<Search>` icon next to `<CommandInput>`**
- **Found during:** Task 06-02 (ScopeDropdown).
- **Issue:** The plan's literal code template wrapped `<CommandInput>` in a flex row with a separate `<Search>` icon prepended. shadcn's `<CommandInput>` (in `src/components/ui/command.tsx` lines 38-53) already wraps itself with a `cmdk-input-wrapper` div containing a built-in `<Search>` glyph — using both would render two search icons stacked.
- **Fix:** Dropped the manual flex wrapper and the redundant `<Search>` import; used the shadcn primitive's intrinsic icon. Added a code comment explaining the choice so future edits don't re-introduce the duplication.
- **Files modified:** `src/components/scope/ScopeDropdown.tsx`.
- **Commit:** `60a38a1`.

**2. [Rule 3 - Test Infra Blocker] Polyfilled ResizeObserver + Radix pointer/scroll APIs in jsdom**
- **Found during:** Task 06-06 (running new ScopeDropdown tests).
- **Issue:** `userEvent.click(trigger)` opens the Popover, which mounts `<Command>` (cmdk) — cmdk reads `ResizeObserver` synchronously and crashed with `ReferenceError: ResizeObserver is not defined`. jsdom (used by vitest) doesn't ship one.
- **Fix:** Added no-op polyfills to `tests/setup.ts`:
  - `globalThis.ResizeObserver = class { observe(){}; unobserve(){}; disconnect(){} }` (only when undefined)
  - `Element.prototype.scrollIntoView`, `hasPointerCapture`, `releasePointerCapture` no-ops (Radix Popover/Command also touch these in some paths).
- **Why no-op is safe:** none of the existing or new tests assert on scroll position or resize callbacks; they only check rendered DOM and click behavior.
- **Files modified:** `tests/setup.ts`.
- **Commit:** `64f999d` (bundled with the test additions for atomicity — the tests would not pass without the polyfill, so they ship together).

### Architectural changes
None.

### Authentication gates
None.

## Threat surface scan

No new endpoints, no new auth paths, no schema/RLS changes — UI-only plan. The dropdown lists ONLY `visibleCompanies` ∪ `visibleGroups` from the provider, which is itself derived from `visible_companies()` / `visible_groups()` RPC helpers (Plan 05). Click-based scope tampering is mitigated upstream — confirmed in plan threat_model T-1-06.

## Known stubs

None. The four files all wire to live data from `useScope()` (Plan 05). The dropdown lists are populated when the provider's RPC resolves; the trigger label is the live `scope.name`; the empty state appears only when the provider sets `scope=null`. No placeholder text or hardcoded mock arrays.

## Self-Check: PASSED

**Files:**
- FOUND: src/components/scope/ScopeTrigger.tsx
- FOUND: src/components/scope/ScopeDropdown.tsx
- FOUND: src/components/scope/EmptyScopeState.tsx
- FOUND: src/components/scope/DirtyFormConfirmDialog.tsx
- FOUND: src/components/scope/index.ts
- FOUND: tests/scope/ScopeTrigger.test.tsx
- FOUND: tests/scope/ScopeDropdown.test.tsx

**Commits:**
- FOUND: 05146b6 (task 06-01: ScopeTrigger)
- FOUND: 83dfb5b (task 06-04: DirtyFormConfirmDialog)
- FOUND: 60a38a1 (task 06-02: ScopeDropdown)
- FOUND: bfc9b48 (task 06-03: EmptyScopeState)
- FOUND: 198a043 (task 06-05: barrel + Header/Layout wiring)
- FOUND: 64f999d (task 06-06: tests + jsdom polyfills)
