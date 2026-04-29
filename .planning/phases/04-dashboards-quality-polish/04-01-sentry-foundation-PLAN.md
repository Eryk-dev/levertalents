---
phase: 04-dashboards-quality-polish
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/main.tsx
  - src/App.tsx
  - src/app/providers/ScopeProvider.tsx
  - src/components/admin/SessionReplayToggle.tsx
  - src/pages/AdminDashboard.tsx
  - .env.example
autonomous: true
requirements:
  - QUAL-06
  - QUAL-01
tags:
  - sentry
  - observability
  - pii
  - phase-4

must_haves:
  truths:
    - "Sentry is initialized at app boot before React renders"
    - "Every Sentry event is run through the same redact() function used by logger.ts (single source of truth for PII rules)"
    - "Session replay is OFF by default; when toggled ON, all text and inputs are masked"
    - "Sentry user.email and user.full_name are never sent — only user.id"
    - "Each Sentry event carries scope_id and scope_kind tags so events can be filtered per company/group"
    - "ErrorBoundary tree captures render errors into Sentry without changing existing fallback UI"
    - "npm test still exits 0 after the Sentry import is added (no test-side regressions)"
  artifacts:
    - path: src/main.tsx
      provides: "Sentry.init({ ..., beforeSend: (e) => redact(e), enabled: !import.meta.env.DEV, replay default off }) BEFORE createRoot"
      contains: "Sentry.init"
    - path: src/App.tsx
      provides: "Sentry.ErrorBoundary wrapping the existing <ErrorBoundary> tree (defense-in-depth)"
      contains: "Sentry.ErrorBoundary"
    - path: src/app/providers/ScopeProvider.tsx
      provides: "useEffect that calls Sentry.setTag('scope_id', scope.id) and Sentry.setTag('scope_kind', scope.kind) when scope resolves"
      contains: "Sentry.setTag"
    - path: src/components/admin/SessionReplayToggle.tsx
      provides: "shadcn Switch component with default OFF, with maskAllText/maskAllInputs warning banner when ON"
      contains: "Switch"
    - path: .env.example
      provides: "VITE_SENTRY_DSN placeholder"
      contains: "VITE_SENTRY_DSN"
  key_links:
    - from: "src/main.tsx Sentry.init beforeSend"
      to: "src/lib/logger.ts redact()"
      via: "import { redact } from '@/lib/logger'"
      pattern: 'import\s*\{[^}]*redact[^}]*\}\s*from\s*["@]/?lib/logger'
    - from: "src/App.tsx"
      to: "@sentry/react ErrorBoundary"
      via: "wraps existing <ErrorBoundary>"
      pattern: "Sentry\\.ErrorBoundary"
    - from: "src/app/providers/ScopeProvider.tsx"
      to: "@sentry/react setTag"
      via: "useEffect on scope resolve"
      pattern: "Sentry\\.setTag"
---

<objective>
Wire Sentry observability into the app entry point with the canonical redact() function from src/lib/logger.ts as beforeSend. Add scope_id/scope_kind tags via ScopeProvider for per-company filtering. Add a Session Replay toggle in AdminDashboard that defaults OFF and masks all content when ON. This plan is foundational for Phase 4 — D-XX threats T-DASH-PII (Sentry leaking email/CPF/nome/salário) are mitigated here. Reuses existing redact() — DOES NOT duplicate the PII keys list.

Purpose: Activate observability with PII safety on day one. Other Phase 4 plans (RPC, Cmd+K, dashboard refactor, tests) will run alongside this with no file conflicts.
Output: Sentry events flowing in production builds with PII scrubbed; replay toggle visible to admin; ErrorBoundary captures render errors.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/04-dashboards-quality-polish/04-CONTEXT.md
@.planning/phases/04-dashboards-quality-polish/04-PATTERNS.md
@.planning/phases/04-dashboards-quality-polish/04-UI-SPEC.md
@CLAUDE.md
@src/lib/logger.ts
@src/main.tsx
@src/App.tsx
@src/app/providers/ScopeProvider.tsx

<interfaces>
<!-- The canonical redact function — DO NOT redefine PII_KEYS -->
From src/lib/logger.ts (lines 17-54):
```typescript
export function redact(value: unknown): unknown;
// Already redacts:
//  - PII_KEYS object keys: email, cpf, full_name, fullName, name, nome,
//    phone, telefone, salary, salario, birth_date, birthDate, data_nascimento
//  - String patterns: EMAIL_RE, CPF_RE, CPF_DIGITS_RE
```

