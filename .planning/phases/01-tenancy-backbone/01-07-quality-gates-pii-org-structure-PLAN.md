---
phase: 1
plan: 07
type: execute
wave: 2
depends_on: [05, 06]
files_modified:
  - eslint-rules/no-supabase-from-outside-hooks.js
  - eslint-rules/no-supabase-from-outside-hooks.test.js
  - eslint.config.js
  - src/lib/logger.ts
  - src/lib/formatBR.ts
  - tests/lib/logger.test.ts
  - tests/lib/formatBR.test.ts
  - src/hooks/useAuth.ts
  - src/features/org-structure/components/OrgUnitTree.tsx
  - src/features/org-structure/components/OrgUnitForm.tsx
  - src/features/org-structure/hooks/useOrgUnits.ts
  - src/features/org-structure/hooks/useOrgUnitMutations.ts
  - src/pages/CompanyOrgStructure.tsx
  - src/App.tsx
autonomous: true
requirements: [QUAL-07, QUAL-08, QUAL-10, AUTH-04, AUTH-05, ORG-08]
---

# Plan 07: Quality Gates + PII Logger + ORG-08 Structure UI

<objective>
Final Wave 2 plan. Ship four quality gates:
1. **ESLint custom rule `no-supabase-from-outside-hooks`** (QUAL-07) — blocks raw `supabase.from()` outside `src/hooks/`, `src/integrations/`, `src/shared/data/`, `src/features/*/hooks/`. Allowlist of 16 legacy files coexists with TODO markers.
2. **`@tanstack/eslint-plugin-query` flat/recommended config** (QUAL-08) — built-in `exhaustive-deps`, `stable-query-client`, etc.
3. **PII-stripping `logger.ts` wrapper** (AUTH-04, AUTH-05) — DEV passes through; PROD redacts email/CPF/full_name/UUID.
4. **`date-fns-tz` `formatBR` util** (QUAL-10) — São Paulo timezone formatter, replaces `toLocaleString` anti-pattern.

Plus the **ORG-08 UI**: `/empresas/:id/estrutura` page with `OrgUnitTree` (indented `<ul>` tree) + `OrgUnitForm` (create/rename/delete + assign líder/membro) — the minimal-functional-CRUD recommended in RESEARCH.md Q3.

Plus update `useAuth.ts` `AppRole` type to add `'liderado'` (RBAC-01 frontend side, complements the DB enum addition in Plan 03 task 03-01).
</objective>

<requirements_addressed>
- **QUAL-07**: Custom ESLint rule blocks `supabase.from()` outside the allowed paths; `error` severity from PR 1; 12 legacy file allowlist with TODO markers.
- **QUAL-08**: `@tanstack/eslint-plugin-query` flat/recommended adds `exhaustive-deps`, `stable-query-client`, `no-rest-destructuring`, `no-unstable-deps`.
- **QUAL-10**: `formatBR(ts, fmt)` formats `timestamptz` in `America/Sao_Paulo` with pt-BR locale (date-fns-tz).
- **AUTH-04**: `logger.ts` strips email/CPF/full_name/uuid in PROD via `beforeSend`-style redaction. New code uses `logger.*` exclusively.
- **AUTH-05**: Console limpo de PII em produção — wrapper redacts known keys + email/CPF regex.
- **ORG-08**: `/empresas/:id/estrutura` page with create/rename/delete org_units, assign líder/membro. Indented `<ul>` tree (no `react-arborist` per Q3 recommendation).
- **RBAC-01** (frontend): `AppRole` type now includes `'liderado'` synonym alongside `'colaborador'`.
</requirements_addressed>

<threat_model>
- **T-1-04 (MEDIUM) — PII in logs / Sentry without scrubbing:** Mitigated by `logger.ts` wrapper redacting `PII_KEYS` in objects + email/CPF regex in strings (PROD only; DEV passes through for debugging).
- **T-1-05 (MEDIUM) — ESLint guard bypass:** Mitigated by `error`-severity ESLint rule running in CI (Plan 01 task 01-05 added the workflow). Allowlist is hardcoded in the rule (no per-file `// eslint-disable` comments allowed except via the explicit allowlist regex).
- **T-1-04 sub (Sentry):** Sentry init is Phase 4 — Phase 1 only ships the package install (Plan 01 task 01-01) and the logger wrapper. The wrapper's `redact()` function will be reused as Sentry `beforeSend` in Phase 4.
</threat_model>

<tasks>

<task id="07-01">
<action>
Create the custom ESLint rule and wire it into `eslint.config.js`. Also enable `@tanstack/eslint-plugin-query` flat/recommended.

**File 1: `eslint-rules/no-supabase-from-outside-hooks.js`**

Use CommonJS (per RESEARCH.md PATTERNS.md — flat config supports CJS modules). The rule:
- Walks every `CallExpression` in the AST.
- If the callee is `MemberExpression` with `object.name === 'supabase'` and `property.name === 'from'` AND the source file is NOT in the allowed-path regex set AND NOT in the legacy allowlist → reports an error.

