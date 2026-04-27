# Architecture

**Analysis Date:** 2026-04-27

## Pattern Overview

**Overall:** Role-based Single Page Application (SPA) with feature-driven organization

**Key Characteristics:**
- Client-side routing via React Router DOM
- Role-based access control (RBAC) at route level and component level
- Real-time data synchronization via Supabase client
- Lazy-loaded feature modules for hiring domain
- Radix UI components with Tailwind CSS styling
- React Query for server state management
- TypeScript strict mode for type safety
- Supabase Edge Functions for backend logic

## Layers

**Presentation Layer (Pages + Components):**
- Purpose: User interface rendered by React
- Location: `src/pages/`, `src/components/`
- Contains: Page components (full screens), feature components (hiring, company, etc.), UI primitives (Radix-based), layout components
- Depends on: React Router, hooks, integrations/supabase, UI components
- Used by: App routing, Layout wrapper

**Hooks Layer (Custom React Hooks):**
- Purpose: Data fetching, state management, side effects abstraction
- Location: `src/hooks/`, `src/hooks/hiring/`
- Contains: useAuth (authentication state), useQuery hooks (useApplications, useCandidates, useTalentPool, etc.), useTeams, usePDIIntegrated, useClimateSurveys
- Depends on: Supabase client, React Query, React hooks
- Used by: Pages and feature components

**Integration Layer:**
- Purpose: Third-party service abstraction
- Location: `src/integrations/supabase/`
- Contains: Supabase client (`client.ts`), generated TypeScript types (`types.ts`, `hiring-types.ts`), Supabase error handling (`supabaseError.ts`)
- Depends on: @supabase/supabase-js, environment variables
- Used by: Hooks, directly by some components for mutations

**Lib/Utilities Layer:**
- Purpose: Business logic, configuration, routing definitions
- Location: `src/lib/`, `src/lib/hiring/`
- Contains: Routes definition (`routes.ts`), utilities (`utils.ts`), hiring-specific enums/constants (discardReasons.ts, statusMachine.ts, stageGroups.ts, retention.ts, rlsScope.ts)
- Depends on: None (pure functions)
- Used by: Pages, components, hooks

**Type System:**
- Purpose: Generated Supabase schema types + hiring domain types
- Location: `src/integrations/supabase/types.ts` (8824 lines), `src/integrations/supabase/hiring-types.ts` (24KB)
- Contains: Database table types, enum definitions, query response types
- Auto-generated from Supabase migrations; hiring types manually extended

## Data Flow

**Authentication Flow:**

1. User visits app → `App.tsx` renders
2. `useAuth()` hook checks for existing Supabase session
3. `useAuth()` loads user role from `user_roles` table (or fallback to metadata in dev)
4. User data stored in hook state, role in realRole state
5. `App.tsx` evaluates role and selects default route (admin → /admin, lider → /gestor, rh → /rh, etc.)
6. Authenticated routes wrapped in Layout component

**Data Fetching Flow:**

1. Page/component mounts and calls a feature hook (e.g., `useCandidates()`, `useJobOpenings()`)
2. Hook uses React Query to manage server state, calls Supabase client methods
3. `supabase.from('table').select()` queries execute on backend with RLS policies applied
4. Results cached by React Query, updates via real-time subscriptions
5. Component re-renders with data, handles loading/error states

**State Management:**

- **Auth State:** Centralized in `useAuth()` hook — localStorage-backed Supabase session
- **Server State:** React Query (`QueryClient` in App.tsx) — automatic caching, invalidation, syncing
- **UI State:** Local component state (useState) for drawer open/close, filters, form inputs
- **Admin View-As:** Custom event-based override system via localStorage (allows admins to simulate other roles)

## Key Abstractions

**Authentication Context (useAuth):**
- Purpose: Centralized identity + role management
- Files: `src/hooks/useAuth.ts`
- Pattern: Custom hook returning `{ user, loading, userRole, realRole, viewAsRole, setViewAsRole, isViewingAs }`
- Used by: `App.tsx` for routing decisions, components needing user context

**Role-Based Route Protection:**
- Purpose: Guard routes based on user role
- Files: `src/components/ProtectedRoute.tsx`
- Pattern: Wrapper component checking `useAuth().userRole` against `allowedRoles` prop, shows 404 if unauthorized
- Used by: All authenticated routes in App.tsx

**Supabase Client Singleton:**
- Purpose: Single instance of Supabase connection across app
- Files: `src/integrations/supabase/client.ts`
- Pattern: Exported `supabase` constant created once at module load
- Used by: All hooks, direct mutations in forms

