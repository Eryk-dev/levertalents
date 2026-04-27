/**
 * Self-test for the custom ESLint rule using ESLint's RuleTester.
 *
 * Run via: node eslint-rules/no-supabase-from-outside-hooks.test.cjs
 *
 * RuleTester throws on failure; success is silent.
 */

'use strict';

const { RuleTester } = require('eslint');
const rule = require('./no-supabase-from-outside-hooks.cjs');

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
    {
      // Legacy allowlist (nested directory)
      code: 'supabase.from("a").eq("b", "c")',
      filename: '/repo/src/pages/hiring/JobOpenings.tsx',
    },
    {
      // rlsScope.ts allowed
      code: 'supabase.from("companies").select()',
      filename: '/repo/src/lib/hiring/rlsScope.ts',
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
    {
      // src/lib outside rlsScope.ts is forbidden
      code: 'supabase.from("a")',
      filename: '/repo/src/lib/utils.ts',
      errors: [{ messageId: 'forbidden' }],
    },
  ],
});

// eslint-disable-next-line no-console
console.log('no-supabase-from-outside-hooks rule passes self-tests');