```javascript
// eslint-rules/no-supabase-from-outside-hooks.js
/**
 * Block direct calls to supabase.from(...) outside hooks/, integrations/,
 * shared/data/, and features/*/hooks/. Forces feature code through
 * useScopedQuery — the chokepoint that guarantees scope.id is part of
 * every queryKey (TEN-06, TEN-10, P4 mitigation).
 *
 * QUAL-07.
 */

'use strict';

const ALLOWED_PATH_PATTERNS = [
  /\/src\/hooks\//,
  /\/src\/integrations\//,
  /\/src\/shared\/data\//,
  /\/src\/features\/[^/]+\/hooks\//,
  /\/src\/lib\/hiring\/rlsScope\.ts$/,
];

// Phase 1 legacy allowlist — TECH DEBT, addressed in Phase 2-3 by moving
// each call to a hook in src/hooks/ or src/features/X/hooks/.
// EVERY entry MUST have an open issue tracking the cleanup.
const PHASE_1_LEGACY_ALLOWLIST = [
  /\/src\/components\/ManualPDIForm\.tsx$/,            // TODO(#legacy-1)
  /\/src\/components\/hiring\/PipelineFilters\.tsx$/,  // TODO(#legacy-2)
  /\/src\/components\/hiring\/JobOpeningForm\.tsx$/,   // TODO(#legacy-3)
  /\/src\/components\/company\/CompanyDrawer\.tsx$/,   // TODO(#legacy-4)
  /\/src\/pages\/Index\.tsx$/,                         // TODO(#legacy-5)
  /\/src\/pages\/CompanyManagement\.tsx$/,             // TODO(#legacy-6)
  /\/src\/pages\/Climate\.tsx$/,                       // TODO(#legacy-7)
  /\/src\/pages\/MyTeam\.tsx$/,                        // TODO(#legacy-8)
  /\/src\/pages\/Profile\.tsx$/,                       // TODO(#legacy-9)
  /\/src\/pages\/DevelopmentKanban\.tsx$/,             // TODO(#legacy-10)
  /\/src\/pages\/AdminDashboard\.tsx$/,                // TODO(#legacy-11)
  /\/src\/pages\/hiring\/JobOpenings\.tsx$/,           // TODO(#legacy-12)
];

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow direct supabase.from(...) outside hooks/, integrations/, shared/data/, features/*/hooks/. Forces consumers through useScopedQuery.',
    },
    schema: [],
    messages: {
      forbidden:
        'Move supabase.from() into a hook in src/hooks/ or src/features/X/hooks/, then consume via useScopedQuery (QUAL-07).',
    },
  },
  create(context) {
    const filename =
      typeof context.filename === 'string'
        ? context.filename
        : context.getFilename();

    if (ALLOWED_PATH_PATTERNS.some((p) => p.test(filename))) return {};
    if (PHASE_1_LEGACY_ALLOWLIST.some((p) => p.test(filename))) return {};

    return {
      "CallExpression > MemberExpression[object.name='supabase'][property.name='from']"(node) {
        context.report({ node, messageId: 'forbidden' });
      },
    };
  },
};
```

**File 2: `eslint-rules/no-supabase-from-outside-hooks.test.js`**

Self-test using ESLint's `RuleTester`:

```javascript
'use strict';

const { RuleTester } = require('eslint');
const rule = require('./no-supabase-from-outside-hooks.js');

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2020, sourceType: 'module' },
});

tester.run('no-supabase-from-outside-hooks', rule, {
  valid: [
    {
      code: 'supabase.from("companies").select()',
      filename: '/repo/src/hooks/useCompanies.ts',
    },
    {
      code: 'supabase.from("companies").select()',
      filename: '/repo/src/integrations/supabase/client.ts',
    },
    {
      code: 'supabase.from("companies").select()',
      filename: '/repo/src/features/tenancy/hooks/useVisibleScopes.ts',
    },
    {
      code: 'supabase.from("companies").select()',
      filename: '/repo/src/shared/data/useScopedQuery.ts',
    },
    {
      // Legacy allowlist
      code: 'supabase.from("companies").select()',
      filename: '/repo/src/pages/Index.tsx',
    },
  ],
  invalid: [
    {
      code: 'supabase.from("companies").select()',
      filename: '/repo/src/components/MyComponent.tsx',
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: 'const x = supabase.from("companies");',
      filename: '/repo/src/pages/MyNewPage.tsx',
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: 'function x() { return supabase.from("a").eq(); }',
      filename: '/repo/src/components/scope/ScopeTrigger.tsx',
      errors: [{ messageId: 'forbidden' }],
    },
  ],
});

console.log('no-supabase-from-outside-hooks rule passes self-tests');
```

**File 3: edit `eslint.config.js`** — add the custom rule + `@tanstack/eslint-plugin-query` flat/recommended.

Read the current `eslint.config.js` (26 lines). Apply the following edits:

1. Add imports after line 5:
```javascript
import pluginQuery from '@tanstack/eslint-plugin-query';
import noSupabaseFromOutsideHooks from './eslint-rules/no-supabase-from-outside-hooks.js';
```
2. Append `...pluginQuery.configs['flat/recommended']` to the `extends` array on line 10.
3. Add `lever: { rules: { 'no-supabase-from-outside-hooks': noSupabaseFromOutsideHooks } }` to the `plugins` block.
4. Add `'lever/no-supabase-from-outside-hooks': 'error'` to the `rules` block.

Final shape (illustrative — preserve existing structure):

