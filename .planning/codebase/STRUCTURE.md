# Codebase Structure

**Analysis Date:** 2026-04-27

## Directory Layout

```
leverup-talent-hub/
├── src/                        # Frontend application source
│   ├── pages/                  # Full-screen page components (one per route)
│   │   ├── hiring/             # Hiring domain pages (lazy-loaded)
│   │   └── *.tsx               # Role-based dashboards, profile pages, etc.
│   ├── components/             # Reusable UI components
│   │   ├── hiring/             # Hiring-specific components (30+ components)
│   │   ├── company/            # Company management components
│   │   ├── primitives/         # Brand primitives (LeverArrow, StatusBadge, etc.)
│   │   ├── ui/                 # Radix + shadcn UI library components
│   │   └── *.tsx               # Layout, shared components (Header, Sidebar, etc.)
│   ├── hooks/                  # Custom React hooks for data & state
│   │   ├── hiring/             # Hiring domain hooks (18 hooks, React Query wrapped)
│   │   └── use*.ts             # Cross-domain hooks (useAuth, useTeams, etc.)
│   ├── lib/                    # Business logic, constants, utilities
│   │   ├── hiring/             # Hiring enums, status machine, constants
│   │   ├── routes.ts           # Breadcrumb + title generation
│   │   ├── utils.ts            # Shared utility functions
│   │   └── supabaseError.ts    # Error handling utilities
│   ├── integrations/           # External service clients
│   │   └── supabase/           # Supabase configuration & types
│   │       ├── client.ts       # Supabase client instance (auto-generated)
│   │       ├── types.ts        # Database schema types (8824 lines, auto-generated)
│   │       └── hiring-types.ts # Extended hiring domain types (24KB)
│   ├── assets/                 # Static files (SVGs, images)
│   │   ├── lever-*.svg         # Official Lever Talents branding
│   │   └── lever-logo.png      # Logo asset
│   ├── App.tsx                 # Root component (316 lines) — routes + providers
│   ├── main.tsx                # React DOM bootstrap
│   ├── index.css               # Global Tailwind + custom styles (404 lines)
│   ├── App.css                 # App-specific CSS
│   └── vite-env.d.ts           # Vite environment type declarations
│
├── supabase/                   # Supabase backend configuration
│   ├── functions/              # Edge Functions (16 function directories)
│   │   ├── _shared/            # Shared code for all functions
│   │   ├── apply-to-job/       # Job application handler
│   │   ├── create-user/        # User account creation
│   │   ├── delete-user/        # User deletion (with anonymization)
│   │   ├── hiring-*/           # Hiring automation functions (anonymize, approve, cron, etc.)
│   │   ├── transcribe-audio/   # Audio transcription (Whisper API)
│   │   ├── summarize-meeting/  # Meeting summary generation
│   │   └── list-users/         # User listing with filters
│   ├── migrations/             # Database schema (50 SQL files, 568KB total)
│   │   ├── 20260416193000_hiring_core_entities.sql        # Job, Candidate, Application tables
│   │   ├── 20260416193100_hiring_rls_policies.sql         # Row-level security rules
│   │   ├── 20260416193400_hiring_audit_and_locking.sql    # Audit tables + pessimistic locking
│   │   ├── 20260416193700_pending_tasks_hiring_triggers.sql # Task automation
│   │   └── [other migrations for auth, teams, PDI, climate, etc.]
│   ├── seed/                   # Seed scripts (test data initialization)
│   └── config.toml             # Supabase project configuration
│
├── specs/                      # Feature specifications & planning
│   └── 001-hiring-pipeline/    # Hiring pipeline feature spec
│
├── .specify/                   # GSD (Goal-Setting Dashboard) configuration
│   ├── feature.json            # Feature metadata
│   ├── init-options.json       # Initialization options
│   ├── integration.json        # Integration config
│   ├── integrations/           # Integration templates
│   ├── memory/                 # Project memory/context
│   ├── scripts/                # Automation scripts
│   └── templates/              # Code generation templates
│
├── .planning/                  # Internal planning artifacts
│   └── codebase/               # Architecture & structure documentation
│
├── node_modules/               # Dependencies (not versioned)
├── public/                     # Static files served as-is (index.html, etc.)
├── .eslintrc.cjs               # ESLint configuration
├── .prettierrc                 # Prettier formatting config
├── tsconfig.json               # TypeScript root config
├── tsconfig.app.json           # App-specific TypeScript config
├── tsconfig.node.json          # Build tool TypeScript config
├── vite.config.ts              # Vite bundler configuration (path alias @ → ./src)
├── package.json                # Dependencies & build scripts
├── index.html                  # HTML entry point
└── README.md                   # Project overview
```

