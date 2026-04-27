# Coding Conventions

**Analysis Date:** 2026-04-27

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `Header.tsx`, `KanbanCard.tsx`, `EvaluationForm.tsx`)
- Pages: PascalCase (e.g., `Auth.tsx`, `Climate.tsx`, `AdminDashboard.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useAuth.ts`, `useEvaluations.ts`, `useTeams.ts`)
- Utilities: camelCase (e.g., `utils.ts`, `routes.ts`, `supabaseError.ts`)
- UI components: lowercase with hyphen (shadcn/ui convention, e.g., `button.tsx`, `dialog.tsx`, `card.tsx`)
- Primitives: PascalCase exports, even if file is camelCase (e.g., `LinearKit.tsx` exports `Btn`, `Chip`, `Row`, `Col`)

**Functions:**
- Components: PascalCase (e.g., `export function Header({ onToggleSidebar }: HeaderProps)`)
- Utility functions: camelCase (e.g., `formatDeadline()`, `formatSupabaseError()`, `cn()`)
- Event handlers: camelCase with action verb (e.g., `handleSupabaseError()`, `readStoredViewAs()`)
- Custom hooks: camelCase with `use` prefix (e.g., `useAuth()`, `useDevelop mentPlans()`)

**Variables:**
- Local state: camelCase (e.g., `isLogin`, `loading`, `fullName`)
- Constants (module-level): UPPER_SNAKE_CASE (e.g., `VIEW_AS_STORAGE_KEY`, `RLS_CODE`, `VALID_ROLES`)
- Type discriminants: camelCase (e.g., `k: "comunicacao"` in competency objects)

**Types:**
- Interfaces/Types: PascalCase (e.g., `HeaderProps`, `KanbanCardProps`, `Competency`, `BtnProps`)
- Exported types from third parties: as-is (e.g., `User` from @supabase/supabase-js, `AppRole`)
- Type unions: camelCase (e.g., `type BtnVariant = "primary" | "secondary"`)
- Discriminated unions: snake_case keys in data objects (e.g., `category: CompCategory`, `development_area?: string | null`)

## Code Style

**Formatting:**
- No explicit Prettier config detected — relying on ESLint defaults
- Line length: appears to follow ~80-100 character soft limit based on code observation
- Indentation: 2 spaces (inferred from existing code)
- Trailing commas: used in multi-line objects and arrays
- Semicolons: present at end of statements

**Linting:**
- Tool: ESLint with `typescript-eslint`
- Config: `eslint.config.js` (flat config format)
- Key rule: `react-hooks/recommended` enforced
- Key rule: `react-refresh/only-export-components` warning with `allowConstantExport: true`
- Key rule: `@typescript-eslint/no-unused-vars` disabled (permissive)
- Run command: `npm run lint` (lints entire codebase with `eslint .`)

**Language Features:**
- TypeScript 5.8 (from `package.json`)
- Strict mode: **NOT enabled** — `"strict": false` in `tsconfig.app.json`
- `noImplicitAny`: disabled
- `noUnusedLocals` / `noUnusedParameters`: disabled
- `strictNullChecks`: disabled
- JSX: `react-jsx` (automatic runtime)

## Import Organization

**Order (observed pattern):**
1. React and React hooks (`import { useState, useEffect } from "react"`)
2. External library hooks/utilities (`import { useNavigate } from "react-router-dom"`)
3. Supabase client (`import { supabase } from "@/integrations/supabase/client"`)
4. TanStack Query/external data fetching (`import { useQuery } from "@tanstack/react-query"`)
5. Custom hooks from `@/hooks/` (`import { useEvaluations } from "@/hooks/useEvaluations"`)
6. Components from `@/components/` (`import { Button } from "@/components/ui/button"`)
7. Primitives from `@/components/primitives/` (`import { Btn, Chip } from "@/components/primitives/LinearKit"`)
8. Utilities from `@/lib/` (`import { cn } from "@/lib/utils"`)
9. Assets (`import wordmarkDark from "@/assets/lever-wordmark-dark.svg"`)
10. Third-party icons (`import { ChevronRight, Plus } from "lucide-react"`)
11. Zod/validation (`import { z } from "zod"`)

**Path Aliases:**
- `@/*` → `./src/*` (defined in `tsconfig.app.json` and `tsconfig.json`)
- `@/components` → components directory
- `@/hooks` → custom hooks
- `@/lib` → utilities and helpers
- `@/integrations` → third-party service clients
- `@/assets` → static assets (SVG, images)
- `@/pages` → page components

## Error Handling

**Patterns:**
- Supabase errors: Use `formatSupabaseError()` from `@/lib/supabaseError.ts` to convert PostgrestError to user-friendly Portuguese messages
- Error mapping: Hardcoded `FRIENDLY_MESSAGES` object maps PostgreSQL error codes (e.g., `"23505"` duplicate, `"42501"` RLS) to Portuguese strings
- Type guard: `isPostgrestError()` checks for PostgrestError shape before mapping
- Toast notifications: Errors displayed via `sonner` toast (e.g., `toast.error(finalMessage)`)
- Silent failures: `handleSupabaseError()` supports `{ silent: true }` option to suppress toast for programmatic error handling
- Logging: RLS errors logged to `console.warn()`, other errors to `console.error()`
- Null handling: `throwOnError()` enforces that data is not null before returning (fallback message: `"sem retorno"`)

