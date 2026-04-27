# Testing Patterns

**Analysis Date:** 2026-04-27

## Test Framework

**Status:** **NO TESTING FRAMEWORK DETECTED**

This is a critical gap. No test runner is configured and no `.test.ts`, `.spec.ts`, or test directories exist in the codebase.

**What Would Be Needed:**
- Test runner: Vitest (Vite-native, lightweight) or Jest (industry standard)
- Assertion library: Vitest includes `expect()` or add `chai`/`assert`
- React testing: `@testing-library/react` for component testing
- Mocking: `vitest` includes `vi.mock()` or MSW (Mock Service Worker) for API mocking

**Current Setup:**
- No test dependencies in `package.json`
- No test config files: no `vitest.config.ts`, `jest.config.ts`, or test directory
- ESLint configured but not enforcing test coverage
- `package.json` scripts: only `dev`, `build`, `build:dev`, `lint`, `preview` — no `test` or `test:watch`

## Test File Organization

**Current State:**
- **No test files exist** in the codebase
- No co-located `.test.tsx` files alongside components
- No separate `tests/` or `__tests__/` directories
- No E2E test framework (Playwright, Cypress) detected

**Recommended Structure (if tests are added):**
- Co-locate: `src/components/Header.tsx` + `src/components/Header.test.tsx`
- Hooks: `src/hooks/useAuth.ts` + `src/hooks/useAuth.test.ts`
- Pages: `src/pages/Auth.tsx` + `src/pages/Auth.test.tsx`
- Utilities: `src/lib/supabaseError.ts` + `src/lib/supabaseError.test.ts`

## What IS Currently Tested

**Type Checking:**
- TypeScript (`typescript-eslint`) provides static type validation
- Strict mode disabled, but type annotations enforced on component props and hooks
- Linting via ESLint catches some issues at development time

**Manual Testing:**
- Development server: `npm run dev` (Vite with hot reload)
- Visual verification in browser
- Console logging for debugging

## Testing Patterns (NONE - Documentation for Future Implementation)

**Recommended Pattern (Vitest with React Testing Library):**

```typescript
// src/hooks/useAuth.test.ts
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "./useAuth";
import { vi } from "vitest";

describe("useAuth", () => {
  it("should load user session on mount", async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("should set user role from database", async () => {
    // Mock supabase.auth.onAuthStateChange
    // Assert role is fetched and set
  });
});
```

**Recommended Pattern (Component Testing):**

```typescript
// src/components/Header.test.tsx
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Header } from "./Header";
import { vi } from "vitest";

describe("Header", () => {
  it("should render breadcrumbs", () => {
    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );

    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument();
  });

  it("should call onToggleSidebar when menu button clicked", async () => {
    const onToggle = vi.fn();
    const { user } = render(
      <BrowserRouter>
        <Header onToggleSidebar={onToggle} />
      </BrowserRouter>
    );

    // Click sidebar toggle and assert callback fired
  });
});
```

**Recommended Pattern (Utility Function Testing):**

```typescript
// src/lib/supabaseError.test.ts
import { formatSupabaseError, handleSupabaseError } from "./supabaseError";
import { describe, it, expect, vi } from "vitest";

describe("formatSupabaseError", () => {
  it("should map PostgreSQL error codes to friendly messages", () => {
    const error = { code: "23505", message: "duplicate key" };
    const result = formatSupabaseError(error);
    expect(result).toBe("Registro duplicado. Verifique se já não existe.");
  });

  it("should return fallback message for unknown codes", () => {
    const error = { code: "UNKNOWN", message: "Something broke" };
    const result = formatSupabaseError(error);
    expect(result).toBe("Something broke");
  });
});
```

## Mocking

**Current Approach (Manual):**
- Supabase client: Imported directly in components/hooks (`import { supabase } from "@/integrations/supabase/client"`)
- No mocking library configured
- Custom localStorage mocking: `useAuth` hook uses window.localStorage directly (would need `vi.stubGlobal()` in tests)

**Recommended Mocking Strategy:**

**Supabase Mocking:**
```typescript
// vitest.setup.ts or test file
import { vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
    from: vi.fn((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));
```

**React Query Mocking:**
```typescript
// Wrap tests with QueryClientProvider for TanStack Query tests
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);
```

**localStorage/window Mocking:**
```typescript
beforeEach(() => {
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
```

**What to Mock:**
- Supabase client methods (auth, database queries)
- TanStack Query hooks
- localStorage / sessionStorage
- window.dispatchEvent (for custom events like `lt:view-as-role-changed`)

**What NOT to Mock:**
- React hooks (use actual hooks where possible)
- Component library exports (Radix UI, Lucide icons)
- Utility functions like `cn()` — test them directly

## Fixtures and Factories

**Current State:** No fixtures or test data factories exist.

**Recommended Location:** `src/__fixtures__/` or `src/test/factories/`

**Example Fixture Structure:**

