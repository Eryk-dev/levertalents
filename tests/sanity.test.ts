import { describe, it, expect } from 'vitest';

describe('test infrastructure sanity', () => {
  it('vitest + jest-dom expectations work', () => {
    document.body.innerHTML = '<div data-testid="x">hi</div>';
    expect(document.querySelector('[data-testid="x"]')).toBeInTheDocument();
  });
});
