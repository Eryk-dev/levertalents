import { describe, it, expect, beforeEach } from 'vitest';
import {
  CardPreferencesSchema,
  DEFAULT_CARD_PREFERENCES,
  loadCardPreferences,
  saveCardPreferences,
  OPTIONAL_FIELDS,
  isFieldEnabled,
  type CardPreferences,
} from '@/lib/hiring/cardCustomization';

// Plan 02-03 Wave 1 — exercises src/lib/hiring/cardCustomization (Zod schema +
// localStorage persistence). The hook itself (src/hooks/hiring/useCardPreferences)
// is added in Plan 02-08 — this file pre-empts the schema contract.

describe('OPTIONAL_FIELDS + CardPreferencesSchema', () => {
  it('OPTIONAL_FIELDS contém os 6 campos da D-08', () => {
    expect(OPTIONAL_FIELDS).toContain('avatar');
    expect(OPTIONAL_FIELDS).toContain('next_interview');
    expect(OPTIONAL_FIELDS).toContain('cv_icon');
    expect(OPTIONAL_FIELDS).toContain('fit_score');
    expect(OPTIONAL_FIELDS).toContain('bg_check_dot');
    expect(OPTIONAL_FIELDS).toContain('source_tag');
    expect(OPTIONAL_FIELDS.length).toBe(6);
  });

  it('DEFAULT inclui avatar + next_interview + cv_icon', () => {
    expect(DEFAULT_CARD_PREFERENCES.enabledFields).toEqual(
      expect.arrayContaining(['avatar', 'next_interview', 'cv_icon']),
    );
  });

  it('Schema Zod aceita objeto com version=1 + array vazio', () => {
    const parsed = CardPreferencesSchema.safeParse({ version: 1, enabledFields: [] });
    expect(parsed.success).toBe(true);
  });

  it('Schema Zod rejeita version diferente de 1', () => {
    const parsed = CardPreferencesSchema.safeParse({ version: 99, enabledFields: [] });
    expect(parsed.success).toBe(false);
  });

  it('Schema Zod rejeita campo fora de OPTIONAL_FIELDS', () => {
    const parsed = CardPreferencesSchema.safeParse({
      version: 1,
      enabledFields: ['unknown_field'],
    });
    expect(parsed.success).toBe(false);
  });
});

describe('loadCardPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retorna DEFAULT quando userId null', () => {
    expect(loadCardPreferences(null)).toEqual(DEFAULT_CARD_PREFERENCES);
  });
  it('retorna DEFAULT quando userId undefined', () => {
    expect(loadCardPreferences(undefined)).toEqual(DEFAULT_CARD_PREFERENCES);
  });
  it('retorna DEFAULT quando localStorage vazio', () => {
    expect(loadCardPreferences('user-1')).toEqual(DEFAULT_CARD_PREFERENCES);
  });
  it('retorna persistido após save (round-trip)', () => {
    const prefs: CardPreferences = { version: 1, enabledFields: ['avatar'] };
    saveCardPreferences('user-1', prefs);
    expect(loadCardPreferences('user-1')).toEqual(prefs);
  });
  it('retorna DEFAULT quando JSON corrompido', () => {
    localStorage.setItem('leverup:rs:card-fields:user-1', '{not json');
    expect(loadCardPreferences('user-1')).toEqual(DEFAULT_CARD_PREFERENCES);
  });
  it('retorna DEFAULT quando version não bate (schema migration)', () => {
    localStorage.setItem(
      'leverup:rs:card-fields:user-1',
      JSON.stringify({ version: 99, enabledFields: [] }),
    );
    expect(loadCardPreferences('user-1')).toEqual(DEFAULT_CARD_PREFERENCES);
  });
  it('persiste com namespace leverup:rs:card-fields:{userId}', () => {
    const prefs: CardPreferences = { version: 1, enabledFields: ['fit_score'] };
    saveCardPreferences('user-XYZ', prefs);
    const raw = localStorage.getItem('leverup:rs:card-fields:user-XYZ');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual(prefs);
  });
});

describe('isFieldEnabled', () => {
  it('true se campo está em enabledFields', () => {
    const prefs: CardPreferences = { version: 1, enabledFields: ['avatar', 'fit_score'] };
    expect(isFieldEnabled(prefs, 'avatar')).toBe(true);
    expect(isFieldEnabled(prefs, 'fit_score')).toBe(true);
  });
  it('false se campo não está em enabledFields', () => {
    const prefs: CardPreferences = { version: 1, enabledFields: ['avatar'] };
    expect(isFieldEnabled(prefs, 'cv_icon')).toBe(false);
  });
});
