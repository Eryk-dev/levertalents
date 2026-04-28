import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Btn } from '@/components/primitives/LinearKit';
import { useEvaluationTemplates } from '@/hooks/useEvaluationTemplates';
import { useCreateCycle } from '@/hooks/useEvaluationCycles';
import { toast } from 'sonner';

const schema = z
  .object({
    template_id: z.string().uuid(),
    name: z.string().min(1, 'Informe um nome'),
    starts_at: z.string().min(1, 'Informe a data de início'),
    ends_at: z.string().min(1, 'Informe a data de fim'),
  })
  .refine((d) => new Date(d.ends_at) > new Date(d.starts_at), {
    message: 'A data de fim precisa ser depois da data de início.',
    path: ['ends_at'],
  });

type Values = z.infer<typeof schema>;

export interface CreateCycleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

export function CreateCycleDialog({
  open,
  onOpenChange,
  companyId,
}: CreateCycleDialogProps) {
  const templates = useEvaluationTemplates();
  const create = useCreateCycle();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { template_id: '', name: '', starts_at: '', ends_at: '' },
  });

  const onSubmit = (v: Values) => {
    create.mutate(
      { company_id: companyId, ...v },
      {
        onSuccess: () => {
          toast.success('Ciclo aberto');
          onOpenChange(false);
          form.reset();
        },
        onError: (e) =>
          toast.error('Não foi possível abrir ciclo', { description: e.message }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Criar ciclo</DialogTitle>
        <DialogDescription>
          Escolha o template, nome e janela do ciclo.
        </DialogDescription>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="template_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um template" />
                      </SelectTrigger>
                      <SelectContent>
                        {(templates.data ?? [])
                          .filter((t) => t.company_id === companyId)
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                              {t.is_default ? ' (padrão)' : ''}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do ciclo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Q1 2026" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="starts_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ends_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Btn
                variant="ghost"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Manter rascunho
              </Btn>
              <Btn
                variant="accent"
                type="submit"
                disabled={create.isPending}
              >
                {create.isPending ? 'Abrindo…' : 'Abrir ciclo'}
              </Btn>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