From @sentry/react 10.50.0 (already in package.json):
```typescript
Sentry.init({
  dsn: string;
  environment?: string;
  enabled?: boolean;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  replaysOnErrorSampleRate?: number;
  integrations?: Integration[];
  beforeSend?: (event: ErrorEvent) => ErrorEvent | null;
});
Sentry.ErrorBoundary;     // React component wrapper
Sentry.setTag(key, value); // Set tag for subsequent events
Sentry.replayIntegration(opts); // { maskAllText, maskAllInputs, blockAllMedia }
```

ScopeProvider current shape (src/app/providers/ScopeProvider.tsx line 62):
```typescript
export function ScopeProvider({ children }: { children: ReactNode }) { ... }
// scope.id and scope.kind are already exposed via useScope()
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Sentry init in main.tsx + .env.example placeholder</name>
  <files>src/main.tsx, .env.example</files>
  <read_first>
    - src/main.tsx (current 5 lines — confirm it's the entry point)
    - src/lib/logger.ts (lines 17-54 — confirm redact signature and PII_KEYS — DO NOT duplicate)
    - .planning/phases/04-dashboards-quality-polish/04-PATTERNS.md (section 4 "Sentry init" — copy verbatim pattern from lines 308-333 of PATTERNS.md)
    - .planning/phases/04-dashboards-quality-polish/04-UI-SPEC.md (section "Surface 3: Session Replay Toggle" — confirms default OFF + maskAllText)
    - .env.example (so the new var is added in the right block)
  </read_first>
  <behavior>
    - In production build, when an error is thrown, Sentry.init was called with beforeSend that returned a sanitized event (event.request, event.extra, event.user.email all redacted)
    - In dev (import.meta.env.DEV=true), Sentry is NOT enabled (replay sample rate 0; enabled flag false)
    - replaysSessionSampleRate is 0 by default (LOCK from QUAL-06)
    - Sentry.replayIntegration is passed maskAllText: true, maskAllInputs: true, blockAllMedia: true so when replay is enabled by toggle, content is masked
  </behavior>
  <action>
    Edit src/main.tsx to add Sentry initialization BEFORE createRoot. The exact code:

    ```typescript
    import * as Sentry from "@sentry/react";
    import { createRoot } from "react-dom/client";
    import App from "./App.tsx";
    import { redact } from "./lib/logger";
    import "./index.css";

    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      enabled: !import.meta.env.DEV && Boolean(import.meta.env.VITE_SENTRY_DSN),
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,    // QUAL-06 LOCK — default OFF
      replaysOnErrorSampleRate: 0,    // never auto-record on error (privacy first)
      integrations: [
        Sentry.replayIntegration({
          maskAllText: true,
          maskAllInputs: true,
          blockAllMedia: true,
        }),
      ],
      beforeSend(event) {
        // QUAL-06 LOCK — beforeSend MUST scrub PII before any other config.
        // Reuses redact() from src/lib/logger.ts — single source of truth for PII keys.
        if (event.request) event.request = redact(event.request) as typeof event.request;
        if (event.extra) event.extra = redact(event.extra) as typeof event.extra;
        if (event.user) {
          // Strip email/name from Sentry user record; keep only id + scope tags.
          event.user = { id: event.user.id };
        }
        // Also redact breadcrumbs.data which often carries fetch payloads.
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map((b) =>
            b.data ? { ...b, data: redact(b.data) as typeof b.data } : b,
          );
        }
        return event;
      },
    });

    createRoot(document.getElementById("root")!).render(<App />);
    ```

    Add to .env.example (append at end of file, after the existing VITE_ vars):

    ```
    # Sentry — leave empty in dev to keep Sentry disabled. Provide DSN in production.
    VITE_SENTRY_DSN=
    ```
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -20 # build must succeed; check no "Cannot find module" or TS errors</automated>
  </verify>
  <acceptance_criteria>
    - Running `grep -n "Sentry.init(" src/main.tsx` returns exactly 1 match
    - Running `grep -n "import { redact } from" src/main.tsx` returns 1 match (redact imported from logger, NOT redefined)
    - Running `grep -c "PII_KEYS" src/main.tsx` returns 0 (NEVER duplicate the PII set; reuse logger's)
    - Running `grep -n "replaysSessionSampleRate: 0" src/main.tsx` returns 1 match (QUAL-06 default OFF lock)
    - Running `grep -n "maskAllText: true" src/main.tsx` returns 1 match
    - Running `grep -n "VITE_SENTRY_DSN" .env.example` returns 1 match
    - Running `npm run build 2>&1 | grep -E "(error|Error)"` returns no TypeScript or build errors (filter out the standard "0 errors" line)
  </acceptance_criteria>
  <done>main.tsx initializes Sentry with redact() as beforeSend, replay default off; .env.example documents VITE_SENTRY_DSN; production build still succeeds.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Sentry.ErrorBoundary wrap in App.tsx + scope tags in ScopeProvider</name>
  <files>src/App.tsx, src/app/providers/ScopeProvider.tsx</files>
  <read_first>
    - src/App.tsx (lines 1-100 to see existing ErrorBoundary at line 81 + closing at 336)
    - src/app/providers/ScopeProvider.tsx (find scope state declaration and the natural useEffect insertion point — likely after scope is resolved)
    - .planning/phases/04-dashboards-quality-polish/04-PATTERNS.md (section 4 — `Sentry.ErrorBoundary` wrap pattern lines 336-348 + scope tag pattern lines 350-360)
    - src/components/ErrorBoundary.tsx (so we know the existing fallback UI we're preserving)
  </read_first>
  <behavior>
    - When a render throws inside the React tree, Sentry.ErrorBoundary catches it AND the existing <ErrorBoundary> still renders the same fallback UI for the user
    - When scope changes (user picks different empresa/grupo), Sentry.setTag('scope_id', scope.id) and Sentry.setTag('scope_kind', scope.kind) are called so subsequent events carry the new tags
    - When scope is null (first render before resolve), no tag set — no-op
  </behavior>
  <action>
    1) In src/App.tsx, wrap the existing ErrorBoundary tree with Sentry.ErrorBoundary. Add at the top of imports:
    ```typescript
    import * as Sentry from "@sentry/react";
    ```

    Then, at line ~81 (the existing `<ErrorBoundary>` opening), wrap it. The transformation is:

    BEFORE:
    ```tsx
    <ErrorBoundary>
      <BrowserRouter>
        ...
      </BrowserRouter>
    </ErrorBoundary>
    ```

    AFTER:
    ```tsx
    <Sentry.ErrorBoundary fallback={({ error, resetError }) => (
      <ErrorBoundary>
        {/* SentryErrorBoundary already caught + reported; render the existing fallback */}
        <div style={{ display: 'none' }}>{String(error?.message ?? '')}</div>
      </ErrorBoundary>
    )}>
      <ErrorBoundary>
        <BrowserRouter>
          ...
        </BrowserRouter>
      </ErrorBoundary>
    </Sentry.ErrorBoundary>
    ```

    Rationale: the inner ErrorBoundary still catches and renders the existing fallback UI (preserving UX). Sentry.ErrorBoundary is the outer net for events that escape the inner one.

    2) In src/app/providers/ScopeProvider.tsx, add a useEffect that runs whenever scope.id or scope.kind change:

    ```typescript
    import * as Sentry from "@sentry/react";

    // Inside ScopeProvider component, after scope state is resolved:
    useEffect(() => {
      if (!scope) return;
      Sentry.setTag('scope_id', scope.id);
      Sentry.setTag('scope_kind', scope.kind);
    }, [scope?.id, scope?.kind]);
    ```

    Place this useEffect AFTER the existing scope resolution logic (read the file first to find the natural placement — likely near other scope-derived effects, before the return statement).
  </action>
  <verify>
    <automated>npm run lint && npm test 2>&1 | tail -30 # lint passes; tests still green (especially scope tests)</automated>
  </verify>
  <acceptance_criteria>
    - Running `grep -n "Sentry.ErrorBoundary" src/App.tsx` returns at least 1 match (open tag)
    - Running `grep -n "Sentry.setTag" src/app/providers/ScopeProvider.tsx` returns exactly 2 matches (scope_id + scope_kind)
    - Running `grep -n "import \* as Sentry" src/App.tsx` returns 1 match
    - Running `grep -n "import \* as Sentry" src/app/providers/ScopeProvider.tsx` returns 1 match
    - Existing `<ErrorBoundary>` wrap is preserved (the inner one still renders fallback): `grep -c "ErrorBoundary" src/App.tsx` returns ≥3 (import, open, close)
    - `npm test -- tests/scope/ScopeProvider.fallback.test.tsx tests/scope/useScopedQuery.test.tsx 2>&1 | tail -20` exits 0 (existing scope tests still pass)
  </acceptance_criteria>
  <done>Sentry.ErrorBoundary wraps the app tree as outer net; ScopeProvider sets scope_id/scope_kind tags reactively; existing scope tests stay green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: SessionReplayToggle component + mount in AdminDashboard</name>
  <files>src/components/admin/SessionReplayToggle.tsx, src/components/admin/SessionReplayToggle.test.tsx, src/pages/AdminDashboard.tsx</files>
  <read_first>
    - .planning/phases/04-dashboards-quality-polish/04-UI-SPEC.md (Surface 3 — Session Replay Toggle full spec including copy, default OFF, warning banner when ON)
    - src/components/ui/switch.tsx (shadcn Switch primitive — confirm props)
    - src/pages/AdminDashboard.tsx (find a sensible location to mount the toggle — likely a "Configurações" or settings section, or the bottom of the dashboard if no settings section)
    - tests/lib/logger.test.ts (test pattern reference for setup)
  </read_first>
  <behavior>
    - Test 1: default render — Switch is unchecked (OFF), warning banner is NOT visible
    - Test 2: clicking the Switch toggles state to ON; warning banner becomes visible with the exact copy "Replay ativo — todo conteúdo da tela é mascarado. Desative quando não precisar mais."
    - Test 3: when ON, calling Sentry.replayIntegration's start would happen (we mock @sentry/react and assert the call to a wrapper function, see action)
    - Test 4: clicking again toggles back to OFF; banner disappears
  </behavior>
  <action>
    Per UI-SPEC Surface 3:

    1) Create src/components/admin/SessionReplayToggle.tsx:

    ```typescript
    import { useState, useCallback } from 'react';
    import * as Sentry from '@sentry/react';
    import { Switch } from '@/components/ui/switch';

    /**
     * QUAL-06: Session replay toggle. Default OFF. When ON, Sentry replay
     * starts with maskAllText/maskAllInputs already configured in main.tsx
     * Sentry.init. UI-SPEC Surface 3 owns copy + visual contract.
     *
     * The toggle is local state for this rev (Phase 4 D-04 deferred);
     * future iteration may persist to user_preferences.
     */
    export function SessionReplayToggle() {
      const [enabled, setEnabled] = useState(false);

      const handleToggle = useCallback((next: boolean) => {
        setEnabled(next);
        const replay = Sentry.getReplay();
        if (next) {
          replay?.start();
        } else {
          replay?.stop();
        }
      }, []);

      return (
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="session-replay-toggle" className="text-[13px] font-normal text-text">
                Replay de sessão (Sentry)
              </label>
              <p className="text-[11px] font-normal text-text-muted">
                Quando ativo, sessões de uso são gravadas para debugging. Todo texto e dados são mascarados automaticamente.
              </p>
            </div>
            <Switch
              id="session-replay-toggle"
              checked={enabled}
              onCheckedChange={handleToggle}
            />
          </div>
          {enabled ? (
            <div className="mt-2 rounded-md border border-status-amber/30 bg-status-amber/10 p-2">
              <p className="text-[11px] font-normal text-status-amber">
                Replay ativo — todo conteúdo da tela é mascarado. Desative quando não precisar mais.
              </p>
            </div>
          ) : null}
        </div>
      );
    }
    ```

    2) Create src/components/admin/SessionReplayToggle.test.tsx:

    ```typescript
    import { describe, it, expect, vi, beforeEach } from 'vitest';
    import { render, screen, fireEvent } from '@testing-library/react';
    import { SessionReplayToggle } from './SessionReplayToggle';

    const startMock = vi.fn();
    const stopMock = vi.fn();

    vi.mock('@sentry/react', () => ({
      getReplay: () => ({ start: startMock, stop: stopMock }),
    }));

    describe('SessionReplayToggle (QUAL-06)', () => {
      beforeEach(() => {
        startMock.mockClear();
        stopMock.mockClear();
      });

      it('renders OFF by default with no warning banner', () => {
        render(<SessionReplayToggle />);
        const sw = screen.getByRole('switch');
        expect(sw).not.toBeChecked();
        expect(
          screen.queryByText(/Replay ativo/),
        ).not.toBeInTheDocument();
      });

      it('toggling ON shows warning and starts replay', () => {
        render(<SessionReplayToggle />);
        fireEvent.click(screen.getByRole('switch'));
        expect(screen.getByText(/Replay ativo — todo conteúdo da tela é mascarado/)).toBeInTheDocument();
        expect(startMock).toHaveBeenCalledTimes(1);
      });

      it('toggling OFF hides warning and stops replay', () => {
        render(<SessionReplayToggle />);
        const sw = screen.getByRole('switch');
        fireEvent.click(sw); // ON
        fireEvent.click(sw); // OFF
        expect(screen.queryByText(/Replay ativo/)).not.toBeInTheDocument();
        expect(stopMock).toHaveBeenCalledTimes(1);
      });
    });
    ```

    3) In src/pages/AdminDashboard.tsx, mount <SessionReplayToggle /> in a sensible location. Read the file first; place it inside an existing settings/config section if present, or add a small "Observabilidade" section near the bottom:

    ```tsx
    import { SessionReplayToggle } from '@/components/admin/SessionReplayToggle';
    // ...
    <section className="mt-8">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">Observabilidade</h2>
      <SessionReplayToggle />
    </section>
    ```
  </action>
  <verify>
    <automated>npm test -- src/components/admin/SessionReplayToggle.test.tsx 2>&1 | tail -20 # 3 tests pass</automated>
  </verify>
  <acceptance_criteria>
    - File src/components/admin/SessionReplayToggle.tsx exists; `grep -c "Replay de sessão (Sentry)" src/components/admin/SessionReplayToggle.tsx` returns 1
    - File src/components/admin/SessionReplayToggle.test.tsx exists; `npm test -- src/components/admin/SessionReplayToggle.test.tsx 2>&1 | grep -E "(passed|failed)"` shows 3 passed and 0 failed
    - `grep -n "useState(false)" src/components/admin/SessionReplayToggle.tsx` returns 1 match (default OFF lock)
    - `grep -n "<SessionReplayToggle" src/pages/AdminDashboard.tsx` returns 1 match (mounted in admin)
    - `grep -n "Replay ativo — todo conteúdo da tela é mascarado" src/components/admin/SessionReplayToggle.tsx` returns 1 match (exact UI-SPEC copy)
  </acceptance_criteria>
  <done>SessionReplayToggle exists with 3 passing tests, mounted in AdminDashboard, default OFF, exact UI-SPEC copy.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → Sentry SaaS | Untrusted PII may exit the app via Sentry events; beforeSend is the gate |
| client → React tree | Render errors from any descendant cross into the boundary |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01-01 | Information Disclosure | Sentry events | mitigate | beforeSend imports redact() from src/lib/logger.ts (single source of truth) — no duplication of PII_KEYS; user payload reduced to {id} only; breadcrumbs.data also redacted |
| T-04-01-02 | Information Disclosure | Sentry session replay | mitigate | replaysSessionSampleRate=0 (default OFF lock); replayIntegration configured with maskAllText/maskAllInputs/blockAllMedia so when toggled ON, content is masked |
| T-04-01-03 | Information Disclosure | Scope tags | accept | scope_id and scope_kind are non-PII identifiers (UUIDs and 'company'/'group') — useful for filtering events without leaking identity |
| T-04-01-04 | Tampering | Session replay toggle | accept | local state in admin UI; future iteration may persist with auth check; no security boundary today since admin is gated by ProtectedRoute |
| T-04-01-05 | Denial of Service | Sentry quota exhaustion | accept | tracesSampleRate=0.1 limits volume; replay default OFF prevents accidental quota burn |
</threat_model>

<verification>
- npm run build exits 0
- npm test exits 0 (existing tests stay green; new toggle test passes)
- npm run lint exits 0
- grep "PII_KEYS" src/main.tsx returns 0 (no PII duplication)
- grep "redact" src/main.tsx returns at least 2 matches (import + usage in beforeSend)
- grep "Sentry.setTag" src/app/providers/ScopeProvider.tsx returns 2 matches
</verification>

<success_criteria>
- Sentry initialized in main.tsx before createRoot, with beforeSend reusing redact()
- Replay default off (replaysSessionSampleRate: 0); when toggled on, all text/inputs masked
- Sentry.ErrorBoundary wraps the existing ErrorBoundary tree without changing fallback UI
- ScopeProvider sets scope_id/scope_kind tags reactively
- SessionReplayToggle: default OFF, warning banner with exact UI-SPEC copy when ON
- All existing tests still pass; new toggle test (3 cases) passes
</success_criteria>

<output>
After completion, create `.planning/phases/04-dashboards-quality-polish/04-01-SUMMARY.md` documenting:
- Files modified and the diff highlights
- Confirmation that grep for "PII_KEYS" in src/main.tsx returns 0
- Test results (npm test output for the new toggle test)
- Note any deviation from the planned action and why
</output>
