import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OneOnOneActionItems } from '../OneOnOneActionItems';

/**
 * OneOnOneActionItems RTL tests — ONE-05 (checklist with empty state + add).
 */
describe('OneOnOneActionItems (ONE-05)', () => {
  it('renders empty state when no items', () => {
    render(<OneOnOneActionItems items={[]} onChange={vi.fn()} />);
    expect(
      screen.getByText(/Nenhum action item ainda/i),
    ).toBeInTheDocument();
  });

  it('add button creates new item and calls onChange with new item', () => {
    const onChange = vi.fn();
    render(<OneOnOneActionItems items={[]} onChange={onChange} />);
    fireEvent.change(
      screen.getByPlaceholderText(/Novo action item/i),
      { target: { value: 'Tarefa X' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/i }));
    // onChange is called multiple times (mount + add); find the call with items
    const callWithItems = onChange.mock.calls.find(
      ([items]) => Array.isArray(items) && items.length === 1,
    );
    expect(callWithItems).toBeDefined();
    expect(callWithItems![0][0].text).toBe('Tarefa X');
  });

  it('renders added item in the list', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <OneOnOneActionItems items={[]} onChange={onChange} />,
    );
    fireEvent.change(
      screen.getByPlaceholderText(/Novo action item/i),
      { target: { value: 'Tarefa Y' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/i }));
    // The item should appear in the list after adding
    expect(screen.getByText('Tarefa Y')).toBeInTheDocument();
  });
});
