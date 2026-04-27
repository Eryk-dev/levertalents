/**
 * Scope = the active tenancy filter selected in the header dropdown.
 * Either a single company or a group of companies. companyIds is the
 * expanded array fed to `.in('company_id', companyIds)` queries.
 */
export type ScopeKind = 'company' | 'group';

export type Scope =
  | { kind: 'company'; id: string; companyIds: [string]; name: string }
  | { kind: 'group'; id: string; companyIds: string[]; name: string };

export interface VisibleCompanySummary {
  id: string;
  name: string;
}

export interface VisibleGroupSummary {
  id: string;
  name: string;
  companyIds: string[];
}
