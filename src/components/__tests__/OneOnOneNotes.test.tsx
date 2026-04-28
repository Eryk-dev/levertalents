import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OneOnOneNotes } from '../OneOnOneNotes';

/**
 * OneOnOneNotes RTL tests — D-12/D-14 (Plaud fields) + INV-3-11 (paste warning).
 */
describe('OneOnOneNotes (D-12/D-14) [INV-3-11]', () => {
  it('renders 2 separate Plaud textareas', () => {
    render(
      <OneOnOneNotes
        notes=""
        onNotesChange={vi.fn()}
        transcricaoPlaud=""
        onTranscricaoPlaudChange={vi.fn()}
        resumoPlaud=""
        onResumoPlaudChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/Transcrição \(Plaud\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Resumo \(Plaud\)/i)).toBeInTheDocument();
  });

  it('shows short warning when transcricao < 50 chars', () => {
    render(
      <OneOnOneNotes
        notes=""
        onNotesChange={vi.fn()}
        transcricaoPlaud="curto"
        onTranscricaoPlaudChange={vi.fn()}
        resumoPlaud=""
        onResumoPlaudChange={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Texto curto demais/i),
    ).toBeInTheDocument();
  });

  it('does not show short warning when transcricao has >= 50 chars', () => {
    const longText = 'a'.repeat(60);
    render(
      <OneOnOneNotes
        notes=""
        onNotesChange={vi.fn()}
        transcricaoPlaud={longText}
        onTranscricaoPlaudChange={vi.fn()}
        resumoPlaud=""
        onResumoPlaudChange={vi.fn()}
      />,
    );
    expect(
      screen.queryByText(/Texto curto demais/i),
    ).not.toBeInTheDocument();
  });

  it('calls onNotesChange when free notes textarea is edited', () => {
    const onNotesChange = vi.fn();
    render(
      <OneOnOneNotes
        notes=""
        onNotesChange={onNotesChange}
        transcricaoPlaud=""
        onTranscricaoPlaudChange={vi.fn()}
        resumoPlaud=""
        onResumoPlaudChange={vi.fn()}
      />,
    );
    const textarea = screen.getByPlaceholderText(/Notas durante o 1:1/i);
    fireEvent.change(textarea, { target: { value: 'nova nota' } });
    expect(onNotesChange).toHaveBeenCalledWith('nova nota');
  });
});
