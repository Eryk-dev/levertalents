import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './msw/server';

// Stub Supabase env vars so the singleton client can construct under tests
// without a real .env (Rule 3 — blocking; previously failed Plan 01-03 setup).
vi.stubEnv('VITE_SUPABASE_URL', 'https://ehbxpbeijofxtsbezwxd.supabase.co');
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-anon-key-not-real');

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