```javascript
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import pluginQuery from '@tanstack/eslint-plugin-query';
import noSupabaseFromOutsideHooks from './eslint-rules/no-supabase-from-outside-hooks.js';

export default tseslint.config(
  { ignores: ['dist', 'eslint-rules'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...pluginQuery.configs['flat/recommended'],
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      lever: {
        rules: {
          'no-supabase-from-outside-hooks': noSupabaseFromOutsideHooks,
        },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': 'off',
      'lever/no-supabase-from-outside-hooks': 'error',
    },
  },
);
```

After editing, verify:
1. The rule self-test passes: `node eslint-rules/no-supabase-from-outside-hooks.test.js` exits 0.
2. `npm run lint` runs without crashing (it may report errors against legacy code if the allowlist is incomplete — that's acceptable; ALL existing offending files MUST be in the allowlist).
3. Run `npm run lint -- --max-warnings=0 src/features/ src/app/ src/shared/ src/components/scope/` — these new directories MUST have zero violations.
</action>
<read_first>
- `eslint.config.js` — current 26 lines.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 1410-1503 — full ESLint rule + config.
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 786-828 — analog (none — Wave 0 establishment).
- Quick grep to verify all 12 legacy allowlist files actually exist: `for p in src/components/ManualPDIForm.tsx src/components/hiring/PipelineFilters.tsx src/components/hiring/JobOpeningForm.tsx src/components/company/CompanyDrawer.tsx src/pages/Index.tsx src/pages/CompanyManagement.tsx src/pages/Climate.tsx src/pages/MyTeam.tsx src/pages/Profile.tsx src/pages/DevelopmentKanban.tsx src/pages/AdminDashboard.tsx src/pages/hiring/JobOpenings.tsx; do test -f "$p" && echo "OK $p" || echo "MISS $p"; done`. If a file in the allowlist doesn't exist, remove it (it's stale).
- Quick grep `grep -rln "supabase\.from(" src/components src/pages 2>/dev/null` — verify no other file outside the allowlist directly calls `supabase.from()`. If new offenders exist, add them to the allowlist with TODO numbers.
</read_first>
<acceptance_criteria>
- File `eslint-rules/no-supabase-from-outside-hooks.js` exists and exports a rule object with `meta.type === 'problem'`, `meta.messages.forbidden`, and `create(context)` function.
- File `eslint-rules/no-supabase-from-outside-hooks.test.js` exists.
- `node eslint-rules/no-supabase-from-outside-hooks.test.js` exits 0 (RuleTester throws on failure; success is silent).
- `eslint.config.js` imports `pluginQuery` from `@tanstack/eslint-plugin-query` and `noSupabaseFromOutsideHooks` from the rule file.
- `eslint.config.js` `extends` array includes `...pluginQuery.configs['flat/recommended']`.
- `eslint.config.js` `plugins` block includes `lever: { rules: { 'no-supabase-from-outside-hooks': noSupabaseFromOutsideHooks } }`.
- `eslint.config.js` `rules` block includes `'lever/no-supabase-from-outside-hooks': 'error'`.
- `npm run lint` exits 0 OR reports issues only in files within the legacy allowlist (no violations in `src/features/`, `src/app/`, `src/shared/`, or `src/components/scope/`).
- `npm run lint -- --max-warnings=0 src/features/ src/app/ src/shared/ src/components/scope/` exits 0.
</acceptance_criteria>
<files>
- `eslint-rules/no-supabase-from-outside-hooks.js`
- `eslint-rules/no-supabase-from-outside-hooks.test.js`
- `eslint.config.js`
</files>
<automated>
test -f eslint-rules/no-supabase-from-outside-hooks.js && node eslint-rules/no-supabase-from-outside-hooks.test.js && grep -q "no-supabase-from-outside-hooks" eslint.config.js && grep -q "@tanstack/eslint-plugin-query" eslint.config.js && grep -q "lever/no-supabase-from-outside-hooks" eslint.config.js && npm run lint -- --max-warnings=0 src/features/ src/app/ src/shared/ src/components/scope/
</automated>
</task>

<task id="07-02">
<action>
Create `src/lib/logger.ts` (PII-stripping wrapper, AUTH-04/05) and `src/lib/formatBR.ts` (date-fns-tz wrapper, QUAL-10), plus their tests.

**File 1: `src/lib/logger.ts`**

```typescript
/**
 * PII-aware logger wrapper.
 *
 * - DEV (`import.meta.env.DEV`): forwards untouched to console.* — full
 *   visibility for local debugging.
 * - PROD: redacts known PII fields in objects (`PII_KEYS`) and string-form
 *   email + CPF patterns. Phase 4 (QUAL-06) will replace this with
 *   Sentry beforeSend integration; the redact() function is the same.
 *
 * AUTH-04, AUTH-05.
 *
 * Adoption: new code in Phase 1 uses logger.* exclusively. The 6+ existing
 * console.log/error sites flagged in CONCERNS.md stay until Phase 4
 * polish (per RESEARCH.md Gate 4 adoption strategy).
 */

const PII_KEYS = new Set([
  'email',
  'cpf',
  'full_name',
  'fullName',
  'name',
  'nome',
  'phone',
  'telefone',
  'salary',
  'salario',
  'birth_date',
  'birthDate',
  'data_nascimento',
]);

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

export function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(EMAIL_RE, '[email-redacted]')
      .replace(CPF_RE, '[cpf-redacted]');
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = PII_KEYS.has(k) ? '[redacted]' : redact(v);
    }
    return out;
  }
  return value;
}

const isDev =
  typeof import.meta !== 'undefined' &&
  Boolean((import.meta as ImportMeta).env?.DEV);

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
      return;
    }
    console.log(...args.map(redact));
  },
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
      return;
    }
    console.warn(...args.map(redact));
  },
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
      return;
    }
    console.error(...args.map(redact));
  },
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
    // No-op in production
  },
};
```

