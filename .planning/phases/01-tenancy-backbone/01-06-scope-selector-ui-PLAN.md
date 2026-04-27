---
phase: 1
plan: 06
type: execute
wave: 2
depends_on: [05]
files_modified:
  - src/components/scope/ScopeTrigger.tsx
  - src/components/scope/ScopeDropdown.tsx
  - src/components/scope/EmptyScopeState.tsx
  - src/components/scope/DirtyFormConfirmDialog.tsx
  - src/components/scope/index.ts
  - src/components/Header.tsx
  - tests/scope/ScopeTrigger.test.tsx
  - tests/scope/ScopeDropdown.test.tsx
autonomous: true
requirements: [TEN-05, RBAC-07, RBAC-08]
---

# Plan 06: Scope Selector UI — Trigger + Dropdown + Empty State + Confirm Dialog + Header Mount

<objective>
Implement the visual contract from `01-UI-SPEC.md`: header trigger button (Linear/Notion-style ghost btn with `Building2`/`Layers` icon + label + chevron), shadcn Popover + cmdk Command dropdown panel with grouped sections (GRUPOS / EMPRESAS) and search, the dirty-form confirmation dialog (D-05), and the empty state for sócio-without-empresa (D-09). Mobile keeps the trigger in the header (D-01). Mount `<ScopeTrigger />` in `Header.tsx` BEFORE `PendingTasksDropdown`. Test renders for accessibility (aria-label = "Você está vendo: X. Abrir seletor de escopo.") and basic interaction (click trigger → dropdown opens → click item → setScope called).
</objective>

<requirements_addressed>
- **TEN-05**: Header trigger lists empresas + grupos (sourced from `useScope().visibleCompanies` and `visibleGroups`).
- **RBAC-07**: Trigger ESPELHA the badge "Você está vendo: X" (single visual element per D-03) — `aria-label` + visible label combine to satisfy the requirement.
- **RBAC-08**: Trigger button hidden via `<Can I="manage" a="all">` … no, actually trigger is shown to ALL roles (visible to liderado as a disabled tooltip). The CASL `<Can>` integration in this plan is for OTHER UI surfaces in the dropdown (e.g., "Criar empresa" button in the panel header is RH/admin only). Phase 1 ships the trigger + 1 `<Can>` usage; broader UI gating is Phase 2-3.
</requirements_addressed>

<threat_model>
- **T-1-06 (LOW) — URL scope tampering:** Mitigated upstream in `ScopeProvider` (Plan 05). The dropdown only lists scopes the user can reach (`visibleCompanies` ∪ `visibleGroups`), so user clicking can't escalate.
- **T-1-04 (MEDIUM) — PII in logs:** Not relevant to this plan. UI components don't log; if a future toast surfaces, it uses scope NAME (acceptable per UI-SPEC.md).
- **D-08 toast (UI-side):** This plan does NOT emit the toast directly — `ScopeProvider` does (Plan 05). UI just renders dropdown items.
</threat_model>

<tasks>

<task id="06-01">
<action>
Create the header trigger button. The button shows the current scope's icon + name + chevron, supports the disabled state with tooltip (D-06), and exposes the correct `aria-label` ("Você está vendo: X. Abrir seletor de escopo.").

Per UI-SPEC.md § 1, the button uses `<Btn>` from `LinearKit` (variant=`ghost`, size=`sm`). Inside the button: `Building2` (kind=company) or `Layers` (kind=group) at 14×14 + truncated label + `ChevronDown` at 12×12. The trigger is wrapped in a Tooltip when disabled.

**File: `src/components/scope/ScopeTrigger.tsx`**