## Directory Purposes

**`src/pages/`**
- Purpose: Full-screen page components, one per route
- Contains: 29 page components covering auth, dashboards, hiring, team management, PDI, evaluations, climate surveys
- Key files: 
  - `Auth.tsx` — Login/registration
  - `hiring/*.tsx` — JobOpenings, CandidateProfile, TalentPool, HiringDashboard, CulturalFitTemplates
  - `*Dashboard.tsx` — Role-specific dashboards (GestorDashboard, RHDashboard, AdminDashboard, SocioDashboard)
  - `Profile.tsx`, `TeamManagement.tsx`, `CompanyManagement.tsx`

**`src/components/hiring/`**
- Purpose: Hiring domain feature components (34 files total)
- Contains: JobsKanban, CandidatesKanban, AllCandidatesKanban, CandidateDrawer (29KB, main candidate UI), JobOpeningForm (31KB, job creation), PublicApplicationForm, CulturalFitQuestionEditor, BackgroundCheckUploader, InterviewScheduler, etc.
- Pattern: Each component handles a specific hiring workflow (create job, review candidate, schedule interview, etc.)

**`src/components/company/`**
- Purpose: Company (empresa) management
- Contains: CompanyDrawer.tsx (19KB) — create/edit company details

**`src/components/primitives/`**
- Purpose: Brand primitives & custom design elements (not shadcn)
- Key files:
  - `LeverArrow.tsx` — Custom brand arrow primitive (per brand guidelines, not Lucide)
  - `StatusBadge.tsx` — Hiring status indicators (Pendente, Entrevista, Contratado, etc.)
  - `ScoreDisplay.tsx` — Skill score visualization
  - `LinearKit.tsx` — Recruitment funnel chart
  - `Icon.tsx` — Icon factory for hiring domain (hiring-specific SVG/icon rendering)
  - `SectionCard.tsx`, `StatCard.tsx`, `PageHeader.tsx`, `LoadingState.tsx`, `EmptyState.tsx`
- Pattern: Export single default component or index exports; used throughout app for consistent branding

**`src/components/ui/`**
- Purpose: Radix UI + shadcn component library (39+ components)
- Contains: Radix-based accessible components (Dialog, Button, Card, Input, Select, Tabs, Accordion, etc.)
- Pattern: Each file wraps Radix primitives with Tailwind styling

**`src/hooks/`**
- Purpose: Custom React hooks encapsulating state & side effects
- Domain hooks:
  - Authentication: `useAuth.ts` (130 lines) — user, role, view-as support
  - Teams: `useTeams.ts` (7862 lines), `useTeamIndicators.ts`, `useLeaderAlerts.ts`
  - PDI: `usePDIIntegrated.ts`, `usePDIUpdates.ts`
  - Climate: `useClimateSurveys.ts`, `useClimateOverview.ts`
  - Evaluations: `useEvaluations.ts`
  - One-on-Ones: `useOneOnOnes.ts`
  - Other: `useUsers.ts`, `useUserProfile.ts`, `usePendingTasks.ts`, `useDevelopmentPlans.ts`, `useNineBoxDistribution.ts`, `useOrgIndicators.ts`, `useCollaboratorEvolution.ts`, `useCostBreakdown.ts`, `useActionItems.ts`, `useAudioTranscription.ts`, `useDeleteUser.ts`

**`src/hooks/hiring/`**
- Purpose: Hiring domain data hooks (18 React Query wrapped hooks)
- Key files:
  - `useJobOpenings.ts` — List/search jobs (query filters, pagination)
  - `useJobOpening.ts` — Single job detail
  - `useJobDescription.ts` — Job description management
  - `useCandidates.ts` — List/filter candidates (7059 lines)
  - `useCandidateConversations.ts` — Candidate interview conversations (5151 lines; supports candidate_conversations table + transcript sections)
  - `useApplications.ts` — Job applications pipeline
  - `useCulturalFit.ts` — Cultural fit assessments
  - `useInterviews.ts`, `useInterviewDecision.ts` — Interview scheduling & decisions
  - `useBackgroundCheck.ts` — Background check uploads
  - `useHiringMetrics.ts` — Dashboard KPIs
  - `useTalentPool.ts` — Talent pool (unmatched candidates) with subscriptions
  - `useOnboardingHandoff.ts` — Hired candidate onboarding
  - `useJobPublications.ts` — External job board publishing
  - `useStandardMessages.ts` — Canned messages for recruiting
  - `useOptimisticVersion.ts` — Optimistic UI updates
  - `useSidebarCounts.ts` — Badge counts for hiring sidebar
  - `useApplicationCountsByJob.ts` — Per-job application counts

