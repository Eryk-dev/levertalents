---
phase: 1
slug: tenancy-backbone
status: approved
shadcn_initialized: true
preset: custom (Linear-inspired light-only, slate base, CSS variables, 0.375rem radius)
created: 2026-04-27
reviewed_at: 2026-04-27
checker_verdict: APPROVED (4 PASS + 2 FLAG addressed)
---

# Phase 1 — UI Design Contract: Tenancy Backbone

> Visual and interaction contract for the global scope selector (header trigger + dropdown panel + dirty-form confirmation + empty state + URL fallback toast + mobile mirror + skeleton). Locked decisions D-01..D-11 in CONTEXT.md drive *behavior*; this file locks *tokens, typography roles, color usage, copywriting, components, registry safety*.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized; `components.json` present, `style: default`, `tailwind.baseColor: slate`, `cssVariables: true`) |
| Preset | none (project uses a custom Linear-inspired design system on top of shadcn — tokens defined in `src/index.css`) |
| Component library | Radix UI (via shadcn/ui) + Linear-inspired primitives in `src/components/primitives/LinearKit.tsx` (`Btn`, `Chip`, `Kbd`, `Card`, `LinearAvatar`) |
| Icon library | `lucide-react` (already installed) — strokeWidth 1.75 default for header/dropdown chrome, 2 for filled actions |
| Font | Inter (sans/display) + JetBrains Mono (mono). NO serif display. Body letter-spacing -0.005em, headings -0.02em |
| Brand primitive | `LeverArrow` (SVG). NEVER use Lucide ArrowX or font-display custom as logo/symbol stand-in. Header trigger does NOT show LeverArrow — uses `Building2` (single company) or `Layers` (group) lucide glyph |
| Locale | pt-BR. Never English copy in user-facing surfaces. `date-fns-tz` formats `timestamptz` in `America/Sao_Paulo` |

**Source of decision:** shadcn detected via `components.json`. Tokens, typography, color split, primitives all already declared in `src/index.css` + `tailwind.config.ts` + `LinearKit.tsx` — Phase 1 reuses; nothing new to design.

---

## Spacing Scale

The project uses Tailwind defaults (4px multiples). Phase 1 uses these tokens exclusively. No exceptions.

| Token | Value | Tailwind class | Phase 1 usage |
|-------|-------|----------------|---------------|
| xs | 4px | `gap-1`, `p-1`, `space-1` | Icon-to-label gap inside trigger and dropdown items; chevron-to-label gap |
| sm | 8px | `gap-2`, `p-2`, `space-2` | Trigger inner padding (`px-2 py-1`); dropdown item inner padding (`px-2 py-1.5`); item-to-item vertical gap (`space-y-[1px]` for tight Linear feel — exception below) |
| md | 16px | `gap-4`, `p-4`, `space-4` | Dropdown internal section breaks (between "GRUPOS" and "EMPRESAS"), confirmation dialog header padding |
| lg | 24px | `gap-6`, `p-6`, `space-6` | Empty-state padding (`px-6 py-10`), confirmation dialog body padding |
| xl | 32px | `gap-8`, `p-8` | Reserved (not used in Phase 1 surfaces) |
| 2xl | 48px | `gap-12`, `p-12` | Reserved (not used in Phase 1 surfaces) |

**Exceptions (intentional, Linear precedent):**
- `space-y-[1px]` between dropdown items — Linear/Notion convention for dense list rows. Already established in `Sidebar.tsx`/`MobileNav.tsx`.
- Header height fixed at `h-[42px]` (already locked in `Header.tsx`); trigger inherits and uses `h-[28px]` to match `PendingTasksDropdown` and the existing `Buscar…` field in `MobileNav.tsx` (visual peer).
- Disabled tooltip uses 8px arrow offset (Radix default) — no custom override.

**Inherited grid debt (NOT introduced by Phase 1, do not propagate):**
- `h-[42px]` (header) and `h-[28px]` (trigger) are not multiples of 4. They are inherited from `Header.tsx`/`PendingTasksDropdown` and reused for visual peerage. Phase 1 does NOT create new arbitrary heights. **Tech debt:** when Phase 4 (polish) touches the header, normalize to `h-[40px]` or `h-[44px]` and propagate to all trigger-style controls. Phase 1 executor MUST use the inherited values to stay consistent with current chrome — DO NOT add other off-grid heights to new surfaces.

**Touch targets:** Trigger button hit area extends to `min-h-[28px]` on desktop, `min-h-[32px]` on mobile (header h-[42px] minus padding gives 32px for finger tap). Item rows in dropdown: `min-h-[28px]`.

---

## Typography

The project's locked typography is body 13px / Inter / weight 400. Headings use Inter with weight 600 and tighter letter-spacing. Phase 1 declares the four roles used in this phase's UI surfaces.