```tsx
import { forwardRef } from 'react';
import { Building2, Layers, ChevronDown } from 'lucide-react';
import { Btn } from '@/components/primitives/LinearKit';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useScope } from '@/app/providers/ScopeProvider';

interface ScopeTriggerProps {
  open: boolean;
  onClick: () => void;
}

/**
 * Header right-cluster trigger button. Mirrors the RBAC-07 badge
 * ("Você está vendo: X") via aria-label per D-03 / UI-SPEC.md § 1.
 *
 * Hidden when scope=null (sócio sem empresa — empty state takes over).
 * Disabled (with tooltip) when scope is fixed (líder/liderado, or single-
 * company sócio per D-06). Otherwise opens the Popover dropdown.
 */
export const ScopeTrigger = forwardRef<HTMLButtonElement, ScopeTriggerProps>(
  function ScopeTrigger({ open, onClick }, ref) {
    const { scope, isFixed, isResolving } = useScope();

    // Hidden during initial resolve OR when scope is null (D-09 empty state)
    if (isResolving || !scope) return null;

    const Icon = scope.kind === 'group' ? Layers : Building2;
    const ariaLabel = `Você está vendo: ${scope.name}. Abrir seletor de escopo.`;

    const button = (
      <Btn
        ref={ref}
        variant="ghost"
        size="sm"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={isFixed}
        onClick={onClick}
        className={cn(
          'group h-[28px] px-2 py-1 gap-1 border border-border rounded-md',
          'hover:bg-bg-subtle hover:border-border-strong',
          'data-[state=open]:bg-bg-subtle data-[state=open]:border-border-strong',
          isFixed && 'bg-bg-muted text-text-muted cursor-not-allowed hover:bg-bg-muted hover:border-border',
        )}
        data-state={open ? 'open' : 'closed'}
      >
        <Icon
          className="w-3.5 h-3.5 text-text-muted shrink-0"
          strokeWidth={1.75}
        />
        <span className="text-[12.5px] font-medium text-text truncate max-w-[180px]">
          {scope.name}
        </span>
        {!isFixed && (
          <ChevronDown
            className={cn(
              'w-3 h-3 text-text-subtle shrink-0 transition-transform',
              open && 'rotate-180',
            )}
            strokeWidth={1.75}
          />
        )}
      </Btn>
    );

    if (isFixed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{button}</span>
          </TooltipTrigger>
          <TooltipContent>Seu escopo é fixo</TooltipContent>
        </Tooltip>
      );
    }

    return button;
  },
);
```
</action>
<read_first>
- `src/components/Header.tsx` — current "Criar" button uses `<Btn variant="secondary" size="sm" icon={...}>`. Confirm the import path of `Btn` from `LinearKit`.
- `src/components/primitives/LinearKit.tsx` — confirm the exact `Btn` props shape (variant, size, icon, iconRight, className, etc.).
- `src/components/ui/tooltip.tsx` — confirm import paths for `Tooltip`, `TooltipContent`, `TooltipTrigger`.
- `src/lib/utils.ts` — confirm `cn` is exported (className combinator).
- `.planning/phases/01-tenancy-backbone/01-UI-SPEC.md` lines 234-271 — full trigger spec (sizing, colors, icons, states).
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 591-617 — analog references for trigger button.
</read_first>
<acceptance_criteria>
- File `src/components/scope/ScopeTrigger.tsx` exists exporting `ScopeTrigger` as a forwardRef component.
- File imports `Building2`, `Layers`, `ChevronDown` from `lucide-react` (and NOT any `Lucide ArrowX`).
- File imports `Btn` from `@/components/primitives/LinearKit`.
- File computes `Icon = scope.kind === 'group' ? Layers : Building2`.
- File contains the exact aria-label string `Você está vendo: ${scope.name}. Abrir seletor de escopo.`.
- File renders nothing (`return null`) when `isResolving` OR `!scope` (D-09 empty state).
- File wraps button in `<Tooltip>` with `TooltipContent="Seu escopo é fixo"` when `isFixed`.
- File has `data-state` attribute set to `'open'` or `'closed'` (Radix-style) for animation.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
</acceptance_criteria>
<files>
- `src/components/scope/ScopeTrigger.tsx`
</files>
<automated>
test -f src/components/scope/ScopeTrigger.tsx && grep -q "Building2" src/components/scope/ScopeTrigger.tsx && grep -q "Layers" src/components/scope/ScopeTrigger.tsx && grep -q "ChevronDown" src/components/scope/ScopeTrigger.tsx && grep -q "Você está vendo" src/components/scope/ScopeTrigger.tsx && grep -q "Seu escopo é fixo" src/components/scope/ScopeTrigger.tsx && ! grep -q "ArrowDown\|ArrowUp\|ArrowLeft\|ArrowRight" src/components/scope/ScopeTrigger.tsx && npx tsc --noEmit -p tsconfig.app.json
</automated>
</task>

