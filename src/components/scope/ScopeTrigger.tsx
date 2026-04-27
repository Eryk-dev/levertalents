import { forwardRef } from 'react';
import { Building2, Layers, ChevronDown } from 'lucide-react';
import { Btn } from '@/components/primitives/LinearKit';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useScope } from '@/app/providers/ScopeProvider';

interface ScopeTriggerProps {
  open: boolean;
  onClick: () => void;
}

/**
 * Header right-cluster trigger button. Mirrors the RBAC-07 badge
 * ("Você está vendo: X") via aria-label per D-03 / UI-SPEC.md § 1.
 *
 * Hidden when scope=null (sócio sem empresa — empty state takes over).
 * Disabled (with tooltip) when scope is fixed (líder/liderado, or single-
 * company sócio per D-06). Otherwise opens the Popover dropdown.
 */
export const ScopeTrigger = forwardRef<HTMLButtonElement, ScopeTriggerProps>(
  function ScopeTrigger({ open, onClick }, ref) {
    const { scope, isFixed, isResolving } = useScope();

    // Hidden during initial resolve OR when scope is null (D-09 empty state)
    if (isResolving || !scope) return null;

    const Icon = scope.kind === 'group' ? Layers : Building2;
    const ariaLabel = `Você está vendo: ${scope.name}. Abrir seletor de escopo.`;

    const button = (
      <Btn
        ref={ref}
        variant="ghost"
        size="sm"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={isFixed}
        onClick={onClick}
        className={cn(
          'group h-[28px] px-2 py-1 gap-1 border border-border rounded-md',
          'hover:bg-bg-subtle hover:border-border-strong',
          'data-[state=open]:bg-bg-subtle data-[state=open]:border-border-strong',
          isFixed &&
            'bg-bg-muted text-text-muted cursor-not-allowed hover:bg-bg-muted hover:border-border',
        )}
        data-state={open ? 'open' : 'closed'}
      >
        <Icon
          className="w-3.5 h-3.5 text-text-muted shrink-0"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <span className="text-[12.5px] font-medium text-text truncate max-w-[180px]">
          {scope.name}
        </span>
        {!isFixed && (
          <ChevronDown
            className={cn(
              'w-3 h-3 text-text-subtle shrink-0 transition-transform',
              open && 'rotate-180',
            )}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
      </Btn>
    );

    if (isFixed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{button}</span>
          </TooltipTrigger>
          <TooltipContent>Seu escopo é fixo</TooltipContent>
        </Tooltip>
      );
    }

    return button;
  },
);
