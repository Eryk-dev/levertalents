import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { Btn } from '@/components/primitives/LinearKit';
import { cn } from '@/lib/utils';
import { useOrgUnits, type OrgUnitNode } from '../hooks/useOrgUnits';
import { useDeleteOrgUnit } from '../hooks/useOrgUnitMutations';
import { OrgUnitForm } from './OrgUnitForm';

interface OrgUnitTreeProps {
  companyId: string;
}

/**
 * Indented <ul> tree of org_units for the given company.
 * Operations: create child, rename, delete (with confirmation), toggle expand.
 *
 * ORG-08. Q3 minimal-functional-CRUD scope (no drag-and-drop in Phase 1).
 */
export function OrgUnitTree({ companyId }: OrgUnitTreeProps) {
  const { data: units, isLoading } = useOrgUnits(companyId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<OrgUnitNode | null>(null);
  // `creatingUnder` semantics: undefined = idle, null = creating root, string = creating under that parent.
  const [creatingUnder, setCreatingUnder] = useState<string | null | undefined>(undefined);
  const deleteMutation = useDeleteOrgUnit(companyId);

  const tree = useMemo(() => {
    const byParent = new Map<string | null, OrgUnitNode[]>();
    for (const u of units ?? []) {
      const key = u.parent_id;
      const list = byParent.get(key) ?? [];
      list.push(u);
      byParent.set(key, list);
    }
    return byParent;
  }, [units]);

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNodes(parentId: string | null, depth: number): ReactNode {
    const children = tree.get(parentId) ?? [];
    if (!children.length) return null;
    return (
      <ul className={cn(depth > 0 && 'ml-5 border-l border-border pl-2')}>
        {children.map((node) => {
          const isOpen = expanded.has(node.id);
          const hasChildren = (tree.get(node.id) ?? []).length > 0;
          return (
            <li key={node.id} className="py-0.5">
              <div className="flex items-center gap-1.5 group hover:bg-bg-subtle rounded-sm px-1 py-1">
                <button
                  type="button"
                  onClick={() => toggle(node.id)}
                  className={cn(
                    'w-4 h-4 flex items-center justify-center text-text-subtle',
                    !hasChildren && 'invisible',
                  )}
                  aria-label={isOpen ? 'Recolher' : 'Expandir'}
                >
                  <ChevronRight
                    className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-90')}
                    strokeWidth={1.75}
                  />
                </button>
                <span className="text-[13px] text-text flex-1 truncate">{node.name}</span>
                {node.kind && (
                  <span className="text-[11px] text-text-subtle">{node.kind}</span>
                )}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <Btn
                    variant="ghost"
                    size="sm"
                    type="button"
                    aria-label="Adicionar subunidade"
                    onClick={() => setCreatingUnder(node.id)}
                  >
                    <Plus className="w-3 h-3" strokeWidth={1.75} />
                  </Btn>
                  <Btn
                    variant="ghost"
                    size="sm"
                    type="button"
                    aria-label="Renomear"
                    onClick={() => setEditing(node)}
                  >
                    <Pencil className="w-3 h-3" strokeWidth={1.75} />
                  </Btn>
                  <Btn
                    variant="ghost"
                    size="sm"
                    type="button"
                    aria-label="Remover"
                    onClick={() => {
                      if (confirm(`Remover "${node.name}"? Esta ação não pode ser desfeita.`)) {
                        deleteMutation.mutate(node.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" strokeWidth={1.75} />
                  </Btn>
                </div>
              </div>
              {isOpen && renderNodes(node.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  }

  if (isLoading) {
    return <div className="text-text-muted text-[13px]">Carregando…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-medium text-text">Estrutura organizacional</h3>
        <Btn
          variant="secondary"
          size="sm"
          type="button"
          onClick={() => setCreatingUnder(null)}
        >
          Adicionar raiz
        </Btn>
      </div>
      {renderNodes(null, 0)}
      {(creatingUnder !== undefined || editing) && (
        <OrgUnitForm
          companyId={companyId}
          parentId={editing ? editing.parent_id : (creatingUnder ?? null)}
          editing={editing}
          onClose={() => {
            setCreatingUnder(undefined);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
