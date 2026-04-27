import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './msw/server';

// Stub Supabase env vars so the singleton client can construct under tests
// without a real .env (Rule 3 — blocking; previously failed Plan 01-03 setup).
vi.stubEnv('VITE_SUPABASE_URL', 'https://ehbxpbeijofxtsbezwxd.supabase.co');
vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-anon-key-not-real');

// jsdom polyfills for libraries that use browser-only APIs.
// cmdk (used by ScopeDropdown via shadcn Command) reads ResizeObserver
// to size its rows; jsdom doesn't ship it. Rule 3 fix: minimal stub.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// Radix Popover / cmdk also touch scrollIntoView and pointer-capture; jsdom
// stubs them as no-ops. (No-op is correct — we don't assert on scroll.)
if (typeof Element !== 'undefined') {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {};
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = function hasPointerCapture() {
      return false;
    };
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture =
      function releasePointerCapture() {};
  }
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
