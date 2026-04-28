/**
 * Plan 02-09 Task 1a — Backwards-compat re-export.
 *
 * Drawer foi quebrado em sub-componentes (QUAL-04 critério; legacy 867 linhas
 * → shell ≤200 linhas + Header + Tabs + Content + 5 *TabContent files em
 * src/components/hiring/drawer/).
 *
 * Imports novos devem usar `@/components/hiring/drawer/CandidateDrawer`
 * diretamente. Este arquivo apenas re-exporta para preservar consumidores
 * antigos (CandidatesKanban page, etc.).
 */

export { CandidateDrawer, default } from "./drawer/CandidateDrawer";
export type { DrawerTab } from "./drawer/CandidateDrawerTabs";
