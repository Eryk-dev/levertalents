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
import { Btn } from '@/components/primitives/LinearKit';
import { useCreateTemplate } from '@/hooks/useEvaluationTemplates';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(1, 'Informe um nome'),
});

type Values = z.infer<typeof schema>;

export interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onCreated?: (templateId: string) => void;
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  companyId,
  onCreated,
}: CreateTemplateDialogProps) {
  const create = useCreateTemplate();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  const onSubmit = (v: Values) => {
    create.mutate(
      {
        company_id: companyId,
        name: v.name.trim(),
        schema_json: { version: 1, sections: [] },
        is_default: false,
      },
      {
        onSuccess: (row) => {
          toast.success('Template criado');
          form.reset();
          onOpenChange(false);
          onCreated?.(row.id);
        },
        onError: (e) =>
          toast.error('Não foi possível criar template', { description: e.message }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Novo template</DialogTitle>
        <DialogDescription>
          Dê um nome ao template. Você adiciona seções e perguntas no próximo passo.
        </DialogDescription>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do template</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex.: Avaliação 360 — Líder direto"
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Btn
                variant="ghost"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Btn>
              <Btn variant="accent" type="submit" disabled={create.isPending}>
                {create.isPending ? 'Criando…' : 'Criar template'}
              </Btn>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
