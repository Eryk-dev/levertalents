# Technology Stack

**Analysis Date:** 2026-04-27

## Languages

**Primary:**
- TypeScript 5.8 - Frontend application with strict type checking
- JavaScript (ES2020) - React/DOM runtime

**Secondary:**
- Deno (TypeScript runtime) - Supabase Edge Functions backend
- SQL - Postgres database via Supabase

## Runtime

**Environment:**
- Node.js 20 (Alpine) - Frontend build environment (referenced in `Dockerfile`)
- Deno - Supabase Edge Functions (server-side async operations)
- Browser - React 18.3.1 client

**Package Manager:**
- npm 10.x (implied by Node 20)
- Lockfile present: `package-lock.json` (243 KB, dated 2026-04-16)
- **INCONSISTENCY DETECTED:** `bun.lockb` also present (193 KB), indicates mixed package manager usage — npm is canonical (referenced in `Dockerfile` via `npm ci` and package.json as module type)

## Frameworks

**Core:**
- React 18.3.1 - Frontend UI framework
- react-dom 18.3.1 - DOM rendering
- react-router-dom 6.30.1 - Client-side routing
- Vite 5.4.19 - Frontend build tool and dev server

**UI Components:**
- @radix-ui (16+ packages) - Headless, accessible component primitives (Accordion, Alert Dialog, Avatar, Checkbox, Collapsible, Context Menu, Dialog, Dropdown Menu, Hover Card, Label, Menu Bar, Navigation Menu, Popover, Progress, Radio Group, Scroll Area, Select, Separator, Slider, Slot, Switch, Tabs, Toast, Toggle, etc.)
- shadcn/ui - Component library built on Radix UI

**Forms & Validation:**
- react-hook-form 7.61.1 - Form state management
- @hookform/resolvers 3.10.0 - Form resolver integrations
- zod 3.25.76 - TypeScript-first schema validation

**State & Data Fetching:**
- @tanstack/react-query 5.83.0 (TanStack Query) - Server state management and caching
- next-themes 0.3.0 - Theme persistence (dark mode support)

**Utilities & UI Enhancements:**
- lucide-react 0.462.0 - Icon library
- sonner 1.7.4 - Toast notifications
- embla-carousel-react 8.6.0 - Carousel/slider component
- react-day-picker 8.10.1 - Date picker primitive
- recharts 2.15.4 - Charting library for KPI dashboards
- date-fns 3.6.0 - Date utilities
- clsx 2.1.1 - Conditional className utility
- tailwind-merge 2.6.0 - Tailwind CSS class merging
- class-variance-authority 0.7.1 - CSS variant generation
- input-otp 1.4.2 - OTP input component
- cmdk 1.1.1 - Command menu/palette
- vaul 0.9.9 - Drawer/sheet component
- react-resizable-panels 2.1.9 - Resizable panel layout

**Drag & Drop:**
- @dnd-kit/core 6.3.1 - Headless drag-and-drop primitives
- @dnd-kit/sortable 10.0.0 - Sortable list addon
- @dnd-kit/utilities 3.2.2 - Utility functions

**Backend/API:**
- @supabase/supabase-js 2.75.0 - Supabase client library

**Development/Build:**
- @vitejs/plugin-react-swc 3.11.0 - Vite React plugin using SWC compiler
- postcss 8.5.6 - CSS transformation framework
- tailwindcss 3.4.17 - Utility-first CSS framework
- autoprefixer 10.4.21 - PostCSS plugin for vendor prefixes
- TypeScript 5.8.3 - Type checker and transpiler
- ESLint 9.32.0 - Linting
- @eslint/js 9.32.0 - ESLint base config
- typescript-eslint 8.38.0 - TypeScript-aware ESLint rules
- eslint-plugin-react-hooks 5.2.0 - React hooks linting
- eslint-plugin-react-refresh 0.4.20 - React Fast Refresh linting
- globals 15.15.0 - Global variable definitions for ESLint
- @types/node 22.16.5 - Node.js type definitions
- @types/react 18.3.23 - React type definitions
- @types/react-dom 18.3.7 - React DOM type definitions
- lovable-tagger 1.1.10 - Component tagging tool (development)

**Testing & QA:**
- No test framework currently configured (no jest.config.js, vitest.config.js, or test files detected)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.75.0 - Supabase client: authentication, database queries, realtime subscriptions, file storage
- react 18.3.1 - UI rendering core
- react-router-dom 6.30.1 - Multi-page navigation
- @tanstack/react-query 5.83.0 - Server state, caching, background refetching
- tailwindcss 3.4.17 - Styling system

