# External Integrations

**Analysis Date:** 2026-04-27

## APIs & External Services

**Supabase Cloud:**
- Supabase cloud (project ID: `ehbxpbeijofxtsbezwxd`, migrated from `wrbrbhuhsaaupqsimkqz` on 2026-04-23)
  - **Auth:** Supabase Auth (email/password with JWT tokens)
  - **Database:** PostgreSQL managed by Supabase
  - **Realtime:** Supabase Realtime for subscriptions
  - **Storage:** Supabase Storage for file uploads (audio, transcriptions, documents)
  - **Edge Functions:** Deno runtime for backend operations
  - SDK/Client: `@supabase/supabase-js` 2.75.0
  - Configured in: `src/integrations/supabase/client.ts`

**OpenAI (via Edge Function):**
- Transcribe Audio API (speech-to-text)
  - Used by: `supabase/functions/transcribe-audio/`
  - Auth: `OPENAI_API_KEY` environment variable (Edge Function secret)
  - Endpoint: Called from frontend via Supabase Edge Function invoke

**Lovable AI (via Edge Function):**
- Summarize Meeting API (meeting transcript summarization)
  - Used by: `supabase/functions/summarize-meeting/`
  - Auth: `LOVABLE_API_KEY` environment variable (Edge Function secret)
  - Endpoint: Called from frontend via Supabase Edge Function invoke

## Data Storage

**Databases:**
- PostgreSQL (managed by Supabase)
  - Connection: SUPABASE_URL (Supabase-managed endpoint)
  - Client: @supabase/supabase-js
  - Schema types auto-generated: `src/integrations/supabase/types.ts` (281 KB, auto-generated)
  - Hiring-specific types: `src/integrations/supabase/hiring-types.ts` (24 KB)
  - Tables include: users, user_roles, companies, job_openings, candidates, applications, performance evaluations, surveys (climate), development plans, 1-on-1s, teams, PDI (Plano de Desenvolvimento Integrado), OKRs, applicant tracking stage, cultural fit assessments, etc.
  - Row-Level Security (RLS) enforced on all public data — users only see company/team-scoped data

**File Storage:**
- Supabase Storage buckets (cloud-hosted)
  - Purpose: Audio recordings for transcription, saved transcripts, document uploads
  - Accessed via: @supabase/supabase-js storage client (publicUrl generation)
  - Bucket structure: Not explicitly named in code, inferred from transcribe-audio function usage

**Caching:**
- TanStack Query (@tanstack/react-query 5.83.0)
  - Purpose: Client-side server state caching, deduplication, automatic background refetching
  - Configuration: `src/App.tsx` initializes `new QueryClient()` with default settings
  - Used throughout hooks (useAuth, useTeams, useEvaluations, etc.) for prefetching and cache management

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (JWT-based)
  - Implementation: Email/password authentication
  - Token Storage: localStorage (via `src/integrations/supabase/client.ts` auth config)
  - Session Persistence: Enabled (autoRefreshToken: true, persistSession: true)
  - Hook: `src/hooks/useAuth.ts` manages auth state, user roles, and "view-as" role override (admin feature)
  - User Metadata: role stored in user.user_metadata.role during signup, synced to user_roles table via trigger

**Role-Based Access Control (RBAC):**
- Application roles: 'admin', 'socio', 'lider', 'rh', 'colaborador'
- Role source: user_roles table (single source of truth after auth)
- Fallback: user_metadata.role used in DEV if user_roles trigger hasn't run
- Role enforcement: ProtectedRoute component (`src/components/ProtectedRoute`) checks allowedRoles array
- View-as override: Admins can override their role in UI via setViewAsRole (for testing/debugging)
- Route mapping in `src/App.tsx`: admin → /admin, socio → /socio, lider → /gestor, rh → /rh, colaborador → /colaborador

**User Creation:**
- Edge Function: `supabase/functions/create-user/index.ts`
- Process:
  1. Email, password, fullName, department, hireDate, role, teamId, leaderId received
  2. Supabase Admin API creates auth user (email_confirm: true to skip email verification)
  3. role passed via user_metadata to trigger handle_new_user
  4. handle_new_user trigger inserts row in user_roles table with correct role (avoids default 'colaborador' duplication)
  5. Additional profile data inserted into user profile/team tables

**User Deletion:**
- Edge Function: `supabase/functions/delete-user/index.ts`
- Cascade deletes or soft-deletes dependent records
- Hook: `src/hooks/useDeleteUser.ts` for frontend invocation

## Webhooks & Callbacks

**Incoming (Public Endpoints):**
- `supabase/functions/apply-to-job/` - Public job application submission
  - Triggered by: External candidate applying via public job opening
  - Stores: Application record, candidate profile, communication log

- `supabase/functions/hiring-submit-fit-cultural-public/` - Public cultural fit assessment submission
  - Triggered by: External candidate submitting cultural fit form
  - Stores: Assessment response linked to application

**Outgoing:**
- None detected — integration is primarily read/write to Supabase database and invocation of Supabase Edge Functions

