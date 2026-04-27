import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Btn } from '@/components/primitives/LinearKit';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateOrgUnit, useRenameOrgUnit } from '../hooks/useOrgUnitMutations';
import type { OrgUnitNode } from '../hooks/useOrgUnits';

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(100),
  kind: z.string().max(50).optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

interface OrgUnitFormProps {
  companyId: string;
  parentId: string | null;
  editing: OrgUnitNode | null;
  onClose: () => void;
}

export function OrgUnitForm({ companyId, parentId, editing, onClose }: OrgUnitFormProps) {
  const isEditing = !!editing;
  const createMutation = useCreateOrgUnit(companyId);
  const renameMutation = useRenameOrgUnit(companyId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: editing?.name ?? '', kind: editing?.kind ?? '' },
  });

  useEffect(() => {
    form.reset({ name: editing?.name ?? '', kind: editing?.kind ?? '' });
  }, [editing, form]);

  function onSubmit(values: FormValues) {
    const kind = values.kind?.trim() || null;
    if (isEditing && editing) {
      renameMutation.mutate(
        { id: editing.id, name: values.name, kind },
        { onSuccess: onClose },
      );
    } else {
      createMutation.mutate(
        { name: values.name, kind, parent_id: parentId },
        { onSuccess: onClose },
      );
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Renomear unidade' : 'Nova unidade'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="block text-[12.5px] font-medium text-text mb-1">Nome</label>
            <input
              type="text"
              autoFocus
              className="w-full h-9 px-3 text-[13px] bg-surface border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-[12px] text-destructive mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-text mb-1">
              Tipo (opcional)
            </label>
            <input
              type="text"
              list="kind-suggestions"
              placeholder="ex: departamento, time, squad"
              className="w-full h-9 px-3 text-[13px] bg-surface border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/40"
              {...form.register('kind')}
            />
            <datalist id="kind-suggestions">
              <option value="departamento" />
              <option value="time" />
              <option value="squad" />
              <option value="célula" />
            </datalist>
          </div>
          <DialogFooter>
            <Btn variant="ghost" size="md" type="button" onClick={onClose}>
              Cancelar
            </Btn>
            <Btn
              variant="primary"
              size="md"
              type="submit"
              disabled={createMutation.isPending || renameMutation.isPending}
            >
              {isEditing ? 'Salvar' : 'Criar'}
            </Btn>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
