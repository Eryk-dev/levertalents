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
    expect(screen.queryByText(/Replay ativo/)).not.toBeInTheDocument();
  });

  it('toggling ON shows warning and starts replay', () => {
    render(<SessionReplayToggle />);
    fireEvent.click(screen.getByRole('switch'));
    expect(
      screen.getByText(
        /Replay ativo — todo conteúdo da tela é mascarado/,
      ),
    ).toBeInTheDocument();
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