| Role | Size | Weight | Line Height | Letter spacing | Phase 1 usage |
|------|------|--------|-------------|----------------|---------------|
| Body | 13px | 400 | 1.5 | -0.005em | Default for dropdown items, toast body, empty-state message, confirmation dialog body |
| Label / Trigger | 12.5px | 500 (medium) | 1.4 | -0.005em | Trigger button label (escopo atual), section headings inside dropdown (`GRUPOS`, `EMPRESAS`), dirty-form dialog action labels |
| Eyebrow (uppercase) | 10.5px | 600 | 1 | 0.06em | Group section labels inside dropdown (`GRUPOS`, `EMPRESAS`) — applied via existing `text-eyebrow` utility from `index.css` |
| Heading (display-md) | 20px | 600 | 1.2 | -0.02em | Dirty-form confirmation dialog title; empty-state title for sócio-sem-empresa |

**Constraint:** Exactly 4 sizes; **3 weights** (400 / 500 / 600). Justification for 3rd weight (500): the "Label / Trigger" role sits between body (400) and headings (600) and is the body+1 step canonical in Linear/Vercel/Height systems. Tailwind's `font-medium` utility (500) is reused — no custom weight token. All three weights confirmed against `tailwind.config.ts`. **Exception formalized here, not in a separate exception list, because all three weights are first-class roles.**

**Numerics:** `tabular` class (`font-variant-numeric: tabular-nums`) — not used in Phase 1 (no counts/numbers in trigger or dropdown).

**Mono:** Not used in Phase 1.

---

## Color

The project's locked 60/30/10 split is already declared in `src/index.css`. Phase 1 reuses tokens — declares which token serves which role in this phase's surfaces.