```typescript
// src/__fixtures__/users.ts
export const mockUser = {
  id: "user-123",
  email: "test@example.com",
  user_metadata: { role: "colaborador" },
};

export const mockAdmin = {
  id: "admin-123",
  email: "admin@example.com",
  user_metadata: { role: "admin" },
};

// src/__fixtures__/evaluations.ts
export const mockEvaluation = {
  id: "eval-123",
  user_id: "user-123",
  evaluator_id: "admin-123",
  overall_score: 3,
  technical_score: 3,
  behavioral_score: 3,
  leadership_score: 3,
  created_at: new Date().toISOString(),
};

// src/__fixtures__/plans.ts
export const mockPlan: KanbanPlan = {
  id: "plan-123",
  title: "Melhorar comunicação",
  status: "in_progress",
  development_area: "Liderança",
  progress_percentage: 50,
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  user: { id: "user-123", full_name: "João Silva", avatar_url: null },
};
```

## Coverage

**Status:** **No coverage configured**

**Recommendations:**

Add to `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/__fixtures__/",
        "**/*.d.ts",
      ],
      lines: 70,      // Enforce 70% line coverage
      functions: 70,
      branches: 60,
      statements: 70,
    },
  },
});
```

**View Coverage:**
```bash
npm run test:coverage
```

## Test Types

**Unit Tests (Recommended Priority):**
- Scope: Individual functions, hooks, utilities
- Approach: Test input → output in isolation
- Files to prioritize:
  - `src/lib/supabaseError.ts` — error mapping logic
  - `src/hooks/useAuth.ts` — complex state management with localStorage sync
  - `src/hooks/useEvaluations.ts` — data transformation
  - Utility functions in `src/lib/`

**Integration Tests (Secondary Priority):**
- Scope: Hook + Supabase interaction, component + hook interaction
- Approach: Render component with mocked Supabase, verify data flow
- Files to prioritize:
  - `src/components/Header.tsx` with breadcrumb routing
  - `src/components/KanbanCard.tsx` with dnd-kit interaction
  - `src/pages/Auth.tsx` with full auth flow

**E2E Tests (Not Currently Configured):**
- Framework: None configured (Playwright recommended)
- Scope: User workflows across pages (login → navigate → submit form)
- Not required for MVP but valuable for hire/onboarding flows

## Common Patterns

**Async Testing (with Vitest):**

```typescript
it("should fetch user data", async () => {
  const { result } = renderHook(() => useAuth());

  // Wait for state to update
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.user).toBeDefined();
});

// Alternative: using then() with expect()
it("should resolve async operation", () => {
  return fetchUserRole("user-123").then((role) => {
    expect(role).toBe("admin");
  });
});
```

**Error Testing:**

```typescript
it("should handle Supabase RLS errors", () => {
  const rslError = { code: "42501", message: "permission denied" };
  const result = formatSupabaseError(rslError);
  expect(result).toBe("Você não tem permissão para essa operação.");
});

it("should throw on null data", () => {
  expect(() => throwOnError(null, null, "Failed")).toThrow();
});
```

**Hook Testing (with Dependencies):**

```typescript
it("should update viewAsRole on storage change", () => {
  const { result } = renderHook(() => useAuth());

  // Simulate cross-tab storage change
  act(() => {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "lt:viewAsRole",
        newValue: "socio",
      })
    );
  });

  expect(result.current.viewAsRole).toBe("socio");
});
```

## Test Dependencies to Add

**Recommended package.json additions:**

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@vitest/ui": "^1.0.0",
    "jsdom": "^23.0.0"
  }
}
```

**vitest.config.ts:**
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      lines: 70,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

## Coverage Gaps (CRITICAL)

**Untested Areas (High Risk):**
- `src/hooks/useAuth.ts` — Complex multi-effect state management with localStorage sync and cross-tab communication. Risk: Silent auth state inconsistency, view-as-role overrides failing silently.
- `src/lib/supabaseError.ts` — Error code mapping. Risk: Users see raw SQL errors instead of friendly messages.
- `src/components/KanbanCard.tsx` — Drag-and-drop with dnd-kit. Risk: Undetected interaction bugs in card dragging.
- `src/pages/Auth.tsx` — Full signup/login flow with role-based redirect. Risk: Auth loops, incorrect role redirects.
- `src/hooks/useEvaluations.ts` — Competency score mapping and averaging. Risk: Wrong scores saved to database.
- All `hiring/` related hooks and components — Recently added, untested.

**Priority for First Tests:**
1. `formatSupabaseError()` — Quick win, high value
2. `useAuth()` — Complex, critical to app stability
3. `Auth.tsx` page — User-facing login flow
4. `KanbanCard.tsx` — Core hiring pipeline interaction

---

*Testing analysis: 2026-04-27*

**Key Takeaway:** Testing infrastructure needs to be set up from scratch. Recommended starting point:
1. Add Vitest + React Testing Library to package.json
2. Configure vitest.config.ts with jsdom environment
3. Create `src/test/setup.ts` for common mocks (Supabase, localStorage)
4. Write tests for utility functions first (no dependencies), then hooks, then components
5. Target 70% line coverage as minimum baseline