**`src/lib/`**
- Purpose: Shared business logic, routing, error handling
- Key files:
  - `routes.ts` — Breadcrumb/title definitions (50+ routes mapped)
  - `supabaseError.ts` — Error handler for RLS/auth failures
  - `utils.ts` — Shared utilities (currently minimal)

**`src/lib/hiring/`**
- Purpose: Hiring domain constants, enums, logic
- Key files:
  - `discardReasons.ts` (2994 lines) — Candidate rejection reason taxonomy
  - `statusMachine.ts` — Candidate status lifecycle validation
  - `stageGroups.ts` — Pipeline stage categorization (prospecting, screening, interview, etc.)
  - `retention.ts` — Offer/retention rules
  - `rlsScope.ts` — RLS policy scope definitions

**`src/integrations/supabase/`**
- Purpose: Supabase client & schema types
- Key files:
  - `client.ts` — Singleton Supabase client (auto-generated, do not edit)
  - `types.ts` — Full database schema TypeScript types (8824 lines, auto-generated from migrations)
  - `hiring-types.ts` — Extended hiring domain types (24KB, manually maintained for hiring enums/helpers)

**`src/assets/`**
- Purpose: Static media files
- Key files:
  - `lever-wordmark-dark.svg`, `lever-wordmark-light.svg` — Official logo assets
  - `lever-symbol.svg` — Symbol only (for favicons, badges)
  - `lever-motif.svg` — Pattern/decorative element
  - `lever-logo.png` — PNG fallback

**`supabase/functions/`**
- Purpose: Backend logic as Deno Edge Functions (deployed to Supabase)
- Key functions:
  - `transcribe-audio/` — Calls Whisper API for meeting recording transcription
  - `summarize-meeting/` — AI-generated meeting summaries
  - `apply-to-job/` — Processes job applications
  - `create-user/` — Provisions new team member accounts
  - `delete-user/` — GDPR deletion with anonymization
  - `hiring-anonymize-candidate/` — Candidate GDPR removal
  - `hiring-approve-application/` — Converts application to interview
  - `hiring-cron-anonymize-expired/` — Scheduled anonymization of old candidates
  - `hiring-cron-expire-fit-links/` — Scheduled expiration of public cultural fit links
  - `hiring-issue-fit-cultural-link/` — Issues time-limited cultural fit assessment link
  - `hiring-submit-fit-cultural-public/` — Receives public cultural fit form submission
  - `hiring-export-pipeline-csv/` — Exports hiring pipeline to CSV
  - `list-users/` — Lists users with filters (for team management)
  - `_shared/` — Shared utilities, types, auth helpers

**`supabase/migrations/`**
- Purpose: Database schema version control (50 SQL files)
- Structure: Timestamped files (20260416193000_*.sql format), applied sequentially
- Key migration groups:
  - Initial schema (users, teams, companies, etc.)
  - Hiring entities (jobs, candidates, applications, interviews)
  - RLS policies (row-level security for multi-tenancy)
  - Audit & locking (audit_log table, pessimistic locks)
  - Cron jobs (automated scheduling)
  - Climate surveys, PDI, evaluations
  - Pending tasks automation

**`.specify/`**
- Purpose: GSD (Goal-Setting Dashboard) automation configuration
- Contains: Feature specs, integration metadata, code generation templates, project memory (auto-persisted context for future Claude sessions)

**`specs/`**
- Purpose: Manual feature specifications & planning documents
- Contains: 001-hiring-pipeline/ with detailed requirements

**`.planning/codebase/`**
- Purpose: Architecture & structure documentation (this folder)
- Contains: ARCHITECTURE.md, STRUCTURE.md, and future docs (CONVENTIONS.md, TESTING.md, STACK.md, INTEGRATIONS.md, CONCERNS.md)

## Key File Locations

**Entry Points:**
- `src/main.tsx` — React DOM bootstrap (5 lines)
- `index.html` — HTML document entry point
- `src/App.tsx` — Root component with router (316 lines)