**File 2: `src/lib/formatBR.ts`**

```typescript
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const TZ = 'America/Sao_Paulo';

/**
 * Format any timestamp/date in São Paulo timezone with PT-BR locale.
 * Replaces `new Date(x).toLocaleString('pt-BR', ...)` (browser-tz-dependent).
 *
 * QUAL-10.
 */
export function formatBR(
  input: string | Date | number | null | undefined,
  fmt = 'dd/MM/yyyy HH:mm',
): string {
  if (!input) return '';
  return formatInTimeZone(input, TZ, fmt, { locale: ptBR });
}

/** Date-only formatter (no time). */
export function formatBRDate(input: string | Date | number | null | undefined): string {
  return formatBR(input, 'dd/MM/yyyy');
}

/** Time-only formatter. */
export function formatBRTime(input: string | Date | number | null | undefined): string {
  return formatBR(input, 'HH:mm');
}

/** Relative format (e.g., "há 3 dias"). */
export function formatBRRelative(input: string | Date | number | null | undefined): string {
  if (!input) return '';
  const zoned = toZonedTime(input, TZ);
  const diff = (Date.now() - zoned.getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86_400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604_800) return `há ${Math.floor(diff / 86_400)} d`;
  return formatBRDate(zoned);
}
```

**File 3: `tests/lib/logger.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { redact } from '@/lib/logger';

describe('logger.redact()', () => {
  it('redacts email-like strings', () => {
    const result = redact('User foo@bar.com signed in');
    expect(result).toBe('User [email-redacted] signed in');
  });

  it('redacts CPF-like strings (formatted)', () => {
    expect(redact('CPF 123.456.789-00')).toBe('CPF [cpf-redacted]');
  });

  it('redacts CPF-like strings (unformatted)', () => {
    expect(redact('cpf=12345678900')).toBe('cpf=[cpf-redacted]');
  });

  it('redacts known PII keys in objects', () => {
    expect(redact({ email: 'a@b.com', cpf: '123', other: 'safe' })).toEqual({
      email: '[redacted]',
      cpf: '[redacted]',
      other: 'safe',
    });
  });

  it('redacts full_name + nome variants', () => {
    expect(redact({ full_name: 'João Silva', fullName: 'Maria', nome: 'Pedro' })).toEqual({
      full_name: '[redacted]',
      fullName: '[redacted]',
      nome: '[redacted]',
    });
  });

  it('redacts deeply nested PII', () => {
    expect(
      redact({
        user: { profile: { email: 'a@b.com', name: 'Foo', age: 30 } },
      }),
    ).toEqual({
      user: { profile: { email: '[redacted]', name: '[redacted]', age: 30 } },
    });
  });

  it('handles arrays', () => {
    expect(redact(['user@a.com', 'safe'])).toEqual(['[email-redacted]', 'safe']);
  });

  it('passes through primitives', () => {
    expect(redact(42)).toBe(42);
    expect(redact(true)).toBe(true);
    expect(redact(null)).toBe(null);
  });
});
```

**File 4: `tests/lib/formatBR.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import {
  formatBR,
  formatBRDate,
  formatBRTime,
  formatBRRelative,
} from '@/lib/formatBR';

describe('formatBR', () => {
  it('formats UTC timestamp in São Paulo timezone (UTC-3 standard, UTC-3 DST same)', () => {
    // 2026-04-27T15:00:00Z in UTC = 2026-04-27 12:00 in São Paulo (UTC-3)
    expect(formatBR('2026-04-27T15:00:00Z')).toBe('27/04/2026 12:00');
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(formatBR(null)).toBe('');
    expect(formatBR(undefined)).toBe('');
    expect(formatBR('')).toBe('');
  });

  it('formats Date objects', () => {
    expect(formatBR(new Date('2026-01-01T03:00:00Z'))).toBe('01/01/2026 00:00');
  });

  it('accepts a custom format string', () => {
    expect(formatBR('2026-04-27T15:00:00Z', 'yyyy')).toBe('2026');
  });
});

describe('formatBRDate', () => {
  it('returns date only', () => {
    expect(formatBRDate('2026-04-27T15:00:00Z')).toBe('27/04/2026');
  });
});

describe('formatBRTime', () => {
  it('returns time only', () => {
    expect(formatBRTime('2026-04-27T15:00:00Z')).toBe('12:00');
  });
});

describe('formatBRRelative', () => {
  it('returns "agora" for very recent timestamps', () => {
    expect(formatBRRelative(Date.now() - 30_000)).toBe('agora');
  });

  it('returns "há N min" for minute-old timestamps', () => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    expect(formatBRRelative(fiveMinAgo)).toMatch(/^há \d+ min$/);
  });

  it('returns empty for null', () => {
    expect(formatBRRelative(null)).toBe('');
  });
});
```

