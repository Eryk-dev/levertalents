import { describe, it, expect } from 'vitest';
import { subject, type AnyAbility } from '@casl/ability';
import { defineAppAbility } from '@/features/tenancy/lib/abilities';

// CASL types `can(action, subject, field?)` strictly when the subject is a
// declared string literal. Using the tagged-object form (subject('T', {...}))
// works at runtime but is not assignable to that strict overload. The tests
// exercise runtime behavior, so we narrow to AnyAbility to call .can with
// tagged objects without `as any` casts (CLAUDE.md forbids them in src/).
const asAnyAbility = (a: ReturnType<typeof defineAppAbility>): AnyAbility =>
  a as unknown as AnyAbility;

const baseCtx = {
  userId: 'user-123',
  visibleCompanyIds: ['c1', 'c2'],
  visibleOrgUnitIds: ['ou1'],
  ledOrgUnitIds: ['ou1'],
  ownOrgUnitIds: ['ou1'],
};

describe('defineAppAbility', () => {
  it('admin can manage all', () => {
    const ability = defineAppAbility({ ...baseCtx, role: 'admin' });
    expect(ability.can('manage', 'all')).toBe(true);
    expect(ability.can('manage', 'Platform')).toBe(true);
  });

  it('rh can manage operational subjects but NOT Platform', () => {
    const ability = defineAppAbility({ ...baseCtx, role: 'rh' });
    expect(ability.can('manage', 'JobOpening')).toBe(true);
    expect(ability.can('manage', 'Evaluation')).toBe(true);
    expect(ability.can('manage', 'Platform')).toBe(false);
  });

  it('socio can read scoped data, NOT Platform, NOT Evaluation', () => {
    const ability = asAnyAbility(defineAppAbility({ ...baseCtx, role: 'socio' }));
    expect(ability.can('read', subject('Company', { id: 'c1' }))).toBe(true);
    expect(ability.can('read', subject('Company', { id: 'c-not-mine' }))).toBe(false);
    expect(ability.can('manage', 'Platform')).toBe(false);
    expect(ability.can('manage', 'Evaluation')).toBe(false);
  });

  it('lider can read in visibleOrgUnit and create JobOpening', () => {
    const ability = asAnyAbility(defineAppAbility({ ...baseCtx, role: 'lider' }));
    expect(ability.can('read', subject('OrgUnit', { id: 'ou1' }))).toBe(true);
    expect(ability.can('read', subject('OrgUnit', { id: 'ou-other' }))).toBe(false);
    expect(ability.can('create', subject('JobOpening', { company_id: 'c1' }))).toBe(true);
  });

  it('liderado can read own evaluations only', () => {
    const ability = asAnyAbility(defineAppAbility({ ...baseCtx, role: 'liderado' }));
    expect(
      ability.can('read', subject('Evaluation', { evaluated_user_id: 'user-123' })),
    ).toBe(true);
    expect(
      ability.can('read', subject('Evaluation', { evaluated_user_id: 'someone-else' })),
    ).toBe(false);
  });

  it('colaborador (legacy synonym) behaves like liderado', () => {
    const ability = asAnyAbility(defineAppAbility({ ...baseCtx, role: 'colaborador' }));
    expect(
      ability.can('read', subject('OneOnOne', { collaborator_id: 'user-123' })),
    ).toBe(true);
    expect(
      ability.can('read', subject('OneOnOne', { collaborator_id: 'other' })),
    ).toBe(false);
  });
});