**Configuration:**
- `vite.config.ts` — Bundler, path alias @ → ./src
- `tsconfig.json`, `tsconfig.app.json` — TypeScript configuration (strict: false, noImplicitAny: false for flexibility)
- `package.json` — Dependencies and build scripts
- `.eslintrc.cjs` — Linting rules
- `.prettierrc` — Code formatting
- `supabase/config.toml` — Supabase project settings

**Core Logic:**
- Auth: `src/hooks/useAuth.ts` (130 lines) — centralized authentication
- Routing: `src/lib/routes.ts` — breadcrumb/title definitions; `src/App.tsx` — actual routes
- API Client: `src/integrations/supabase/client.ts` — Supabase singleton
- Types: `src/integrations/supabase/types.ts` — Database schema (auto-generated)

**Layout & Navigation:**
- `src/components/Layout.tsx` — Persistent sidebar + header wrapper
- `src/components/Sidebar.tsx` — Navigation menu
- `src/components/Header.tsx` — Top bar with user menu
- `src/components/CmdKPalette.tsx` — Command palette navigation

**Hiring Feature Pages:**
- `src/pages/hiring/JobOpenings.tsx` — Job listing + Kanban (jobs-by-stage)
- `src/pages/hiring/JobOpeningDetail.tsx` — Job detail page
- `src/pages/hiring/CandidatesList.tsx` — Candidate table view
- `src/pages/hiring/CandidatesKanban.tsx` — Candidate Kanban by pipeline stage
- `src/pages/hiring/CandidateProfile.tsx` — Individual candidate detail (includes candidate_conversations section)
- `src/pages/hiring/TalentPool.tsx` — Unmatched candidates bank
- `src/pages/hiring/HiringDashboard.tsx` — Recruiting KPI dashboard
- `src/pages/hiring/CulturalFitTemplates.tsx` — Assessment template management
- `src/pages/hiring/PublicCulturalFit.tsx` — Public candidate assessment form
- `src/pages/hiring/PublicJobOpening.tsx` — Public job listing (SEO-friendly)

**Company Management:**
- `src/pages/CompanyManagement.tsx` — CRUD for companies (restricted to RH/admin)
- `src/components/company/CompanyDrawer.tsx` — Inline company form

**Hiring Components:**
- `src/components/hiring/JobsKanban.tsx` — Job Kanban board (Notion-style per user feedback)
- `src/components/hiring/CandidatesKanban.tsx` — Candidate Kanban
- `src/components/hiring/AllCandidatesKanban.tsx` — All candidates across jobs
- `src/components/hiring/CandidateDrawer.tsx` (29KB) — Main candidate detail panel (nested drawer, per UX feedback)
- `src/components/hiring/JobDrawer.tsx` — Job detail panel
- `src/components/hiring/JobOpeningForm.tsx` (31KB) — Create/edit job
- `src/components/hiring/CandidateForm.tsx` — Create/edit candidate
- `src/components/hiring/PublicApplicationForm.tsx` — Public job application form
- `src/components/hiring/CandidateConversationsSection.tsx` (16KB) — Expandable transcript section in candidate profile
- `src/components/hiring/BackgroundCheckUploader.tsx` — Document upload
- `src/components/hiring/InterviewScheduler.tsx` — Calendar scheduling
- `src/components/hiring/CulturalFitQuestionEditor.tsx` — Assessment builder
- `src/components/hiring/DiscardReasonDialog.tsx` — Rejection reason picker
- And 20+ more hiring-specific components

**Supabase Functions:**
- `supabase/functions/transcribe-audio/index.ts` — Audio to text
- `supabase/functions/summarize-meeting/index.ts` — Meeting recap AI
- `supabase/functions/apply-to-job/index.ts` — Application processing
- `supabase/functions/_shared/auth.ts` — JWT validation for functions

## Naming Conventions

**Files:**
- Pages: PascalCase (e.g., `JobOpenings.tsx`, `CandidateProfile.tsx`)
- Components: PascalCase (e.g., `CandidateDrawer.tsx`, `JobsKanban.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useAuth.ts`, `useJobOpenings.ts`, `useCandidates.ts`)
- Utils/lib: camelCase (e.g., `routes.ts`, `utils.ts`, `supabaseError.ts`)
- Types: PascalCase file names, contents export types/interfaces (e.g., `types.ts`, `hiring-types.ts`)