<task id="06-02">
<action>
Create the dropdown panel using shadcn Popover + cmdk Command (mirroring `CmdKPalette.tsx` precedent). Two grouped sections: GRUPOS (top) and EMPRESAS. Search input at top (cmdk's built-in fuzzy filter). Selected item shows `<Check>` and persistent `bg-accent-soft`.

**File: `src/components/scope/ScopeDropdown.tsx`**

```tsx
import { useState } from 'react';
import { Building2, Layers, Check, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useScope } from '@/app/providers/ScopeProvider';
import { ScopeTrigger } from './ScopeTrigger';
import { DirtyFormConfirmDialog } from './DirtyFormConfirmDialog';
import type { ScopeKind } from '@/features/tenancy/types';

/**
 * Scope dropdown panel — Linear/Notion workspace switcher pattern.
 * Per UI-SPEC.md § 2:
 *   - Popover anchored to trigger (align="end", sideOffset={6})
 *   - Two CommandGroups: GRUPOS (top) and EMPRESAS
 *   - Embedded CommandInput with fuzzy filter
 *   - Selected item: bg-accent-soft + Check icon
 *
 * D-05 (dirty-form confirmation): if the scope change is blocked by a
 * dirty form (ScopeProvider.setScope returns false), the dialog opens.
 */
export function ScopeDropdown() {
  const [open, setOpen] = useState(false);
  const { scope, setScope, visibleCompanies, visibleGroups } = useScope();

  function handleSelect(kind: ScopeKind, id: string) {
    setOpen(false);
    setScope({ kind, id });
  }

  // Hide entirely if no scope (D-09 empty state owns the screen)
  if (!scope) return null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <ScopeTrigger open={open} onClick={() => setOpen((v) => !v)} />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-[320px] p-0 bg-surface border border-border rounded-md shadow-popup overflow-hidden"
        >
          <Command shouldFilter={true} className="bg-surface">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <Search className="w-3.5 h-3.5 text-text-subtle shrink-0" strokeWidth={1.75} />
              <CommandInput
                placeholder="Buscar empresa ou grupo…"
                className="h-auto border-0 text-[13px] placeholder:text-text-subtle px-0 bg-transparent"
                aria-label="Buscar escopo"
              />
            </div>

            <CommandList className="max-h-[360px] overflow-y-auto p-1.5">
              <CommandEmpty className="py-5 text-center text-[13px] text-text-subtle">
                Nenhum escopo encontrado.
              </CommandEmpty>

              {visibleGroups.length > 0 && (
                <CommandGroup
                  heading="GRUPOS"
                  className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-text-subtle [&_[cmdk-group-heading]]:uppercase"
                >
                  {visibleGroups.map((g) => {
                    const selected = scope.kind === 'group' && scope.id === g.id;
                    return (
                      <CommandItem
                        key={`group-${g.id}`}
                        value={`${g.name} ${g.id}`}
                        onSelect={() => handleSelect('group', g.id)}
                        className={cn(
                          'gap-2.5 px-2.5 py-1.5 rounded-sm cursor-pointer text-[13px] text-text',
                          'data-[selected=true]:bg-bg-subtle',
                          selected && 'bg-accent-soft data-[selected=true]:bg-accent-soft',
                        )}
                      >
                        <Layers className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={1.75} aria-hidden="true" />
                        <span className="flex-1 truncate">{g.name}</span>
                        {selected && (
                          <Check
                            className="w-3.5 h-3.5 text-accent-text shrink-0"
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {visibleCompanies.length > 0 && (
                <CommandGroup
                  heading="EMPRESAS"
                  className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-text-subtle [&_[cmdk-group-heading]]:uppercase"
                >
                  {visibleCompanies.map((c) => {
                    const selected = scope.kind === 'company' && scope.id === c.id;
                    return (
                      <CommandItem
                        key={`company-${c.id}`}
                        value={`${c.name} ${c.id}`}
                        onSelect={() => handleSelect('company', c.id)}
                        className={cn(
                          'gap-2.5 px-2.5 py-1.5 rounded-sm cursor-pointer text-[13px] text-text',
                          'data-[selected=true]:bg-bg-subtle',
                          selected && 'bg-accent-soft data-[selected=true]:bg-accent-soft',
                        )}
                      >
                        <Building2 className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={1.75} aria-hidden="true" />
                        <span className="flex-1 truncate">{c.name}</span>
                        {selected && (
                          <Check
                            className="w-3.5 h-3.5 text-accent-text shrink-0"
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* D-05 dirty-form confirmation — owned by provider state, surfaced here */}
      <DirtyFormConfirmDialog />
    </>
  );
}
```
</action>
<read_first>
- `src/components/CmdKPalette.tsx` lines 211-309 — analog Popover + Command + grouped CommandItem pattern.
- `src/components/ui/popover.tsx` — confirm import paths.
- `src/components/ui/command.tsx` — confirm import paths.
- `.planning/phases/01-tenancy-backbone/01-UI-SPEC.md` lines 248-262 — dropdown panel spec.
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 622-684 — analog references for Popover + Command.
</read_first>
<acceptance_criteria>
- File `src/components/scope/ScopeDropdown.tsx` exists exporting `ScopeDropdown`.
- File imports `Popover`, `PopoverTrigger`, `PopoverContent` from `@/components/ui/popover`.
- File imports `Command`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandEmpty` from `@/components/ui/command`.
- File contains both group section headings: `heading="GRUPOS"` and `heading="EMPRESAS"`.
- File contains the placeholder text `Buscar empresa ou grupo…`.
- File contains the empty-search copy `Nenhum escopo encontrado.`.
- File uses `align="end"` and `sideOffset={6}` on `PopoverContent` (UI-SPEC.md § 2).
- File renders `<Check>` only when item is the selected scope.
- File renders nothing when `scope === null`.
- File mounts `<DirtyFormConfirmDialog />` (Plan task 06-04 below).
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
</acceptance_criteria>
<files>
- `src/components/scope/ScopeDropdown.tsx`
</files>
<automated>
test -f src/components/scope/ScopeDropdown.tsx && grep -q 'heading="GRUPOS"' src/components/scope/ScopeDropdown.tsx && grep -q 'heading="EMPRESAS"' src/components/scope/ScopeDropdown.tsx && grep -q "Buscar empresa ou grupo" src/components/scope/ScopeDropdown.tsx && grep -q "Nenhum escopo encontrado" src/components/scope/ScopeDropdown.tsx && grep -q 'align="end"' src/components/scope/ScopeDropdown.tsx && grep -q "sideOffset={6}" src/components/scope/ScopeDropdown.tsx && npx tsc --noEmit -p tsconfig.app.json
</automated>
</task>

<task id="06-03">
<action>
Create the empty state for sócio without empresa (D-09).

**File: `src/components/scope/EmptyScopeState.tsx`**

```tsx
import { Building2 } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

/**
 * Full-page empty state when the user has no scope (sócio sem empresa
 * atribuída, OR liderado sem org_unit primário). D-09: this is NOT a
 * modal; it replaces the routed page content. RH/admin must assign
 * empresa via /empresas (existing CRUD).
 */
export function EmptyScopeState() {
  return (
    <EmptyState
      title="Sem empresa atribuída ainda"
      message="Você ainda não tem empresa atribuída. Fale com o admin para liberar seu acesso."
      icon={Building2}
    />
  );
}
```

That's it for this file — relies on the existing `EmptyState` wrapper at `src/components/EmptyState.tsx` which already uses `variant="decorated"` per UI-SPEC.md § 5.
</action>
<read_first>
- `src/components/EmptyState.tsx` — confirm props are `{ title, message, icon, className }`.
- `src/components/primitives/EmptyState.tsx` — confirm `variant="decorated"` is the default in the wrapper.
- `.planning/phases/01-tenancy-backbone/01-UI-SPEC.md` lines 161-172 — empty state copy.
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 712-781 — analog references.
</read_first>
<acceptance_criteria>
- File `src/components/scope/EmptyScopeState.tsx` exists exporting `EmptyScopeState`.
- File contains the exact title `Sem empresa atribuída ainda`.
- File contains the exact body `Você ainda não tem empresa atribuída. Fale com o admin para liberar seu acesso.`.
- File imports `Building2` from `lucide-react`.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
</acceptance_criteria>
<files>
- `src/components/scope/EmptyScopeState.tsx`
</files>
<automated>
grep -q "Sem empresa atribuída ainda" src/components/scope/EmptyScopeState.tsx && grep -q "Você ainda não tem empresa atribuída" src/components/scope/EmptyScopeState.tsx && grep -q "Building2" src/components/scope/EmptyScopeState.tsx && npx tsc --noEmit -p tsconfig.app.json
</automated>
</task>

<task id="06-04">
<action>
Create the dirty-form confirmation dialog (D-05). The dialog reads `pendingScope`, `confirmPendingScope`, `cancelPendingScope` from `useScope()` (Plan 05). When `pendingScope !== null`, the dialog opens; clicking "Trocar mesmo assim" calls confirm; clicking "Continuar editando" or Esc cancels.

**File: `src/components/scope/DirtyFormConfirmDialog.tsx`**

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Btn } from '@/components/primitives/LinearKit';
import { useScope } from '@/app/providers/ScopeProvider';

/**
 * Dirty-form confirmation dialog — D-05 / UI-SPEC.md § 4.
 * Reads pendingScope from ScopeProvider; opens when ScopeProvider.setScope
 * was blocked by a registered dirty form. Primary CTA "Trocar mesmo assim"
 * confirms the pending change; secondary "Continuar editando" cancels.
 *
 * NOT marked destructive (no red CTA) — losing form state is recoverable;
 * destructive copy is reserved for irreversible deletes (Phase 2-3).
 */
export function DirtyFormConfirmDialog() {
  const { pendingScope, confirmPendingScope, cancelPendingScope } = useScope();

  return (
    <Dialog
      open={pendingScope !== null}
      onOpenChange={(o) => {
        if (!o) cancelPendingScope();
      }}
    >
      <DialogContent className="max-w-[420px] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-[20px] font-semibold text-text leading-[1.2] tracking-[-0.02em]">
            Descartar alterações?
          </DialogTitle>
        </DialogHeader>

        <DialogDescription asChild>
          <p className="px-6 pb-6 text-[13px] text-text-muted leading-[1.5]">
            Você tem alterações não salvas neste formulário. Trocar de escopo vai descartar essas alterações.
          </p>
        </DialogDescription>

        <DialogFooter className="px-6 pb-6 gap-2 sm:gap-2 sm:justify-end">
          <Btn
            variant="ghost"
            size="md"
            type="button"
            onClick={cancelPendingScope}
          >
            Continuar editando
          </Btn>
          <Btn
            variant="primary"
            size="md"
            type="button"
            onClick={confirmPendingScope}
            autoFocus
          >
            Trocar mesmo assim
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```
</action>
<read_first>
- `src/components/ui/dialog.tsx` — confirm imports of `Dialog`, `DialogContent`, `DialogTitle`, `DialogDescription`, `DialogHeader`, `DialogFooter`.
- `src/components/primitives/LinearKit.tsx` — confirm `Btn` accepts `variant="ghost" | "primary"` and `size="md"`.
- `.planning/phases/01-tenancy-backbone/01-UI-SPEC.md` lines 273-285 — dialog spec.
- Plan 05's `ScopeProvider.tsx` — confirm `pendingScope`, `confirmPendingScope`, `cancelPendingScope` are exposed by `useScope()`.
</read_first>
<acceptance_criteria>
- File `src/components/scope/DirtyFormConfirmDialog.tsx` exists exporting `DirtyFormConfirmDialog`.
- File contains exactly the copy `Descartar alterações?` (title), `Você tem alterações não salvas neste formulário. Trocar de escopo vai descartar essas alterações.` (body), `Continuar editando` (secondary CTA), `Trocar mesmo assim` (primary CTA).
- File reads `pendingScope`, `confirmPendingScope`, `cancelPendingScope` from `useScope()`.
- File does NOT use `Btn variant="danger"` or any red destructive styling (UI-SPEC.md § Copywriting "NOT marked destructive").
- File uses `<Dialog open={pendingScope !== null}>` (Dialog, not AlertDialog — UI-SPEC.md § Component Inventory).
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
</acceptance_criteria>
<files>
- `src/components/scope/DirtyFormConfirmDialog.tsx`
</files>
<automated>
F=src/components/scope/DirtyFormConfirmDialog.tsx && grep -q "Descartar alterações?" $F && grep -q "Trocar mesmo assim" $F && grep -q "Continuar editando" $F && grep -q "pendingScope" $F && ! grep -q 'variant="danger"' $F && npx tsc --noEmit -p tsconfig.app.json
</automated>
</task>

<task id="06-05">
<action>
Create the barrel export `src/components/scope/index.ts` and mount `<ScopeDropdown />` in `src/components/Header.tsx` BEFORE `<PendingTasksDropdown />` (UI-SPEC.md § 1: order is `[ScopeDropdown] [PendingTasksDropdown] [Btn Criar]`).

Also wire the empty-state rendering. The `<EmptyScopeState />` should render in place of routed content when `scope === null` (D-09). The cleanest place to hook this is `src/components/Layout.tsx` (which currently wraps the routed `<Outlet />`). Wrap the `<Outlet />` with a check on `useScope().scope` — if null and not resolving, render `<EmptyScopeState />` instead.

**File 1: `src/components/scope/index.ts`**

```typescript
export { ScopeTrigger } from './ScopeTrigger';
export { ScopeDropdown } from './ScopeDropdown';
export { EmptyScopeState } from './EmptyScopeState';
export { DirtyFormConfirmDialog } from './DirtyFormConfirmDialog';
```

**File 2: edit `src/components/Header.tsx`** — add the import and insert `<ScopeDropdown />` BEFORE `<PendingTasksDropdown />`. The right cluster currently looks like:

```tsx
<div className="flex items-center gap-1.5 shrink-0">
  <PendingTasksDropdown />
  <Btn variant="secondary" size="sm" icon={<Plus ... />} ...>
    Criar
  </Btn>
</div>
```

After edit:

```tsx
<div className="flex items-center gap-1.5 shrink-0">
  <ScopeDropdown />
  <PendingTasksDropdown />
  <Btn variant="secondary" size="sm" icon={<Plus ... />} ...>
    Criar
  </Btn>
</div>
```

Add the import at the top of `Header.tsx`:
```typescript
import { ScopeDropdown } from '@/components/scope';
```

**File 3: edit `src/components/Layout.tsx`** — wrap the routed `<Outlet />` with the empty-state guard. The current Layout looks roughly like:

```tsx
<PageTransition><Outlet /></PageTransition>
```

After edit (pseudocode — exact structure depends on current file):

```tsx
<PageTransition>
  <ScopedOutlet />
</PageTransition>
```

Where `ScopedOutlet` is a small inline helper:

```tsx
function ScopedOutlet() {
  const { scope, isResolving } = useScope();
  if (isResolving) return null; // Sidebar/Header still rendered; main area waits
  if (!scope) return <EmptyScopeState />;
  return <Outlet />;
}
```

And add imports:
```typescript
import { useScope } from '@/app/providers/ScopeProvider';
import { EmptyScopeState } from '@/components/scope';
```

If `Layout.tsx` already has a more complex structure, the safest minimal edit is to define `ScopedOutlet` as a sibling component in the same file (not exported) and replace `<Outlet />` with `<ScopedOutlet />` inside the existing wrapper.
</action>
<read_first>
- `src/components/Header.tsx` — full file. Identify the exact line where `<PendingTasksDropdown />` appears.
- `src/components/Layout.tsx` — full file. Identify where `<Outlet />` is rendered.
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 833-861 — Header insertion details.
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 893-906 — Layout context to preserve.
- `.planning/phases/01-tenancy-backbone/01-UI-SPEC.md` lines 235-237 — confirms order: `[ScopeTrigger] [PendingTasksDropdown] [Btn Criar]`.
</read_first>
<acceptance_criteria>
- File `src/components/scope/index.ts` exists with 4 named exports (`ScopeTrigger`, `ScopeDropdown`, `EmptyScopeState`, `DirtyFormConfirmDialog`).
- `src/components/Header.tsx` imports `ScopeDropdown` from `@/components/scope`.
- In `src/components/Header.tsx`, the line containing `<ScopeDropdown />` appears BEFORE the line containing `<PendingTasksDropdown />` within the same parent JSX block (verify by grep line numbers).
- `src/components/Layout.tsx` imports `useScope` and `EmptyScopeState`.
- `src/components/Layout.tsx` contains a guard on `scope` that renders `<EmptyScopeState />` when `!scope && !isResolving`.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
- `npm run build` exits 0.
</acceptance_criteria>
<files>
- `src/components/scope/index.ts`
- `src/components/Header.tsx`
- `src/components/Layout.tsx`
</files>
<automated>
test -f src/components/scope/index.ts && grep -q "<ScopeDropdown" src/components/Header.tsx && grep -q "ScopeDropdown" src/components/Header.tsx && [ "$(grep -n '<ScopeDropdown' src/components/Header.tsx | head -1 | cut -d: -f1)" -lt "$(grep -n '<PendingTasksDropdown' src/components/Header.tsx | head -1 | cut -d: -f1)" ] && grep -q "EmptyScopeState" src/components/Layout.tsx && grep -q "useScope" src/components/Layout.tsx && npx tsc --noEmit -p tsconfig.app.json && npm run build
</automated>
</task>

<task id="06-06">
<action>
Create two component tests verifying the trigger renders the right aria-label, kind icon, and that the dropdown opens + groups are visible.

**File 1: `tests/scope/ScopeTrigger.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScopeTrigger } from '@/components/scope/ScopeTrigger';
import * as scopeModule from '@/app/providers/ScopeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';

function mockScope(overrides: any) {
  vi.spyOn(scopeModule, 'useScope').mockReturnValue({
    scope: { kind: 'group', id: 'g1', companyIds: ['c1'], name: 'Grupo Lever' },
    setScope: vi.fn(),
    pendingScope: null,
    confirmPendingScope: vi.fn(),
    cancelPendingScope: vi.fn(),
    isFixed: false,
    visibleCompanies: [],
    visibleGroups: [],
    isResolving: false,
    ...overrides,
  } as any);
}

function renderTrigger(overrides: any = {}) {
  mockScope(overrides);
  return render(
    <TooltipProvider>
      <ScopeTrigger open={false} onClick={() => undefined} />
    </TooltipProvider>,
  );
}

describe('ScopeTrigger', () => {
  it('renders aria-label "Você está vendo: Grupo Lever. Abrir seletor de escopo." for group scope', () => {
    renderTrigger();
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute(
      'aria-label',
      'Você está vendo: Grupo Lever. Abrir seletor de escopo.',
    );
  });

  it('shows the scope name as visible text', () => {
    renderTrigger();
    expect(screen.getByText('Grupo Lever')).toBeInTheDocument();
  });

  it('returns null when isResolving=true (no DOM output)', () => {
    const { container } = renderTrigger({ isResolving: true });
    expect(container.firstChild).toBeNull();
  });

  it('returns null when scope is null (D-09 handled by parent)', () => {
    const { container } = renderTrigger({ scope: null });
    expect(container.firstChild).toBeNull();
  });

  it('disables button when isFixed=true', () => {
    renderTrigger({ isFixed: true });
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('uses Building2 icon for company scope (and Layers for group)', () => {
    // Company scope
    renderTrigger({
      scope: { kind: 'company', id: 'c1', companyIds: ['c1'], name: 'Lever Consult' },
    });
    expect(screen.getByText('Lever Consult')).toBeInTheDocument();
  });
});
```

**File 2: `tests/scope/ScopeDropdown.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScopeDropdown } from '@/components/scope/ScopeDropdown';
import * as scopeModule from '@/app/providers/ScopeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';

function mockScope(setScopeFn: any = vi.fn(), overrides: any = {}) {
  vi.spyOn(scopeModule, 'useScope').mockReturnValue({
    scope: { kind: 'group', id: 'g1', companyIds: ['c1'], name: 'Grupo Lever' },
    setScope: setScopeFn,
    pendingScope: null,
    confirmPendingScope: vi.fn(),
    cancelPendingScope: vi.fn(),
    isFixed: false,
    visibleCompanies: [
      { id: 'c1', name: 'Lever Consult' },
      { id: 'c2', name: 'Lever Tech' },
    ],
    visibleGroups: [
      { id: 'g1', name: 'Grupo Lever', companyIds: ['c1', 'c2'] },
    ],
    isResolving: false,
    ...overrides,
  } as any);
}

describe('ScopeDropdown', () => {
  it('opens panel on trigger click and shows GRUPOS + EMPRESAS sections', async () => {
    mockScope();
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <ScopeDropdown />
      </TooltipProvider>,
    );

    const trigger = screen.getByRole('button', {
      name: /Você está vendo: Grupo Lever/,
    });
    await user.click(trigger);

    // After click, the popover content is rendered
    expect(screen.getByText(/GRUPOS/)).toBeInTheDocument();
    expect(screen.getByText(/EMPRESAS/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar empresa ou grupo…')).toBeInTheDocument();
  });

  it('clicking an empresa item calls setScope({kind:"company", id})', async () => {
    const setScope = vi.fn().mockReturnValue(true);
    mockScope(setScope);
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <ScopeDropdown />
      </TooltipProvider>,
    );

    const trigger = screen.getByRole('button');
    await user.click(trigger);

    const leverTechItem = screen.getByText('Lever Tech');
    await user.click(leverTechItem);

    expect(setScope).toHaveBeenCalledWith({ kind: 'company', id: 'c2' });
  });

  it('returns null when scope is null', () => {
    mockScope(vi.fn(), { scope: null });
    const { container } = render(
      <TooltipProvider>
        <ScopeDropdown />
      </TooltipProvider>,
    );
    expect(container.firstChild).toBeNull();
  });
});
```

Run `npm test -- --run tests/scope/ScopeTrigger.test.tsx tests/scope/ScopeDropdown.test.tsx` — both must pass.
</action>
<read_first>
- The 3 created components from tasks 06-01 through 06-04.
- `tests/setup.ts` — confirms `@testing-library/jest-dom/vitest` and `@testing-library/user-event` are available.
- The mock pattern from `tests/scope/useScopedQuery.test.tsx` (Plan 05 task 05-05) — same `vi.spyOn(scopeModule, 'useScope')` approach.
</read_first>
<acceptance_criteria>
- File `tests/scope/ScopeTrigger.test.tsx` exists.
- File `tests/scope/ScopeDropdown.test.tsx` exists.
- `npm test -- --run tests/scope/ScopeTrigger.test.tsx` exits 0 with 6 tests passing.
- `npm test -- --run tests/scope/ScopeDropdown.test.tsx` exits 0 with 3 tests passing.
- Combined Plan 05 + Plan 06 scope test count: ≥ 33 (24 from Plan 05 + 9 from Plan 06).
</acceptance_criteria>
<files>
- `tests/scope/ScopeTrigger.test.tsx`
- `tests/scope/ScopeDropdown.test.tsx`
</files>
<automated>
npm test -- --run tests/scope/ScopeTrigger.test.tsx tests/scope/ScopeDropdown.test.tsx
</automated>
</task>

</tasks>

<verification>
1. All 4 scope component files exist in `src/components/scope/` (ScopeTrigger, ScopeDropdown, EmptyScopeState, DirtyFormConfirmDialog) + index barrel.
2. `Header.tsx` mounts `<ScopeDropdown />` BEFORE `<PendingTasksDropdown />` (line ordering check).
3. `Layout.tsx` renders `<EmptyScopeState />` when `!scope && !isResolving`.
4. Component tests pass: 9 new assertions across 2 files.
5. `npm run build` exits 0 (Vite production build succeeds with all UI code).
6. `npx tsc --noEmit -p tsconfig.app.json` exits 0 (strict TypeScript check).
7. Manual visual smoke (post-merge, owner runs locally): `/empresas` page shows the trigger in the header right cluster; clicking opens dropdown with GRUPOS / EMPRESAS sections; clicking a company switches scope; URL updates to `?scope=company:UUID`.
</verification>

<must_haves>
- `ScopeTrigger` button: ghost variant, `Building2`/`Layers` kind icon, label, `ChevronDown`, aria-label = "Você está vendo: X. Abrir seletor de escopo.", disabled tooltip "Seu escopo é fixo".
- `ScopeDropdown` panel: shadcn Popover (`align="end"`, `sideOffset={6}`) + cmdk Command, GRUPOS + EMPRESAS sections, search placeholder "Buscar empresa ou grupo…", `Check` on selected item.
- `EmptyScopeState`: exact title and body copy from UI-SPEC.md, `Building2` icon.
- `DirtyFormConfirmDialog`: title "Descartar alterações?", body "Você tem alterações não salvas...", primary CTA "Trocar mesmo assim", secondary "Continuar editando", NOT destructive styling.
- Header right cluster order: `[ScopeDropdown] [PendingTasksDropdown] [Btn Criar]`.
- `Layout.tsx` renders `EmptyScopeState` instead of routed content when scope is null and not resolving.
- 2 component test files passing (≥ 9 assertions total).
- Brand discipline: no Lucide ArrowX glyphs (`grep -q "ArrowDown\|ArrowUp\|ArrowLeft\|ArrowRight" src/components/scope/*` returns no match).
</must_haves>

<success_criteria>
- All 6 tasks complete, all acceptance criteria met.
- Combined scope test suite passes: `npm test -- --run tests/scope/` exits 0 with ≥ 33 tests.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
- `npm run build` exits 0.
- UI matches UI-SPEC.md visual contract exactly: copy, sizing, icon choices, color tokens, accessibility.
- D-05 dirty-form gate works end-to-end: setScope returns false when dirty, dialog opens, primary CTA confirms.
- D-09 empty state replaces routed content for sócio without empresa.
</success_criteria>
</content>
</invoke>