**Infrastructure:**
- @radix-ui packages - Accessible component base layer (16 packages)
- recharts 2.15.4 - Data visualization for KPI dashboards
- react-hook-form 7.61.1 - Form handling and validation
- zod 3.25.76 - Runtime schema validation

## Configuration

**Environment:**
- **Frontend env vars:** Defined in `.env.example`
  - `VITE_SUPABASE_URL` - Supabase project URL (https://[PROJECT_ID].supabase.co)
  - `VITE_SUPABASE_PUBLISHABLE_KEY` - Anon/public key from Supabase (Row-Level Security protects data)
  - `VITE_SUPABASE_PROJECT_ID` - Optional, used by frontend helpers
  - `HTTP_PORT` - Port for Docker container (default 8080)

- **Backend/Edge Function env vars:** Managed via `supabase secrets set` (NOT in .env)
  - `SUPABASE_SERVICE_ROLE_KEY` - Used by create-user, delete-user, list-users functions
  - `OPENAI_API_KEY` - Used by transcribe-audio function
  - `LOVABLE_API_KEY` - Used by summarize-meeting function

- **Runtime Supabase secrets** (automatically injected into Edge Functions environment):
  - `SUPABASE_URL` - Intra-service Supabase URL
  - `SUPABASE_SERVICE_ROLE_KEY` - Admin authentication for Edge Functions

**Build:**
- `tsconfig.json` - TypeScript root config with path alias `@/*` → `./src/*`
- `tsconfig.app.json` - Frontend-specific TypeScript config
- `tsconfig.node.json` - Build tooling TypeScript config
- `vite.config.ts` - Vite build config with React SWC plugin, path alias
- `tailwind.config.ts` - Tailwind CSS customization (dark mode class toggle, custom colors, extended screens)
- `postcss.config.js` - PostCSS plugin pipeline (tailwindcss, autoprefixer)
- `eslint.config.js` - ESLint config with TypeScript and React Hooks rules
- `.specify/` - Specify design system integration configs (feature.json, init-options.json, integration.json)

**Linting/Formatting:**
- ESLint (flat config, no .prettierrc detected — formatting likely implicit via IDE or skipped)

## Build & Deployment

**Development:**
- `npm run dev` - Start Vite dev server on port 8080
- `npm run build` - Production build to `dist/`
- `npm run lint` - Run ESLint

**Docker Build (Multi-stage):**
- **Stage 1 (build):** Node 20 Alpine
  - Installs dependencies via `npm ci`
  - Builds Vite bundle with VITE_* args injected at build time
  - Output: `/app/dist/`

- **Stage 2 (runtime):** Nginx 1.27 Alpine
  - Serves static assets from `dist/` 
  - SPA routing via `try_files $uri $uri/ /index.html` fallback
  - Healthcheck: GET `/healthz` endpoint
  - Gzip compression enabled (level 6, min 1024B)
  - Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
  - Cache headers: 1-year immutable for `/assets/*`, no-cache for `index.html`

**Docker Compose:**
- `docker-compose.yml` - Single web service
  - Image: `levertalents/web:latest`
  - Build args: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID
  - Port mapping: ${HTTP_PORT:-8080}:80
  - Restart policy: unless-stopped
  - Healthcheck from container

**Nginx Config:**
- `nginx.conf` - Custom server block
  - Serves from `/usr/share/nginx/html` (Vite dist)
  - Gzip compression for text/css/js/json/xml/svg/fonts
  - SPA routing fallback
  - Asset caching strategy (1-year immutable for hashed files)
  - Security headers applied

## Platform Requirements

**Development:**
- Node.js 20+
- npm 10.x
- (Optional) bun (lockb detected but npm is canonical)

**Production:**
- Docker 20.10+
- Docker Compose 2.0+ (if using docker-compose.yml)
- Docker daemon accessible
- Nginx 1.27+ (built into image)

**External Dependencies (Runtime):**
- Supabase cloud instance (project ID: ehbxpbeijofxtsbezwxd, migrated 2026-04-23)
  - Postgres database
  - Auth service (JWT token-based)
  - Realtime subscriptions
  - Storage API
  - Edge Functions (Deno runtime)

---

*Stack analysis: 2026-04-27*