**Directories:**
- Feature domains: lowercase with hyphens (e.g., `hiring/`, `company/`)
- Component subdirectories: lowercase (e.g., `ui/`, `primitives/`)
- Library subdirectories: lowercase (e.g., `integrations/`, `hooks/`)

**Code Identifiers:**
- React components: PascalCase (e.g., `CandidateDrawer`, `JobOpeningForm`)
- Hooks: camelCase (e.g., `useJobOpenings()`, `useCandidates()`)
- Functions: camelCase (e.g., `getPageTitle()`, `getBreadcrumbs()`)
- Constants/enums: UPPER_SNAKE_CASE or PascalCase (e.g., `VALID_ROLES`, `StatusMachine`)
- Type definitions: PascalCase (e.g., `AppRole`, `RouteCrumb`, `Database`)

## Where to Add New Code

**New Feature Page:**
- Implementation: `src/pages/[feature-name]/NewPage.tsx`
- Example structure: Accept params from URL via useParams, call feature hooks for data, render layout + components
- Register route in `src/App.tsx` (wrapped with ProtectedRoute if role-restricted)
- Update `src/lib/routes.ts` breadcrumbs/title if page has unique navigation path

**New Feature Component:**
- Implementation: `src/components/[feature-name]/NewComponent.tsx`
- If generic/reusable: `src/components/primitives/` or `src/components/ui/`
- If hiring-specific: `src/components/hiring/`
- If company-specific: `src/components/company/`
- Export from component's index.ts if directory has one

**New Data Hook:**
- Implementation: `src/hooks/[feature-name]/use[Entity].ts`
- Hiring: `src/hooks/hiring/use[Entity].ts`
- Structure: Wrap Supabase query in React Query hook, return { data, isLoading, error, ...mutations }
- Example: See `src/hooks/hiring/useJobOpenings.ts` for pattern (query building, React Query, error handling)

**New Utility/Lib Function:**
- Implementation: `src/lib/[feature-name]/newFunction.ts` or add to existing file
- Hiring constants: `src/lib/hiring/`
- Shared utils: `src/lib/utils.ts`
- Keep functions pure (no side effects, no imports of React/hooks)

**New Backend Logic:**
- Edge Function: `supabase/functions/[function-name]/index.ts`
- Shared utilities: `supabase/functions/_shared/`
- Follow Deno + Supabase patterns in existing functions

**New Database Schema:**
- Migration: `supabase/migrations/[timestamp]_[description].sql`
- Naming: Use ISO timestamp prefix (YYYYMMDDHHMMSS format)
- After migration: Run `supabase gen types` to regenerate `src/integrations/supabase/types.ts`
- If hiring-specific: Add types to `src/integrations/supabase/hiring-types.ts` manually

**New Test Suite:**
- Co-located with source: `[source-file].test.ts` or `[source-file].spec.ts`
- Or dedicated directory: `src/__tests__/[feature]/`
- Testing framework: Not yet configured (see TESTING.md for future setup)

## Special Directories

**`src/components/ui/`**
- Purpose: Radix UI library components (auto-generated/maintained by shadcn)
- Generated: Yes (via shadcn CLI)
- Committed: Yes (components checked in, not node_modules)
- Pattern: Each file wraps a Radix primitive with Tailwind classes
- Do NOT edit: These are template-generated; re-run shadcn if updating

**`src/integrations/supabase/`**
- Purpose: Supabase integration & auto-generated types
- Generated: client.ts, types.ts are auto-generated (do NOT edit)
- Committed: Yes (types committed for IDE support)
- Process: After DB migration, run `supabase gen types` to regenerate types.ts
- Manual: hiring-types.ts is hand-maintained for custom enums/helpers

**`supabase/migrations/`**
- Purpose: Version-controlled database schema
- Generated: No (human-written SQL)
- Committed: Yes (all migrations checked in)
- Immutable: Once deployed, migrations are immutable (add new migration to fix)

**`supabase/functions/`**
- Purpose: Serverless backend (Deno-based Edge Functions)
- Generated: No (hand-written Deno TS)
- Committed: Yes
- Deployed: Automatically when pushed to Supabase git

**`public/`**
- Purpose: Static assets served as-is (not bundled)
- Generated: No
- Committed: Yes
- Includes: index.html, favicon, robots.txt, etc.

**`node_modules/`**
- Purpose: Installed dependencies
- Generated: Yes (npm install)
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-04-27*