Run `npm test -- --run tests/lib/`. Both test files must pass.
</action>
<read_first>
- `src/lib/supabaseError.ts` — analog for utility module style.
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 1530-1622 — full logger.ts and formatBR.ts reference impl.
- `.planning/phases/01-tenancy-backbone/01-PATTERNS.md` lines 553-587 — analog references.
- `node_modules/date-fns-tz/package.json` — confirm `formatInTimeZone` and `toZonedTime` exports exist (Plan 01 task 01-01 installed `^3.2.0`).
- `node_modules/date-fns/locale/index.d.ts` — confirm `ptBR` is exported.
</read_first>
<acceptance_criteria>
- File `src/lib/logger.ts` exports `logger` (with `log`, `warn`, `error`, `debug`) and `redact` function.
- File `src/lib/formatBR.ts` exports `formatBR`, `formatBRDate`, `formatBRTime`, `formatBRRelative`.
- File `tests/lib/logger.test.ts` exists.
- File `tests/lib/formatBR.test.ts` exists.
- `npm test -- --run tests/lib/logger.test.ts` exits 0 with 8 tests passing.
- `npm test -- --run tests/lib/formatBR.test.ts` exits 0 with 8 tests passing.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
</acceptance_criteria>
<files>
- `src/lib/logger.ts`
- `src/lib/formatBR.ts`
- `tests/lib/logger.test.ts`
- `tests/lib/formatBR.test.ts`
</files>
<automated>
test -f src/lib/logger.ts && test -f src/lib/formatBR.ts && grep -q "redact" src/lib/logger.ts && grep -q "formatInTimeZone" src/lib/formatBR.ts && grep -q "America/Sao_Paulo" src/lib/formatBR.ts && npm test -- --run tests/lib/logger.test.ts && npm test -- --run tests/lib/formatBR.test.ts && npx tsc --noEmit -p tsconfig.app.json
</automated>
</task>

<task id="07-03">
<action>
Update `src/hooks/useAuth.ts` to add `'liderado'` to the `AppRole` type union.

The current type is at line 5: `export type AppRole = 'admin' | 'socio' | 'lider' | 'rh' | 'colaborador';` — change to `export type AppRole = 'admin' | 'socio' | 'lider' | 'rh' | 'colaborador' | 'liderado';`.

Also update the `VALID_ROLES` constant (around line 9) to include `'liderado'`. Current: `const VALID_ROLES: AppRole[] = ['admin', 'socio', 'lider', 'rh', 'colaborador'];` — change to `['admin', 'socio', 'lider', 'rh', 'colaborador', 'liderado']`.

The DB enum addition was done in Plan 03 (Migration B1). This task aligns the frontend types so any user with `role = 'liderado'` in `user_roles` is correctly typed. CASL `defineAppAbility` (Plan 05 task 05-04) already accepts both `'liderado'` and `'colaborador'`.

Verify the change does not break existing components — `npx tsc --noEmit -p tsconfig.app.json` and `npm run build` must still exit 0.
</action>
<read_first>
- `src/hooks/useAuth.ts` lines 1-30 — confirm exact line numbers for `AppRole` and `VALID_ROLES`.
- All grep matches for `AppRole`: `grep -rn "AppRole" src/ | head -10` to identify any consumers that might need updating (most should accept the wider union without change).
</read_first>
<acceptance_criteria>
- File `src/hooks/useAuth.ts` `AppRole` type union includes `'liderado'`.
- File `src/hooks/useAuth.ts` `VALID_ROLES` array contains `'liderado'`.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
- `npm run build` exits 0.
- No other files require changes (grep audit).
</acceptance_criteria>
<files>
- `src/hooks/useAuth.ts`
</files>
<automated>
grep -q "'liderado'" src/hooks/useAuth.ts && [ "$(grep -c "'liderado'" src/hooks/useAuth.ts)" -ge 2 ] && npx tsc --noEmit -p tsconfig.app.json && npm run build
</automated>
</task>

<task id="07-04">
<action>
Create the ORG-08 UI: minimal CRUD page for managing org_units of a single empresa. Per RESEARCH.md Q3 recommendation, ship full functional CRUD with simple `<ul>` indented tree (no `react-arborist`).

**File 1: `src/features/org-structure/hooks/useOrgUnits.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrgUnitNode {
  id: string;
  company_id: string;
  parent_id: string | null;
  name: string;
  kind: string | null;
  position: number;
}

/**
 * Fetch all org_units for a company (RLS filters by visible_org_units).
 * Returns flat list — caller composes the tree (treeOps utility, optional).
 */
export function useOrgUnits(companyId: string | undefined) {
  return useQuery<OrgUnitNode[]>({
    queryKey: ['scope', '__org__', companyId ?? 'none', 'org-units', companyId ?? 'none'],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('org_units')
        .select('id, company_id, parent_id, name, kind, position')
        .eq('company_id', companyId)
        .order('position', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as OrgUnitNode[];
    },
  });
}
```

Note: this hook lives in `src/features/org-structure/hooks/` which IS allowed by the ESLint rule (regex `\/src\/features\/[^/]+\/hooks\//` matches). The queryKey is intentionally NOT going through `useScopedQuery` because the org structure UI is per-company (the URL provides `:id`, not the active scope) — using the explicit prefix `['scope', '__org__', companyId, ...]` keeps it isolated from scope-cache invalidation.

