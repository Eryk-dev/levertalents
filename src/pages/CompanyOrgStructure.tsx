import { useParams } from 'react-router-dom';
import { OrgUnitTree } from '@/features/org-structure/components/OrgUnitTree';

/**
 * Route page mounted at /empresas/:id/estrutura. Renders OrgUnitTree
 * for the URL-provided company id. RLS enforces visibility (only
 * users whose visible_companies includes :id can read/write the
 * org_units of that company).
 *
 * ORG-08.
 */
export default function CompanyOrgStructure() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <OrgUnitTree companyId={id} />
    </div>
  );
}
