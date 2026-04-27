import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
  type MongoQuery,
} from '@casl/ability';

// Local AppRole — supplemented from useAuth's existing definition; we
// accept both 'liderado' and 'colaborador' until Phase 4 contracts.
export type AppRoleForAbility =
  | 'admin'
  | 'socio'
  | 'lider'
  | 'rh'
  | 'colaborador'
  | 'liderado';

export type Subject =
  | 'Company'
  | 'CompanyGroup'
  | 'OrgUnit'
  | 'OrgUnitMember'
  | 'UnitLeader'
  | 'JobOpening'
  | 'Application'
  | 'Candidate'
  | 'Evaluation'
  | 'OneOnOne'
  | 'ClimateSurvey'
  | 'Folha'
  | 'Platform'
  | 'all';

export type Action = 'manage' | 'create' | 'read' | 'update' | 'delete';

// Allow either bare-string subjects (used in rule definitions) or object
// instances tagged via @casl/ability's `subject()` helper at call sites.
export type SubjectOrInstance = Subject | (Record<string, unknown> & { __caslSubjectType__?: Subject });

export type AppAbility = MongoAbility<[Action, SubjectOrInstance]>;

// Internal helper: CASL's RuleBuilder typing infers conditions as
// `MongoQuery<never>` for plain string subjects (no TaggedInterface attached),
// which rejects our object literals at compile-time even though they work at
// runtime. We type `can`/`cannot` as a permissive overload that accepts
// arbitrary MongoQuery payloads — the runtime behavior is unchanged.
type CanFn = (
  action: Action | Action[],
  subject: Subject | Subject[],
  conditions?: MongoQuery<Record<string, unknown>>,
) => unknown;

export interface AbilityContext {
  role: AppRoleForAbility;
  userId: string;
  visibleCompanyIds: string[];
  visibleOrgUnitIds: string[];
  ledOrgUnitIds: string[];
  ownOrgUnitIds: string[];
}

export function defineAppAbility(ctx: AbilityContext): AppAbility {
  const builder = new AbilityBuilder<AppAbility>(createMongoAbility);
  // CASL's typed `can`/`cannot` reject our condition object literals (it
  // infers MongoQuery<never> for unbranded string subjects). The runtime
  // accepts MongoQuery<Record> just fine — we only need to relax the type.
  const can = builder.can as unknown as CanFn;
  const cannot = builder.cannot as unknown as CanFn;
  const build = builder.build.bind(builder);

  if (ctx.role === 'admin') {
    can('manage', 'all');
    return build();
  }

  if (ctx.role === 'rh') {
    // Operational total
    can('manage', 'Company');
    can('manage', 'CompanyGroup');
    can('manage', 'OrgUnit');
    can('manage', 'OrgUnitMember');
    can('manage', 'UnitLeader');
    can('manage', 'JobOpening');
    can('manage', 'Application');
    can('manage', 'Candidate');
    can('manage', 'Evaluation');
    can('manage', 'OneOnOne');
    can('manage', 'ClimateSurvey');
    can('read', 'Folha');
    cannot('manage', 'Platform'); // RBAC-03
    return build();
  }

  if (ctx.role === 'socio') {
    can('read', 'Company', { id: { $in: ctx.visibleCompanyIds } });
    can('read', 'OrgUnit', { company_id: { $in: ctx.visibleCompanyIds } });
    can('read', 'JobOpening', { company_id: { $in: ctx.visibleCompanyIds } });
    can('read', 'Application', { company_id: { $in: ctx.visibleCompanyIds } });
    can('read', 'Candidate');
    can('read', 'Folha', { company_id: { $in: ctx.visibleCompanyIds } });
    can('update', 'Company', { id: { $in: ctx.visibleCompanyIds } });
    cannot('manage', 'Platform');
    cannot('manage', 'Evaluation');
    return build();
  }

  if (ctx.role === 'lider') {
    can('read', 'Company', { id: { $in: ctx.visibleCompanyIds } });
    can('read', 'OrgUnit', { id: { $in: ctx.visibleOrgUnitIds } });
    can('read', 'OrgUnitMember', { org_unit_id: { $in: ctx.visibleOrgUnitIds } });
    can('read', 'JobOpening', { company_id: { $in: ctx.visibleCompanyIds } });
    can('read', 'Application', { company_id: { $in: ctx.visibleCompanyIds } });
    can('create', 'JobOpening', { company_id: { $in: ctx.visibleCompanyIds } });
    can('update', 'JobOpening', { requested_by: ctx.userId });
    can('manage', 'Evaluation', { org_unit_id: { $in: ctx.visibleOrgUnitIds } });
    can('manage', 'OneOnOne', { leader_id: ctx.userId });
    return build();
  }

  if (ctx.role === 'liderado' || ctx.role === 'colaborador') {
    can('read', 'Company', { id: { $in: ctx.visibleCompanyIds } });
    can('read', 'OrgUnit', { id: { $in: ctx.ownOrgUnitIds } });
    can('read', 'Evaluation', { evaluatee_id: ctx.userId });
    can('read', 'OneOnOne', { liderado_id: ctx.userId });
    return build();
  }

  return build(); // empty
}
