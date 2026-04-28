import { Chip } from '@/components/primitives/LinearKit';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Eye } from 'lucide-react';

/**
 * OneOnOneRHVisibleBadge — persistent "RH visível" badge in the 1:1 form header.
 * D-15: badge always rendered regardless of viewer role.
 * UI-SPEC: Chip amber + tooltip "RH da empresa pode auditar conversas."
 * INV-3-12: badge must always be present in DOM.
 */
export function OneOnOneRHVisibleBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Chip color="amber" size="sm">
            <Eye className="size-3 mr-1" aria-hidden="true" />
            RH visível
          </Chip>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        RH da empresa pode auditar conversas.
      </TooltipContent>
    </Tooltip>
  );
}