**Cron Edge Functions:**
- `supabase/functions/hiring-cron-expire-fit-links/` - Scheduled expiration of cultural fit assessment links
  - Triggered by: Supabase scheduler
  - Purpose: Mark expired cultural fit form URLs as inactive

- `supabase/functions/hiring-cron-anonymize-expired/` - Scheduled anonymization of rejected candidates
  - Triggered by: Supabase scheduler
  - Purpose: Compliant deletion of personal data after retention period

## Real-time Subscriptions

**Supabase Realtime:**
- Enabled via `@supabase/supabase-js` client configuration
- Purpose: Live updates for collaborators, team data, evaluations, 1-on-1s, etc.
- Usage pattern: Hooks subscribe to table changes and update local state
- Security: RLS policies enforced on realtime channels (same as REST queries)

## Message Queue / Job Processing

- None detected — asynchronous operations handled via Supabase Edge Functions (Deno-based serverless compute)

## Monitoring & Observability

**Error Tracking:**
- Custom error handler: `src/lib/supabaseError.ts`
  - Catches Supabase PostgrestError (database errors with codes 23505, 23503, 23514, 42501, PGRST116)
  - Maps error codes to friendly Portuguese messages
  - RLS violations (42501) logged separately with [RLS] prefix
  - Displays toast notifications to user via sonner library
  - Fallback messages in Portuguese

**Logs:**
- Browser console: Standard console.warn/error statements (development & production)
- No centralized logging service detected (Sentry, Datadog, etc.)
- Server-side: Edge Functions log to Supabase function logs (accessible via Supabase dashboard)

**Performance:**
- React DevTools integration (via vite react-swc plugin)
- No APM (application performance monitoring) detected

## CI/CD & Deployment

**Hosting:**
- Docker container deployment
  - Image: levertalents/web:latest
  - Registry: (not specified — assumes private registry or CI/CD system pulls from local build)
  - Deployment: VPS with Docker Compose (based on docker-compose.yml)

**CI Pipeline:**
- Not detected in repository (no .github/workflows, gitlab-ci.yml, etc.)
- Build process: Dockerfile defines build + runtime stages

**Deployment Process (Inferred):**
1. Frontend code built via Vite (TypeScript → JavaScript + CSS)
2. Docker image built with Nginx runtime
3. docker-compose.yml deploys to VPS
4. Supabase Edge Functions deployed separately (likely via `supabase deploy` CLI)

## Environment Configuration

**Required env vars (Frontend):**
- `VITE_SUPABASE_URL` - Supabase project endpoint (https://ehbxpbeijofxtsbezwxd.supabase.co)
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Anon key from Supabase (public by design, RLS protects data)
- `VITE_SUPABASE_PROJECT_ID` - Project ID for helper functions (optional)
- `HTTP_PORT` - Port for Docker container (default 8080)

**Required env vars (Edge Functions - via `supabase secrets set`):**
- `SUPABASE_SERVICE_ROLE_KEY` - Admin API key for create-user, delete-user, list-users
- `OPENAI_API_KEY` - For transcribe-audio function
- `LOVABLE_API_KEY` - For summarize-meeting function
- `SUPABASE_URL` - Automatically injected by Supabase runtime (intra-service communication)
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically injected by Supabase runtime

**Secrets location:**
- `.env` file (NOT committed) — locally loaded for development
- `.env.example` — template with var names and descriptions (committed for reference)
- Supabase Secrets Manager — Edge Function secrets set via CLI, not in code

**Config files:**
- `src/integrations/supabase/client.ts` — Reads VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from import.meta.env
- Edge Functions: Secrets read via `Deno.env.get()` (e.g., in transcribe-audio, create-user)

## Third-Party Integrations

**Design System:**
- Specify.com integration (`.specify/` directory)
  - Config files: feature.json, init-options.json, integration.json
  - Purpose: Design token sync and component library management
  - Token usage: Tailwind CSS HSL variables for colors, shadows, typography

**Component Libraries:**
- shadcn/ui — Component library built on Radix UI (no npm package, copy-paste components likely in `src/components/ui/`)
- Lucide Icons — 0.462.0 (icon library)

**Drag & Drop:**
- dnd-kit — Headless drag-and-drop (used for job pipeline Kanban, PDI reordering, etc.)

**Charts:**
- Recharts 2.15.4 — Data visualization for performance KPIs, org indicators, nine-box grids

## API Rate Limits & Quotas

**Supabase:**
- Free tier limits apply (if on free plan) or enterprise quota (if on paid project)
- Connection pooling: Not explicitly configured (using Supabase defaults)

**OpenAI (transcribe-audio):**
- Rate limit: Dependent on API key plan (likely paid tier for production)
- Quotas: Monthly billing via OpenAI dashboard

**Lovable AI (summarize-meeting):**
- Rate limit: Dependent on API key tier
- Quotas: Managed via Lovable dashboard

---

*Integration audit: 2026-04-27*
