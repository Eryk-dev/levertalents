import { useState, useCallback } from 'react';
import { Card } from '@/components/primitives/LinearKit';
import { Btn } from '@/components/primitives/LinearKit';
import { Check, Copy } from 'lucide-react';

export interface OnboardingMessageBlockProps {
  fullName: string;
  email: string;
  tempPassword: string;
  expiresAt: string;
  rhFullName: string;
  onComplete?: () => void;
}

function buildMessage(props: OnboardingMessageBlockProps): string {
  // D-20 LOCKED template — copy VERBATIM, only interpolate the 4 placeholders
  return `Oi ${props.fullName}! Bem-vindo à Lever.
Acesse: https://app.levertalents.com/login
Login: ${props.email}
Senha temporária: ${props.tempPassword}
Expira em 24h.

Qualquer dúvida, fala comigo!
— ${props.rhFullName}`;
}

export function OnboardingMessageBlock(props: OnboardingMessageBlockProps) {
  const [copied, setCopied] = useState(false);
  const message = buildMessage(props);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Fallback: best-effort (navigator.clipboard may be unavailable in insecure contexts)
    }
  }, [message]);

  return (
    <Card className="bg-bg-subtle border-border">
      <p className="text-sm font-semibold mb-1">Pessoa cadastrada</p>
      <p className="text-sm text-text-subtle mb-3">
        Copie a mensagem abaixo e envie pelo seu WhatsApp para {props.fullName}.
      </p>
      <pre className="font-mono text-sm bg-surface p-3 rounded border border-border whitespace-pre-wrap mb-4">
        {message}
      </pre>
      <div className="flex gap-2 flex-col md:flex-row">
        <Btn
          variant="accent"
          onClick={handleCopy}
          className="md:flex-1"
        >
          {copied ? (
            <span className="flex items-center gap-1">
              <Check className="size-4" /> Copiado ✓
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Copy className="size-4" /> Copiar mensagem
            </span>
          )}
        </Btn>
        {props.onComplete && (
          <Btn variant="ghost" onClick={props.onComplete}>Concluir cadastro</Btn>
        )}
      </div>
    </Card>
  );
}