**File 2: `src/features/org-structure/hooks/useOrgUnitMutations.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatSupabaseError } from '@/lib/supabaseError';
import { logger } from '@/lib/logger';

export function useCreateOrgUnit(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; kind?: string | null; parent_id: string | null }) => {
      const { data, error } = await supabase
        .from('org_units')
        .insert({
          company_id: companyId,
          name: input.name,
          kind: input.kind ?? null,
          parent_id: input.parent_id,
          position: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scope', '__org__', companyId, 'org-units', companyId] });
      toast.success('Unidade criada.');
    },
    onError: (err) => {
      logger.error('[org-structure] create failed', err);
      toast.error(formatSupabaseError(err));
    },
  });
}

export function useRenameOrgUnit(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name: string; kind?: string | null }) => {
      const { error } = await supabase
        .from('org_units')
        .update({ name: input.name, kind: input.kind ?? null })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scope', '__org__', companyId, 'org-units', companyId] });
    },
    onError: (err) => {
      logger.error('[org-structure] rename failed', err);
      toast.error(formatSupabaseError(err));
    },
  });
}

export function useDeleteOrgUnit(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('org_units').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scope', '__org__', companyId, 'org-units', companyId] });
      toast.success('Unidade removida.');
    },
    onError: (err) => {
      logger.error('[org-structure] delete failed', err);
      toast.error(formatSupabaseError(err));
    },
  });
}
```

**File 3: `src/features/org-structure/components/OrgUnitTree.tsx`** — indented `<ul>` tree.

```tsx
import { useMemo, useState } from 'react';
import { ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { Btn } from '@/components/primitives/LinearKit';
import { cn } from '@/lib/utils';
import { useOrgUnits, type OrgUnitNode } from '../hooks/useOrgUnits';
import { useDeleteOrgUnit } from '../hooks/useOrgUnitMutations';
import { OrgUnitForm } from './OrgUnitForm';

interface OrgUnitTreeProps {
  companyId: string;
}

/**
 * Indented <ul> tree of org_units for the given company.
 * Operations: create child, rename, delete (with confirmation), toggle expand.
 *
 * ORG-08. Q3 minimal-functional-CRUD scope (no drag-and-drop in Phase 1).
 */
export function OrgUnitTree({ companyId }: OrgUnitTreeProps) {
  const { data: units, isLoading } = useOrgUnits(companyId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<OrgUnitNode | null>(null);
  const [creatingUnder, setCreatingUnder] = useState<string | null | undefined>(undefined);
  const deleteMutation = useDeleteOrgUnit(companyId);

  const tree = useMemo(() => {
    const byParent = new Map<string | null, OrgUnitNode[]>();
    for (const u of units ?? []) {
      const key = u.parent_id;
      const list = byParent.get(key) ?? [];
      list.push(u);
      byParent.set(key, list);
    }
    return byParent;
  }, [units]);

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNodes(parentId: string | null, depth: number): React.ReactNode {
    const children = tree.get(parentId) ?? [];
    if (!children.length) return null;
    return (
      <ul className={cn(depth > 0 && 'ml-5 border-l border-border pl-2')}>
        {children.map((node) => {
          const isOpen = expanded.has(node.id);
          const hasChildren = (tree.get(node.id) ?? []).length > 0;
          return (
            <li key={node.id} className="py-0.5">
              <div className="flex items-center gap-1.5 group hover:bg-bg-subtle rounded-sm px-1 py-1">
                <button
                  type="button"
                  onClick={() => toggle(node.id)}
                  className={cn(
                    'w-4 h-4 flex items-center justify-center text-text-subtle',
                    !hasChildren && 'invisible',
                  )}
                  aria-label={isOpen ? 'Recolher' : 'Expandir'}
                >
                  <ChevronRight
                    className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-90')}
                    strokeWidth={1.75}
                  />
                </button>
                <span className="text-[13px] text-text flex-1 truncate">{node.name}</span>
                {node.kind && (
                  <span className="text-[11px] text-text-subtle">{node.kind}</span>
                )}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <Btn
                    variant="ghost"
                    size="sm"
                    type="button"
                    aria-label="Adicionar subunidade"
                    onClick={() => setCreatingUnder(node.id)}
                  >
                    <Plus className="w-3 h-3" strokeWidth={1.75} />
                  </Btn>
                  <Btn
                    variant="ghost"
                    size="sm"
                    type="button"
                    aria-label="Renomear"
                    onClick={() => setEditing(node)}
                  >
                    <Pencil className="w-3 h-3" strokeWidth={1.75} />
                  </Btn>
                  <Btn
                    variant="ghost"
                    size="sm"
                    type="button"
                    aria-label="Remover"
                    onClick={() => {
                      if (confirm(`Remover "${node.name}"? Esta ação não pode ser desfeita.`)) {
                        deleteMutation.mutate(node.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" strokeWidth={1.75} />
                  </Btn>
                </div>
              </div>
              {isOpen && renderNodes(node.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  }

  if (isLoading) return <div className="text-text-muted text-[13px]">Carregando…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-medium text-text">Estrutura organizacional</h3>
        <Btn
          variant="secondary"
          size="sm"
          type="button"
          onClick={() => setCreatingUnder(null)}
        >
          Adicionar raiz
        </Btn>
      </div>
      {renderNodes(null, 0)}
      {(creatingUnder !== undefined || editing) && (
        <OrgUnitForm
          companyId={companyId}
          parentId={editing ? editing.parent_id : (creatingUnder ?? null)}
          editing={editing}
          onClose={() => {
            setCreatingUnder(undefined);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
```

