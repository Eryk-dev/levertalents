import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, Btn } from '@/components/primitives/LinearKit';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { LeverArrow } from '@/components/primitives/LeverArrow';
import { Eye, EyeOff } from 'lucide-react';
import { TempPasswordExpiredBanner } from './TempPasswordExpiredBanner';
import { useChangePassword } from '@/hooks/useChangePassword';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const schema = z
  .object({
    newPassword: z.string().min(8, 'A senha precisa ter no mínimo 8 caracteres.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas digitadas são diferentes.',
    path: ['confirmPassword'],
  });

type Values = z.infer<typeof schema>;

export interface FirstLoginChangePasswordCardProps {
  tempPasswordExpired?: boolean;
}

export function FirstLoginChangePasswordCard({
  tempPasswordExpired = false,
}: FirstLoginChangePasswordCardProps) {
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const change = useChangePassword();
  const navigate = useNavigate();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = (v: Values) => {
    change.mutate(
      { newPassword: v.newPassword },
      {
        onSuccess: async () => {
          toast.success('Senha alterada');
          // Pitfall §9: useChangePassword.onSuccess already invalidates ['userProfile'].
          // Brief wait lets the cache invalidation propagate before ProtectedRoute re-checks flag.
          await new Promise((r) => setTimeout(r, 200));
          navigate('/', { replace: true });
        },
        onError: (e) =>
          toast.error('Não foi possível trocar a senha', { description: e.message }),
      },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-12">
      <Card className="max-w-md w-full surface-raised">
        <div className="flex justify-center mb-6">
          <LeverArrow className="size-12" />
        </div>
        <h1 className="text-[20px] font-semibold text-center mb-2">Crie sua nova senha</h1>
        <p className="text-sm text-text-subtle text-center mb-6">
          Esta é sua primeira entrada. Defina uma senha pessoal antes de continuar.
        </p>

        {tempPasswordExpired && <TempPasswordExpiredBanner />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPwd ? 'text' : 'password'}
                        {...field}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar nova senha</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirm ? 'text' : 'password'}
                        {...field}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}
                      >
                        {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Btn
              variant="accent"
              type="submit"
              className="w-full"
              disabled={change.isPending}
            >
              {change.isPending ? 'Salvando…' : 'Trocar senha'}
            </Btn>
          </form>
        </Form>
      </Card>
    </div>
  );
}