## Logging

**Framework:** `console` methods (no dedicated logging library detected)

**Patterns:**
- Errors and warnings prefixed with context: `[supabase]`, `[RLS]`
- Warn level for RLS policy rejections: `console.warn("[RLS] blocked by policy:", err)`
- Error level for general failures: `console.error("[supabase]", err)`
- Toast library (Sonner) for user-facing messages, not console

## Comments

**When to Comment:**
- Multiline sections with dense logic: JSDoc-style block comments with `/* ─── description ─── */`
- Inline inline explanations for non-obvious branching: `// Fallback em DEV: ...`
- Intent documentation for hooks with complex state management: Block comments explaining lifecycle
- No excessive comments on obvious code

**JSDoc/TSDoc:**
- Used on function signatures and interfaces (e.g., `/** Toggle the desktop sidebar visibility. ... */` in `HeaderProps`)
- Format: Standard JSDoc with `/**` opening, `@param` tags for props, `@returns` for return type (observed in Header component)
- Not applied uniformly across all functions — used selectively for public APIs

## Function Design

**Size:** Functions kept compact; large components (e.g., `EvaluationForm.tsx` at ~250+ lines) broken into logical sections with comment dividers

**Parameters:**
- Props passed as single object with TypeScript interface: `function Header({ onToggleSidebar }: HeaderProps)`
- Destructuring in parameter list to avoid `props.x` chaining
- Optional props marked with `?` in interface

**Return Values:**
- Components return JSX.Element or functional fragments
- Hooks return objects with named properties for clarity: `{ user, loading, realRole, userRole, viewAsRole, setViewAsRole, isViewingAs }`
- Utility functions return typed values (e.g., `throwOnError<T>()` returns generic T or throws)

## Module Design

**Exports:**
- Named exports preferred for components and utilities (`export function Header()`, `export const Btn = forwardRef<...>()`)
- Default exports used for pages (`export default function Auth()`)
- Re-export barrels: `@/components/primitives/index.ts` re-exports public primitives
- forwardRef for component libraries: UI components use `React.forwardRef<HTMLButtonElement, ButtonProps>()`

**Barrel Files:**
- Present in `/src/components/primitives/index.ts` — groups and re-exports UI primitives
- Reduces import depth in consuming code

## TypeScript Patterns

**React Components:**
- Functional components only (no class components)
- Props interface defined above component function
- Use `interface ComponentProps extends BaseProps` for composition
- Optional HTML attributes: `Omit<ButtonHTMLAttributes<...>, "size">` to exclude conflicting props

**Custom Hooks:**
- Return object with named exports for state and setters
- Type discriminated unions for enums: `type AppRole = 'admin' | 'socio' | 'lider' | 'rh' | 'colaborador'`
- Mounted flag pattern for cleanup: `let mounted = true` in useEffect, checked before setState

**Shadcn/ui Integration:**
- Components live in `src/components/ui/` (lowercase .tsx files)
- Use class-variance-authority (CVA) for variant management: `const buttonVariants = cva(...)`
- Radix UI as headless foundation for all UI components
- cn() utility (clsx + tailwind-merge) for dynamic class composition
- Example: `Button` uses `buttonVariants` CVA with `variant` and `size` props

**Linear Design System Primitives:**
- Custom primitives in `src/components/primitives/LinearKit.tsx`
- Exports: `Btn`, `Chip`, `Row`, `Col`, `ProgressBar`, `LinearAvatar`, `SectionHeader`, `Card`, `ActionRow`, `Kbd`
- These are Light/Linear-inspired, not Radix-based — hand-crafted with Tailwind
- Naming: Short, action-first names (`Btn` not `Button`, `Chip` not `Badge`)

**Brand Primitives:**
- `LeverArrow` component: official brand arrow, located in `@/components/primitives/LeverArrow.tsx`
- Usage: Never use Lucide ArrowX or custom font-display fallback — always use the SVG-based `LeverArrow` primitive
- Brand assets: SVG files in `@/assets/` (e.g., `lever-wordmark-dark.svg`)

## Tailwind Class Organization

**Pattern:**
- Classes ordered: Layout → Sizing → Colors → Typography → Effects/Transitions
- Responsive prefixes: `hidden lg:grid` (hide on mobile, show on lg+)
- Utility composition: `cn()` function used for dynamic class merging with conflict resolution
- Semantic color tokens used: `bg-text`, `text-text-muted`, `border-border`, `bg-bg-subtle`, `bg-accent` (not Tailwind defaults)
- Custom font scales: `text-[13px]`, `text-[12.5px]` for precision

**CVA (Class Variance Authority) Usage:**
- Applied to button and other component variants
- Example structure:
  ```typescript
  const buttonVariants = cva(
    "base-classes",
    {
      variants: {
        variant: { default: "...", secondary: "...", ghost: "..." },
        size: { sm: "...", md: "...", lg: "..." },
      },
      defaultVariants: { variant: "default", size: "md" },
    }
  );
  ```
- Components receive variant props and compute final class via `cn(buttonVariants({ variant, size, className }))`

---

*Convention analysis: 2026-04-27*