**File 4: `src/features/org-structure/components/OrgUnitForm.tsx`** — create/rename modal-form.

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Btn } from '@/components/primitives/LinearKit';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateOrgUnit, useRenameOrgUnit } from '../hooks/useOrgUnitMutations';
import type { OrgUnitNode } from '../hooks/useOrgUnits';

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(100),
  kind: z.string().max(50).optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

interface OrgUnitFormProps {
  companyId: string;
  parentId: string | null;
  editing: OrgUnitNode | null;
  onClose: () => void;
}

export function OrgUnitForm({ companyId, parentId, editing, onClose }: OrgUnitFormProps) {
  const isEditing = !!editing;
  const createMutation = useCreateOrgUnit(companyId);
  const renameMutation = useRenameOrgUnit(companyId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: editing?.name ?? '', kind: editing?.kind ?? '' },
  });

  useEffect(() => {
    form.reset({ name: editing?.name ?? '', kind: editing?.kind ?? '' });
  }, [editing, form]);

  function onSubmit(values: FormValues) {
    const kind = values.kind?.trim() || null;
    if (isEditing && editing) {
      renameMutation.mutate({ id: editing.id, name: values.name, kind }, { onSuccess: onClose });
    } else {
      createMutation.mutate({ name: values.name, kind, parent_id: parentId }, { onSuccess: onClose });
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Renomear unidade' : 'Nova unidade'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="block text-[12.5px] font-medium text-text mb-1">Nome</label>
            <input
              type="text"
              autoFocus
              list="kind-suggestions"
              className="w-full h-9 px-3 text-[13px] bg-surface border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-[12px] text-destructive mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-text mb-1">Tipo (opcional)</label>
            <input
              type="text"
              list="kind-suggestions"
              placeholder="ex: departamento, time, squad"
              className="w-full h-9 px-3 text-[13px] bg-surface border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40"
              {...form.register('kind')}
            />
            <datalist id="kind-suggestions">
              <option value="departamento" />
              <option value="time" />
              <option value="squad" />
              <option value="célula" />
            </datalist>
          </div>
          <DialogFooter>
            <Btn variant="ghost" size="md" type="button" onClick={onClose}>
              Cancelar
            </Btn>
            <Btn variant="primary" size="md" type="submit" disabled={createMutation.isPending || renameMutation.isPending}>
              {isEditing ? 'Salvar' : 'Criar'}
            </Btn>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**File 5: `src/pages/CompanyOrgStructure.tsx`** — the route-level page.

```tsx
import { useParams } from 'react-router-dom';
import { OrgUnitTree } from '@/features/org-structure/components/OrgUnitTree';

export default function CompanyOrgStructure() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <OrgUnitTree companyId={id} />
    </div>
  );
}
```

**File 6: edit `src/App.tsx`** — register the new route under the authenticated routes block:

Add the import:
```typescript
import { lazy } from 'react';
const CompanyOrgStructure = lazy(() => import('./pages/CompanyOrgStructure'));
```

(Or use eager import if `App.tsx` doesn't use `lazy`.) Then add a `<Route>` definition:
```tsx
<Route path="/empresas/:id/estrutura" element={<CompanyOrgStructure />} />
```

Place it inside the Routes block where authenticated routes live (next to existing `/empresas` route, if any).
</action>
<read_first>
- `src/hooks/hiring/useApplications.ts` — analog for hooks shape (lines 13-72) — query keys, useQuery + Supabase pattern.
- `src/components/hiring/CandidateForm.tsx` — analog for react-hook-form + Zod resolver pattern.
- `src/App.tsx` — confirm route definition style (lazy vs eager, what wrappers like `<ProtectedRoute>`).
- `.planning/phases/01-tenancy-backbone/01-RESEARCH.md` lines 2186-2196 — Q3 recommendation (minimal CRUD, indented `<ul>`, no react-arborist).
- `src/lib/supabaseError.ts` — confirm `formatSupabaseError` signature.
</read_first>
<acceptance_criteria>
- File `src/features/org-structure/hooks/useOrgUnits.ts` exists.
- File `src/features/org-structure/hooks/useOrgUnitMutations.ts` exists with `useCreateOrgUnit`, `useRenameOrgUnit`, `useDeleteOrgUnit`.
- File `src/features/org-structure/components/OrgUnitTree.tsx` exists.
- File `src/features/org-structure/components/OrgUnitForm.tsx` exists using `useForm` + `zodResolver`.
- File `src/pages/CompanyOrgStructure.tsx` exists.
- `src/App.tsx` registers route `/empresas/:id/estrutura`.
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
- `npm run build` exits 0.
- `npm run lint -- --max-warnings=0 src/features/org-structure/` exits 0 (no ESLint violations in new code).
</acceptance_criteria>
<files>
- `src/features/org-structure/hooks/useOrgUnits.ts`
- `src/features/org-structure/hooks/useOrgUnitMutations.ts`
- `src/features/org-structure/components/OrgUnitTree.tsx`
- `src/features/org-structure/components/OrgUnitForm.tsx`
- `src/pages/CompanyOrgStructure.tsx`
- `src/App.tsx`
</files>
<automated>
test -f src/features/org-structure/hooks/useOrgUnits.ts && test -f src/features/org-structure/hooks/useOrgUnitMutations.ts && test -f src/features/org-structure/components/OrgUnitTree.tsx && test -f src/features/org-structure/components/OrgUnitForm.tsx && test -f src/pages/CompanyOrgStructure.tsx && grep -q "/empresas/:id/estrutura" src/App.tsx && npx tsc --noEmit -p tsconfig.app.json && npm run build && npm run lint -- --max-warnings=0 src/features/org-structure/
</automated>
</task>

<task id="07-05">
<action>
Run the full test suite + full lint + full build as the final gate. This task is the verification cliff for Plan 07 and for Phase 1 as a whole.

```bash
npm test -- --run        # All vitest tests pass
npm run lint              # ESLint passes (legacy allowlist absorbs known violations)
npx tsc --noEmit -p tsconfig.app.json  # TypeScript strict pass
npm run build             # Vite production build succeeds
supabase test db          # All 33 pgTAP assertions green
```

If any step fails, the executor must capture the diagnostics and surface to the user. Common failure modes:
- ESLint reports new violations in `src/features/` or `src/components/scope/` (NEW code MUST be clean — fix the offending file).
- TypeScript errors after `useAuth.ts` edit — usually a consumer that destructures with literal type asserts; widen the type.
- Vite build OOM — increase Node memory: `NODE_OPTIONS='--max-old-space-size=4096' npm run build`.
- pgTAP suite has a flake — usually a stale local DB. Run `supabase db reset` (caution: destroys local data) and retry.
</action>
<read_first>
- All files modified in this plan + dependencies.
- Output of previous task verifications to confirm individual gates passed.
</read_first>
<acceptance_criteria>
- `npm test -- --run` exits 0 with ALL test files green (≥ 41 tests = 24 from Plan 05 + 9 from Plan 06 + 8 logger + ~8 formatBR; minor count variance acceptable).
- `npm run lint` exits 0 (or reports only the legacy allowlisted files — verify by inspecting output).
- `npx tsc --noEmit -p tsconfig.app.json` exits 0.
- `npm run build` exits 0.
- `supabase test db` exits 0 with all pgTAP assertions green.
</acceptance_criteria>
<files>
- (no files modified — verification gate)
</files>
<automated>
npm test -- --run && npx tsc --noEmit -p tsconfig.app.json && npm run build && supabase test db
</automated>
</task>

</tasks>

<verification>
1. ESLint custom rule `no-supabase-from-outside-hooks` lints the codebase without false-positives in NEW code (`src/features/`, `src/app/`, `src/shared/`, `src/components/scope/`, `src/features/org-structure/`).
2. `@tanstack/eslint-plugin-query flat/recommended` enabled — surfaces any missing `queryKey` deps.
3. `logger.ts` PII redaction works for email, CPF, full_name, nested objects, arrays.
4. `formatBR.ts` formats UTC timestamps in São Paulo timezone with pt-BR locale.
5. `useAuth.ts` AppRole accepts `'liderado'` (RBAC-01 frontend alignment).
6. ORG-08 page `/empresas/:id/estrutura` renders the tree, supports create/rename/delete, validates form via Zod.
7. Final aggregate gate: full test suite, lint, typecheck, build, pgTAP all GREEN.
</verification>

<must_haves>
- ESLint custom rule blocks `supabase.from()` outside the 5 allowed-path patterns; legacy 12-file allowlist with TODO markers; `error` severity from PR 1.
- `@tanstack/eslint-plugin-query flat/recommended` enabled (4 built-in rules: exhaustive-deps, stable-query-client, no-rest-destructuring, no-unstable-deps).
- `logger.ts` exports `logger.{log,warn,error,debug}` and `redact()`; redacts email/CPF in strings + PII keys in objects/arrays; DEV passes through, PROD redacts.
- `formatBR.ts` exports `formatBR`, `formatBRDate`, `formatBRTime`, `formatBRRelative`; uses `formatInTimeZone(d, 'America/Sao_Paulo', ...)` with `ptBR` locale.
- `AppRole` type union includes `'liderado'`.
- ORG-08 UI: `/empresas/:id/estrutura` page renders `OrgUnitTree` (indented `<ul>` with expand/collapse, create/rename/delete buttons on hover, depth indentation via border-l) + `OrgUnitForm` (Dialog + react-hook-form + Zod schema + `<datalist>` for kind suggestions).
- All quality-gate tests passing (ESLint rule self-test + logger + formatBR ≥ 16 assertions).
- Aggregate gate green: `npm test -- --run`, `npm run lint`, `npx tsc --noEmit -p tsconfig.app.json`, `npm run build`, `supabase test db`.
</must_haves>

<success_criteria>
- ESLint custom rule + plugin-query enabled; `npm run lint -- --max-warnings=0 src/features/ src/app/ src/shared/ src/components/scope/ src/features/org-structure/` exits 0.
- Logger + formatBR utilities ship + tests pass.
- ORG-08 minimal CRUD UI ships at `/empresas/:id/estrutura`.
- AppRole type aligns with DB enum (both have `'liderado'`).
- Phase 1 final aggregate verification: all tests green, all gates green, all 36 phase requirements addressed across the 7 plans.
- Phase 1 done criteria from ROADMAP: trocar empresa/grupo refiltra todo o app sem vazamento — verified by pgTAP cross-tenant test + scope tests + manual visual smoke.
</success_criteria>
</content>
</invoke>