**Hiring Domain Hooks:**
- Purpose: Encapsulate hiring-specific data logic
- Files: `src/hooks/hiring/use*.ts` (useJobOpenings, useCandidates, useCulturalFit, etc.)
- Pattern: React Query hooks wrapping Supabase queries, apply filters/transformations
- Used by: Hiring pages and components

**Hiring Status Machine:**
- Purpose: Define valid candidate lifecycle transitions
- Files: `src/lib/hiring/statusMachine.ts`
- Pattern: Exported constants defining state transitions, used in DiscardReasonDialog, HiringDecisionPanel
- Used by: Components updating candidate status

## Entry Points

**Application Bootstrap:**
- Location: `src/main.tsx`
- Triggers: Browser loads `index.html`
- Responsibilities: Mounts React DOM, renders App component

**App Component:**
- Location: `src/App.tsx` (316 lines)
- Triggers: Main entry after React mount
- Responsibilities: 
  - Sets up QueryClient (React Query)
  - Wraps app with TooltipProvider, Toasters, ErrorBoundary
  - Calls useAuth() to determine auth state and role
  - Renders auth check (loading spinner, redirect to /auth if unauthenticated)
  - Defines all routes (role-protected and public)
  - Lazy-loads hiring pages (JobOpenings, TalentPool, CandidateProfile, etc.)
  - Wraps authenticated routes with Layout component

**Layout Component:**
- Location: `src/components/Layout.tsx`
- Triggers: All authenticated routes
- Responsibilities: 
  - Renders persistent sidebar, header, main content area
  - Manages sidebar visibility toggle
  - Renders CmdK command palette
  - Renders ViewAsBanner (admin role override UI)
  - Provides page transition animation via PageTransition component
  - Outlet renders current route's page component

**Router Configuration:**
- Pattern: React Router v6 flat route definitions in App.tsx
- Public routes: /auth, /vagas/:id (public job listing), /hiring/fit/:token (public cultural fit form)
- Authenticated routes: All others under Layout Outlet
- Role-protected: Wrapped with ProtectedRoute component specifying allowedRoles
- Breadcrumb/title generation: `src/lib/routes.ts` (LABELS, getBreadcrumbs, getPageTitle)

## Error Handling

**Strategy:** Layered error handling with recovery attempts

**Patterns:**

1. **Auth Errors:** `useAuth()` catches and returns null user; ProtectedRoute shows 404 for unauthorized access
2. **Query Errors:** React Query retry logic (3 attempts by default), error state in hook return (e.g., `{ data, error, isError }`)
3. **Mutation Errors:** Components handle via catch blocks, Sonner toast shows error message
4. **Supabase RLS Errors:** 403 responses caught in hooks, logged via supabaseError handler
5. **API Function Errors:** Edge Functions throw errors caught in frontend; errors propagated to error boundary
6. **Boundary Fallback:** ErrorBoundary component (`src/components/ErrorBoundary.tsx`) catches React render errors, displays fallback UI

## Cross-Cutting Concerns

**Logging:** Console methods (console.log, console.error) throughout codebase; no centralized logger detected yet

**Validation:** 
- Form validation: React Hook Form + Zod schema validation in forms (ManualPDIForm, JobOpeningForm, PublicApplicationForm, etc.)
- Type validation: TypeScript strict mode enforces compile-time checks
- RLS enforcement: Supabase policies validate at database level

**Authentication:** 
- Handled via Supabase Auth (email/password)
- Session persisted in localStorage, auto-refreshed via Supabase client config
- Roles stored in `user_roles` table, loaded on session init
- Admin view-as feature: stores override role in localStorage, checked before evaluating permissions

**Authorization:**
- Role-based: ProtectedRoute checks role against allowedRoles prop
- Database-level: RLS policies in migrations restrict row access by user/role
- Hiring-specific: Candidate privacy policies (discardReasonDialogs only shown to RH/admin, background checks restricted)

**Real-Time Updates:**
- Supabase .on() subscriptions in some hooks (e.g., useTalentPool monitors candidate_conversations changes)
- Not globally enabled; feature-specific subscriptions as needed

**Theme Management:** next-themes integration available (ThemeProvider in dependencies); likely used for dark/light mode toggle

**Command Palette:** CmdKPalette component provides quick navigation (mounted in Layout); uses cmdk library

---

*Architecture analysis: 2026-04-27*