| Role | Value | CSS variable / Tailwind class | Usage in Phase 1 |
|------|-------|-------------------------------|------------------|
| Dominant (60%) | `#FCFCFD` (220 14% 99%) | `--bg` / `bg-bg` | Page background; header background (`bg-bg/95 backdrop-blur` keeps existing translucency) |
| Surface | `#FFFFFF` (0 0% 100%) | `--surface` / `bg-surface` | Dropdown panel surface (popover content); confirmation dialog surface |
| Secondary (30%) | `#F7F8F9` (220 12% 97%) | `--bg-subtle` / `bg-bg-subtle` | Trigger hover/active state; dropdown item hover; item selected (current scope) backdrop |
| Tertiary (still in 30%) | `#F2F3F5` (220 10% 95%) | `--bg-muted` / `bg-bg-muted` | Disabled trigger background (when scope is fixed for líder/liderado) |
| Border default | `#E6E8EB` (220 12% 91%) | `--border-default` / `border-border` | Trigger border, dropdown panel border, dialog border |
| Border strong | `#D4D7DC` (220 8% 85%) | `--border-strong` / `border-border-strong` | Trigger border on hover; empty-state dashed outline |
| Accent (10%) | `#5E6AD2` (232 57% 60%) | `--accent` / `bg-accent`, `text-accent-text` (#3F46A8) | Reserved for: focus ring on trigger and dropdown items; check `✓` glyph next to current scope item; primary CTA in confirmation dialog ("Trocar mesmo assim"); search input focus border. **Not used elsewhere in Phase 1.** |
| Accent soft | `#EEEFFB` (232 75% 96%) | `--accent-soft` / `bg-accent-soft` | Background of selected dropdown item (current scope) — not the hover state, the persistent selected state |
| Text | `#0F1114` | `--text` / `text-text` | Primary copy: trigger label, item labels, dialog title |
| Text muted | `#5C6069` | `--text-muted` / `text-text-muted` | Secondary copy: trigger chevron icon, item meta (count of empresas in a group, if shown), empty-state body |
| Text subtle | `#878B93` | `--text-subtle` / `text-text-subtle` | Tertiary copy: section headings inside dropdown ("GRUPOS"/"EMPRESAS"), placeholder in search input, kbd hints |
| Destructive | `#D1344F` (352 63% 51%) | `--status-red` / `text-destructive` | Reserved (not used in Phase 1 — there are no destructive scope-switch actions; "discard unsaved changes" is treated as neutral, not destructive — see Copywriting) |
| Toast neutral | `#0F1114` text on `#FFFFFF` surface with `border-default` | Sonner default | URL fallback toast ("Você não tem acesso àquele escopo — abrindo {escopo padrão}.") |

**Accent reserved-for (explicit list — accent NEVER appears outside these in Phase 1 surfaces):**
1. Focus ring on the trigger button (`focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2` — already provided by `.focus-ring` utility in `index.css`)
2. Focus ring on each dropdown item (Radix default: `data-[highlighted]` background of `bg-accent-soft`, NOT solid accent — keeps the dropdown calm)
3. The `✓` (Check from lucide) glyph beside the currently selected item — `text-accent-text` (the deeper #3F46A8 variant for legibility on `bg-accent-soft`)
4. The persistent selected-item background (`bg-accent-soft`)
5. Primary CTA in dirty-form dialog: `Btn variant="primary"` from `LinearKit` (which uses `bg-text` not `bg-accent` — primary is graphite ink, not indigo. **Accent is NOT the primary button background.** This is the Linear convention already locked in the project.)
6. Search input focus border (`border-focus` token, which is the same indigo)

**Color NOT used:**
- `--turquoise` (brand wordmark color) — reserved for `LeverArrow` symbol contexts only; never appears in scope selector.
- `--navy` (brand wordmark dark) — same. Brand colors stay isolated to wordmark/symbol surfaces (sidebar logo block, login screen).
- Status colors (`--status-green/amber/red/blue/purple`) — none of the Phase 1 surfaces are status indicators. The "disabled trigger" state is muted, NOT amber.
- Gradients — none in Phase 1.

---

## Copywriting Contract

All copy in **Portuguese (Brazil)**. Tone: direto, informal, sem jargão técnico ou inglês desnecessário (canônico em CONTEXT.md `<specifics>`). Persons: tu/você natural, sem voz passiva.

### Trigger label

| State | Copy | Notes |
|-------|------|-------|
| Default (group selected) | `{nome do grupo}` (ex: "Grupo Lever") | No prefix — name only. The badge "Você está vendo:" lives ONLY on the trigger via `aria-label`/`title` (D-03 — single visual element). |
| Default (company selected) | `{nome da empresa}` (ex: "Lever Consult") | Same — name only. |
| `aria-label` (always) | `Você está vendo: {escopo atual}. Abrir seletor de escopo.` | Spelled out for screen readers. Combines RBAC-07 phrase + action. |
| `title` (tooltip on hover, when not disabled) | none (don't repeat the visible label) | — |
| Disabled (fixed scope, líder/liderado) | `{nome do escopo}` (visual same as default; trigger is non-interactive) | — |
| Disabled `title` (tooltip on hover) | `Seu escopo é fixo` | Locked in CONTEXT.md D-06. Single sentence, no period. |
| Empty (sócio sem empresa, before fallback empty state) | Trigger does NOT render. Empty state takes the screen instead (D-09). | — |

### Dropdown panel

| Element | Copy | Notes |
|---------|------|-------|
| Search input placeholder | `Buscar empresa ou grupo…` | Lowercase noun phrase + ellipsis. Matches `Buscar…` pattern in `MobileNav.tsx`. |
| Section heading 1 | `GRUPOS` | Uppercase eyebrow. Section appears at top per D-02. Hidden if user has zero groups (sócio sem grupos). |
| Section heading 2 | `EMPRESAS` | Uppercase eyebrow. Hidden if user has zero companies (defensive — should not occur in production after backfill). |
| Item label | `{nome do escopo}` | Plain name. No prefix, no count badge in v1. |
| Selected indicator | `✓` (lucide `Check`, 14×14, `strokeWidth=2`, `text-accent-text`) | Right-aligned inside item via `ml-auto`. Only on the current scope. |
| Empty search result | `Nenhum escopo encontrado para "{query}".` | Pt-BR. Quotes around query. Period at end. |
| Footer hints (optional, only if dropdown gets keyboard shortcut later) | none in Phase 1 | Not in v1 — `Cmd+K` palette already covers global navigation (D-discretion). |

### Dirty-form confirmation dialog

Triggered ONLY when the active route has at least one `react-hook-form` instance with `formState.isDirty === true` (D-05). Otherwise switch is silent.

| Element | Copy |
|---------|------|
| Dialog title (display-md, weight 600, color text) | `Descartar alterações?` |
| Dialog body (body 13px, color text-muted) | `Você tem alterações não salvas neste formulário. Trocar de escopo vai descartar essas alterações.` |
| Primary CTA (`Btn variant="primary"`, right side) | `Trocar mesmo assim` |
| Secondary CTA (`Btn variant="ghost"`, left of primary) | `Continuar editando` |
| Close (X icon top-right, optional Radix default) | aria-label `Fechar` |
| Esc key | Closes dialog = "Continuar editando" path. |

**Why "Trocar mesmo assim" not "Descartar":** the user's original action was *trocar de escopo*. Confirmation reaffirms the original intent, not the consequence. This matches Linear's pattern ("Move anyway" not "Discard changes"). Confirmed informal but unambiguous in pt-BR.

**This is NOT marked destructive.** No red color, no `Btn variant="danger"`. Lost form state is recoverable (user can rebuild) — destructive copy is reserved for irreversible data loss (delete user, remove candidate, end ciclo). Phase 1 has no destructive actions.

### Empty state — sócio sem empresa atribuída

Replaces the entire main content area when `visible_companies(uid)` returns `[]` AND user has no group memberships (D-09 — NOT a modal, full empty state).

Renders via existing `EmptyState` from `src/components/EmptyState.tsx` with `variant="decorated"` (dashed surface).

| Element | Copy |
|---------|------|
| Title (14px font-medium per `EmptyState` primitive) | `Sem empresa atribuída ainda` |
| Body (12.5px text-muted, max-w 360px) | `Você ainda não tem empresa atribuída. Fale com o admin para liberar seu acesso.` |
| Icon | `Building2` from lucide (the same glyph used as the "company" semantic in this phase) |
| Action | none (no CTA — user has no path forward inside the app; admin/RH must act elsewhere) |

The trigger is HIDDEN in this state (not rendered) — there's nothing to switch.

### Toast — URL with inaccessible scope (D-08)

Triggered when the URL contains `?scope=company:UUID` or `?scope=group:UUID` that the user cannot access (e.g. shared link from a peer; sócio whose membership was removed). Silent fallback to default scope + `react-router-dom` URL replace + toast.

Sonner toast, neutral variant (no red), default 4s duration.

| Element | Copy |
|---------|------|
| Toast body | `Você não tem acesso àquele escopo. Abrindo {nome do escopo padrão}.` |

**Important:**
- The scope name is the resolved name (e.g. "Grupo Lever" or "Lever Consult"), NOT the UUID. PII discipline (QUAL/AUTH-04..05): no UUIDs in user-facing copy, no email addresses, no internal IDs.
- One sentence, period in middle (the period after "escopo" matters — avoids run-on).
- No icon — Sonner default.

### Skeleton state copy

When the user switches to a scope without cached data (D-04 — switch is instant, but data hasn't arrived yet), each query-bound region shows a skeleton placeholder. No text copy — visual placeholder using existing `Skeleton` from `@/components/ui/skeleton.tsx`.

The trigger does NOT enter a loading state during scope switch (the trigger label flips instantly per D-04). Only data regions show skeletons.

### Error state (RLS denied during scope-aware query) — optional in Phase 1

If a downstream query inside the new scope returns `42501` (RLS), the existing `formatSupabaseError()` from `src/lib/supabaseError.ts` translates to `"[RLS] Sem permissão para acessar este recurso."`. Phase 1 does not introduce new error copy — it relies on the established mapping in `supabaseError.ts`.

| Element | Copy |
|---------|------|
| RLS denial toast (downstream) | `Sem permissão para acessar este recurso.` (existing) |

---

## Component Inventory

Components consumed by Phase 1 from existing primitives. **Nothing new is installed from third-party registries.**

| Component | Source | Phase 1 role |
|-----------|--------|--------------|
| `Popover`, `PopoverTrigger`, `PopoverContent` | `@/components/ui/popover` (shadcn → Radix) | Shell for the scope dropdown panel. Choose Popover (not DropdownMenu) because we need an embedded `<input>` that retains focus — DropdownMenu's roving focus interferes. Pattern matches `PendingTasksDropdown.tsx` precedent. |
| `Command`, `CommandInput`, `CommandList`, `CommandGroup`, `CommandItem`, `CommandEmpty` | `@/components/ui/command` (shadcn → cmdk) | Search-with-results inside the popover. Reuses the same `cmdk` engine as `CmdKPalette.tsx` for keyboard navigation, fuzzy filter, and "Nada encontrado" handling. |
| `Btn` from LinearKit | `@/components/primitives/LinearKit` | Trigger button. `variant="ghost"`, `size="sm"`, with chevron. Also primary/ghost CTAs in dirty-form dialog. |
| `Tooltip`, `TooltipTrigger`, `TooltipContent` | `@/components/ui/tooltip` (shadcn → Radix) | "Seu escopo é fixo" tooltip on disabled trigger (D-06). Already wrapped in `TooltipProvider` at App root. |
| `Dialog`, `DialogContent`, `DialogTitle`, `DialogDescription` | `@/components/ui/dialog` (shadcn → Radix) | Dirty-form confirmation. AlertDialog (`alert-dialog.tsx`) is also available — choose `Dialog` here because the action is reversible (user can change their mind in either direction); AlertDialog is reserved for truly destructive confirmations. |
| `Skeleton` | `@/components/ui/skeleton` (shadcn) | Per-region loading placeholders during cache-cold scope switch (D-04). Already used elsewhere in the codebase. |
| `Sonner` toast | `@/components/ui/sonner` (already mounted in App) | URL-fallback message (D-08). Use `toast(msg)` neutral variant — no `toast.error`, no `toast.success`. |
| `EmptyState` | `@/components/EmptyState` → `@/components/primitives/EmptyState` | Sócio sem empresa atribuída. Pass `variant="decorated"`, `icon={Building2}`. |
| `Building2`, `Layers`, `Check`, `ChevronDown`, `ChevronRight`, `Search` | `lucide-react` | Header icons. `Building2` for company scope, `Layers` for group scope. `ChevronDown` (not ChevronRight) on the trigger because dropdown opens *down*. |
| `LeverArrow` | `@/components/primitives/LeverArrow` | NOT used in Phase 1 surfaces. Reserved for sidebar/auth screens. (Brand fidelity rule.) |
| `Sheet`, `SheetContent` | `@/components/ui/sheet` | Mobile mirror — see Mobile Mirror section below. The trigger lives in the *header* on mobile too, NOT in the side sheet (D-01). |

**Components NOT used in Phase 1 (explicit exclusion to lock the contract):**
- `DropdownMenu` (focus-trap conflicts with embedded search; we use `Popover + Command` instead)
- `Select` (Radix Select doesn't support typeahead beyond first letter; CASL/scope list needs fuzzy search)
- `Combobox` (no shadcn combobox primitive in this project — `Popover + Command` IS the combobox pattern shadcn ships)
- `AlertDialog` (action is not destructive)
- Lucide ArrowX family (`ArrowDown/ArrowRight/ArrowLeft/ArrowUp`) as logo/symbol — covered by brand rule. ChevronDown/ChevronRight as UI affordances (not logos) ARE allowed.

---

## Layout & Interaction Specs (per element)

### 1. Header trigger button (desktop)

- **Position:** Header right side (`Header.tsx`), placed BEFORE `PendingTasksDropdown` (left of it). The "Criar" `Btn` stays rightmost. Order in the right cluster: `[ScopeTrigger] [PendingTasksDropdown] [Btn Criar]`.
- **Size:** `h-[28px]`, `px-2`, `py-1`. Inner content: `<icon 14×14> {scope name truncated max-w-[180px]} <ChevronDown 12×12>`. Total width auto, max ~240px.
- **Icon:** `Building2` if scope is company, `Layers` if scope is group. `strokeWidth={1.75}`, `text-text-muted`. 4px gap to label.
- **Label:** Inter 12.5px weight 500, `text-text`, single line, truncate with ellipsis if longer than 180px.
- **Chevron:** `ChevronDown` 12×12, `strokeWidth={1.75}`, `text-text-subtle`, 4px gap. When dropdown open, animates 180° (`data-[state=open]:rotate-180 transition-transform`).
- **Border:** `1px solid border-default` (subtle separation from header backdrop). Rounded `rounded-md` (6px).
- **Hover (enabled):** `bg-bg-subtle`, `border-border-strong`, `text-text` for label. Transition `transition-base`.
- **Focus-visible:** `outline-2 outline-accent outline-offset-2` (focus-ring utility).
- **Pressed/open:** `bg-bg-subtle`, `border-border-strong` (matches hover).
- **Disabled (D-06):** `bg-bg-muted`, `border-border-default`, `text-text-muted`, `cursor-not-allowed`. No hover state. Wrapped in `Tooltip` with content `Seu escopo é fixo`. Chevron hidden (no `ChevronDown`) — visual cue that it doesn't open.
- **Truncation rule:** If scope name > 180px wide, truncate with ellipsis. Full name preserved in `aria-label` (which always reads `Você está vendo: {full name}. Abrir seletor de escopo.`). Tooltip on truncated text NOT added (would conflict with disabled tooltip pattern).

### 2. Dropdown panel

- **Trigger:** Popover anchored to the trigger button. `align="end"` (right-aligned with trigger). `sideOffset={6}` (default Popover is 4, push to 6 for visual breathing room from header bottom border).
- **Surface:** `bg-surface` (#FFF), `border border-default`, `rounded-md`, `shadow-popup` (existing token), max-width 320px, max-height `min(60vh, 480px)`.
- **Internal layout (top-to-bottom):**
  1. Search input row: `Command` with `CommandInput`. Padding `px-3 py-2.5`, bottom border `border-b border-default`. Placeholder per copywriting. `Search` icon left of input, 14×14, `text-text-subtle`. Input itself: 13px Inter weight 400, `bg-transparent` (inherits surface), no own border (the row border is enough).
  2. Scrollable result list: `CommandList` with `max-h-[360px] overflow-y-auto scrollbar-linear`. Padding `p-1.5`.
  3. Within the list, two `CommandGroup`s in order (D-02): "GRUPOS" then "EMPRESAS". Group heading uses `text-eyebrow` utility (10.5px uppercase, weight 600, `text-text-subtle`, letter-spacing 0.06em), padding `px-2.5 pt-2 pb-1`.
  4. `CommandItem` per scope: `gap-2.5 px-2.5 py-1.5 rounded-sm`. Icon 14×14 `text-text-muted` (Building2 or Layers). Label 13px Inter weight 400 `text-text`. Right-side check (only on selected): `Check` 14×14 `text-accent-text`, `ml-auto`.
  5. Selected item: persistent `bg-accent-soft` background. Hover (non-selected): `bg-bg-subtle`. Hover on selected: stays `bg-accent-soft` (no second hover layer; selection wins).
- **Empty (no search match):** `CommandEmpty` with copy from copywriting section. `py-5 text-center text-[13px] text-text-subtle`. (Same shape as `CmdKPalette.tsx`.)
- **Keyboard:** Cmdk handles arrows, enter, esc by default. Enter on highlighted item = select & close. Esc = close without changing scope.
- **Click outside:** Closes panel without selection (Radix default).
- **Search behavior:** Fuzzy match using cmdk's built-in scorer (default `shouldFilter=true`). Match against `name` only (no description text in v1).
- **Animation:** Existing Radix Popover open/close animations in `popover.tsx` — `data-[state=open]:animate-in fade-in-0 zoom-in-95` etc. Timing: 120ms (matches `transition-base`).

### 3. Disabled trigger + tooltip

- **Visual:** As described in section 1 (Disabled state).
- **Tooltip wrap:** `<Tooltip><TooltipTrigger asChild>{button}</TooltipTrigger><TooltipContent>Seu escopo é fixo</TooltipContent></Tooltip>`.
- **Tooltip styling:** Default shadcn `tooltip.tsx` — `bg-text text-surface text-[12.5px] px-2 py-1 rounded-sm shadow-md`. 8px arrow offset.
- **Tooltip delay:** Default 700ms (Radix). Don't customize.
- **Click on disabled trigger:** No-op. No toast, no animation. Button has `aria-disabled="true"` and `disabled` attribute.

### 4. Dirty-form confirmation dialog

- **Trigger:** `setScope` is called. Internally checks for `react-hook-form` instances mounted in the current route with `formState.isDirty === true`. If any, blocks the scope change and opens this dialog. (Implementation detail for planner: registry of active form `useFormState()` via a small `useDirtyForms()` hook in `features/tenancy/hooks/`.)
- **Component:** `Dialog` + `DialogContent` (shadcn). Centered modal, max-width 420px.
- **Layout:**
  - Header: `DialogTitle` (display-md = 20px Inter weight 600 text-text), padding `px-6 pt-6 pb-2`. Copy: `Descartar alterações?`
  - Body: `DialogDescription` (13px text-muted line-height 1.5), padding `px-6 pb-6`. Copy: `Você tem alterações não salvas neste formulário. Trocar de escopo vai descartar essas alterações.`
  - Footer: right-aligned button row, padding `px-6 pb-6`, gap 8px.
    - Secondary: `Btn variant="ghost" size="md"` — `Continuar editando`. Default action on Esc/click-outside.
    - Primary: `Btn variant="primary" size="md"` — `Trocar mesmo assim`. Calls `setScope` and closes dialog.
- **Backdrop:** Default Radix Dialog overlay (`bg-black/40`). Closes dialog on click = "Continuar editando".
- **Focus trap:** Radix default. Focus enters Primary CTA on open (Linear convention — give the user a way to commit fast).
- **Animation:** Default Dialog `data-[state=open]:animate-in fade-in-0 zoom-in-95`.

### 5. Empty state — sócio sem empresa atribuída

- **Trigger:** `ScopeProvider` resolves on boot; if `visible_companies(uid)` returns `[]` and user has no group memberships, the provider sets `scope = null` and renders this empty state in place of the routed page.
- **Component:** `EmptyState` (`src/components/EmptyState.tsx`) with `variant="decorated"`. Renders centered in the main content area, NOT inside a modal (D-09).
- **Layout:** `EmptyState` primitive handles structure: dashed border `border-border-strong`, `rounded-md`, padding `px-6 py-10`. Icon `Building2` in 36×36 muted square at top, then title 14px text font-medium, then body 12.5px text-muted max-w-[360px]. No action button.
- **Header:** Trigger is HIDDEN (not rendered). Header retains breadcrumb (which will read `Início` since no route applies) and right-side actions (`PendingTasksDropdown`, `Criar`) — but `Criar` is non-actionable for sócio in this state (no scope to create against). Acceptable; "Criar" is RH/Admin's surface, sócio with no membership has nothing to create.

### 6. Toast — URL fallback (D-08)

- **Trigger:** `ScopeProvider` reads `?scope=` from URL on boot OR on URL change. If parsed scope is not in the user's `visible_companies` ∪ `visible_groups`, the provider:
  1. Falls back to last-persisted scope in Zustand persist; if absent, uses default-per-role (D-10).
  2. Calls `setSearchParams` to overwrite URL with the fallback scope (so refresh doesn't loop the toast).
  3. Fires Sonner `toast()` neutral with copy `Você não tem acesso àquele escopo. Abrindo {nome do escopo padrão}.`
- **Toast styling:** Sonner default neutral. `bg-surface border border-default text-text shadow-popup`. 4s auto-dismiss. No icon. Position bottom-right (existing project default).
- **Throttle:** If multiple inaccessible scopes in rapid succession (unlikely but possible during impersonation testing), debounce to one toast per 1s.

### 7. Mobile mirror

- **Position:** Trigger renders in the header on mobile (NOT inside the `Sheet` side menu). D-01 explicit. Same Header right-cluster as desktop. Touch target raised to `min-h-[32px]` (header height 42px gives margin for finger).
- **Sizing on mobile:** Trigger label may need to truncate harder (`max-w-[120px]` on screens `<sm`). Icon + truncated label + chevron.
- **Dropdown on mobile:** Popover flips to centered/bottom-sheet behavior is NOT used here — Radix Popover positioning is sufficient (right-anchored, slides down). Width `min(calc(100vw - 32px), 320px)`. Search input gets soft keyboard automatically when focused. Test: panel must not overflow viewport on smallest target (375px wide).
- **`MobileNav` Sheet:** Does NOT contain the trigger. It contains nav links and CmdK shortcut. Adding scope switching to the side sheet would split the visual model (D-01 — single position).

### 8. Skeleton (cache-cold scope switch)

- **Where:** Per-region inside data-bound pages. Each `useScopedQuery` consumer that returns `isLoading=true && !cached` shows the page's existing skeleton state. Phase 1 does NOT introduce a new skeleton component — pages already implement them (kanban shows column skeletons, dashboard shows card skeletons, etc.).
- **What changes in Phase 1:** Document that the trigger label flips INSTANTLY (the user sees the new scope name without delay) but pages may render their existing skeletons until queries resolve. This contrasts with a "block UI during scope load" anti-pattern.
- **No spinner on trigger:** During scope switch, trigger does NOT show a loader icon. The interaction is "label flipped → page is updating below" — visual feedback comes from the page region, not from the trigger.
- **No global skeleton bar:** No top-of-page progress bar. Linear/Notion don't have one for workspace switch; we don't either.

---

## Accessibility Contract

| Concern | Spec |
|---------|------|
| Trigger semantics | `<button type="button">` with `aria-haspopup="dialog"` (Radix Popover Trigger handles), `aria-expanded={open}`, `aria-label="Você está vendo: {scope}. Abrir seletor de escopo."` |
| Dropdown semantics | Popover content has `role="dialog"` (Radix). Inside, the cmdk `Command` provides `role="listbox"` semantics with `aria-activedescendant` per highlighted item. |
| Selected state | Selected item has `aria-selected="true"` (cmdk handles when `value` matches). The `✓` is decorative — `aria-hidden="true"` on the icon. |
| Group headings | `CommandGroup`'s `heading` prop renders a `<div role="presentation">` heading; cmdk does this correctly out of the box. Visually they are eyebrow text. |
| Search input | `<input type="text"`, `aria-label="Buscar escopo"`, no native label (would clutter). Placeholder is decorative. |
| Disabled trigger | `disabled` attribute + `aria-disabled="true"`. Tooltip is wrapped via Radix Tooltip (auto-handles `aria-describedby`). |
| Dialog | `DialogTitle` and `DialogDescription` are read on open. Focus moves to Primary CTA. Esc dismisses. |
| Empty state | Heading is `<h3>`. No interactive elements; no focus trap. |
| Toast | Sonner default — `role="status"` for neutral, `aria-live="polite"`. |
| Color contrast | All text/background combinations in this contract pass WCAG AA: `text` (#0F1114) on `surface` (#FFF) = 18.7:1. `text-muted` (#5C6069) on `bg` (#FCFCFD) = 6.5:1. `accent-text` (#3F46A8) on `accent-soft` (#EEEFFB) = 6.8:1. `text-subtle` on bg = 4.6:1 (passes AA for normal text). |
| Keyboard | Tab reaches trigger → Enter/Space opens panel → arrows navigate items → Enter selects → Esc closes. No keyboard trap. |
| Reduced motion | All animations respect `prefers-reduced-motion: reduce` via Tailwind's default behavior on shadcn primitives. |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `popover`, `command`, `dialog`, `tooltip`, `skeleton`, `sonner`, `sheet` (already installed; no NEW shadcn blocks added in Phase 1) | not required (official registry) |
| Project primitives (`@/components/primitives/*`) | `LinearKit` (`Btn`), `EmptyState`, `LeverArrow` (NOT used in this phase but listed for awareness) | not required (in-tree) |
| Third-party registries | none | not applicable |

**Vetting note:** No `npx shadcn add` commands required for Phase 1. All consumed primitives already exist in `src/components/ui/` or `src/components/primitives/`. Phase 1 implementation does NOT install third-party registry blocks. If a future phase needs to add (e.g.) a workspace switcher block from a third-party registry, the `view+vet` gate from the gsd-ui-researcher contract applies then — not now.

**Lockfile:** Single `package-lock.json` (Phase 1 also removes `bun.lockb` per QUAL-05). No registry-related dependency drift.

---

## State Matrix (cross-cut)

For executor reference — every Phase 1 surface mapped to its visible states.

| Surface | States |
|---------|--------|
| Trigger button | `default-enabled` · `hover-enabled` · `focus-enabled` · `pressed-open` · `default-disabled (fixed scope)` · `hidden (sócio sem empresa)` |
| Dropdown panel | `closed` · `open-empty-search` · `open-with-results` · `open-no-match` · `open-keyboard-navigating` |
| Confirmation dialog | `closed` · `open` · `open-primary-focused` · `closed-confirmed` · `closed-canceled` |
| Empty state | `not-rendered (user has scope)` · `rendered (sócio without membership)` |
| Toast | `not-shown` · `shown-fallback (URL inaccessible)` |
| Skeleton | `not-shown (cache hit on switch)` · `shown (cache cold on switch)` |

---

## Out of scope for Phase 1 UI

These are intentionally NOT designed in Phase 1 — defer to later phases:
- Cross-tab scope sync visualization (D-discretion in CONTEXT.md). If implemented, no UI changes (silent localStorage event).
- Hover-prefetch indicator (D-discretion). No UI cue planned.
- Cmd+K integration with `>scope` command (D-discretion). The `CmdKPalette.tsx` already exists — adding a scope switch entry inside it is opportunistic, not part of this contract.
- Dark mode for scope selector. Project is light-only (locked in `index.css` comment).
- Per-scope avatar/icon customization. All groups use `Layers`; all companies use `Building2`. No per-scope branding.
- Last-selected reordering (showing recent scope at top after search). Default ordering (D-discretion suggestion): groups first alphabetically, then empresas alphabetically. Phase 1 implements this static order; "recent" reordering is v2.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS (was FLAG — reformulated as "3 weights" with explicit justification)
- [x] Dimension 5 Spacing: PASS (was FLAG — added "Inherited grid debt" subsection documenting `h-[42px]`/`h-[28px]` as Phase 4 polish target)
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-04-27 (gsd-ui-checker)

---

## Pre-population provenance

| Section | Source |
|---------|--------|
| Design System (shadcn detected, Linear-inspired) | `components.json` + `src/index.css` + `tailwind.config.ts` |
| Spacing tokens | Tailwind defaults already in use (`Header.tsx`, `MobileNav.tsx`) |
| Typography roles | `tailwind.config.ts.fontSize` + `index.css` `body { font-size: 13px }` + `.text-eyebrow` utility |
| Color tokens (60/30/10) | `index.css` (already declared, this phase reuses) |
| Trigger position (header right) | CONTEXT.md D-01 |
| Dropdown layout (grouped + search + check) | CONTEXT.md D-02 |
| Trigger mirrors badge | CONTEXT.md D-03 + RBAC-07 |
| Switch behavior (instant + cache + skeleton) | CONTEXT.md D-04 + STACK.md (TanStack Query partial-key invalidation) |
| Confirmation only on dirty form | CONTEXT.md D-05 |
| Disabled trigger + tooltip | CONTEXT.md D-06 |
| URL precedence | CONTEXT.md D-07 + REQUIREMENTS.md TEN-09 |
| Invalid URL → silent fallback + toast | CONTEXT.md D-08 |
| Sócio sem empresa → empty state | CONTEXT.md D-09 |
| Default per role | CONTEXT.md D-10 |
| Default resolved server-side | CONTEXT.md D-11 + ARCHITECTURE.md |
| Toast copy (no PII) | REQUIREMENTS.md QUAL-* + AUTH-04..05 |
| Locale pt-BR | CONTEXT.md `<specifics>` + CLAUDE.md |
| Brand primitive `LeverArrow` rule | CLAUDE.md + memory `feedback_brand_fidelity.md` |
| Component primitive choices (Popover+Command, not DropdownMenu) | Codebase scan — `PendingTasksDropdown.tsx`, `CmdKPalette.tsx` precedents; cmdk lib already in stack |
| Empty state primitive (`variant="decorated"`) | Codebase scan — `src/components/primitives/EmptyState.tsx` |
| `EmptyState` wrapper (`src/components/EmptyState.tsx`) | Existing, default `variant="decorated"` chosen for sócio fallback |

User input requested in this session: 0 (all design contract decisions pre-populated from upstream artifacts and codebase scan).

---

*UI design contract for Phase 1: Tenancy Backbone*
*Drafted: 2026-04-27 by gsd-ui-researcher*
