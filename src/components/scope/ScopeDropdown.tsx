import { useState } from 'react';
import { Building2, Layers, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useScope } from '@/app/providers/ScopeProvider';
import { ScopeTrigger } from './ScopeTrigger';
import { DirtyFormConfirmDialog } from './DirtyFormConfirmDialog';
import type { ScopeKind } from '@/features/tenancy/types';

/**
 * Scope dropdown panel — Linear/Notion workspace switcher pattern.
 * Per UI-SPEC.md § 2:
 *   - Popover anchored to trigger (align="end", sideOffset={6})
 *   - Two CommandGroups: GRUPOS (top) and EMPRESAS
 *   - Embedded CommandInput with cmdk built-in fuzzy filter
 *   - Selected item: bg-accent-soft + Check icon
 *
 * D-05 (dirty-form confirmation): if the scope change is blocked by a
 * dirty form (ScopeProvider.setScope returns false), the dialog opens
 * automatically because pendingScope flips non-null in the provider.
 *
 * NOTE: shadcn's <CommandInput> already wraps the input in a
 * `cmdk-input-wrapper` div with a built-in <Search> icon — we intentionally
 * do NOT add a second Search icon here (would render twice).
 */
export function ScopeDropdown() {
  const [open, setOpen] = useState(false);
  const { scope, setScope, visibleCompanies, visibleGroups } = useScope();

  function handleSelect(kind: ScopeKind, id: string) {
    setOpen(false);
    setScope({ kind, id });
  }

  // Hide entirely if no scope (D-09 empty state owns the screen)
  if (!scope) return null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <ScopeTrigger open={open} onClick={() => setOpen((v) => !v)} />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-[320px] p-0 bg-surface border border-border rounded-md shadow-popup overflow-hidden"
        >
          <Command shouldFilter={true} className="bg-surface">
            <CommandInput
              placeholder="Buscar empresa ou grupo…"
              className="h-9 border-0 text-[13px] placeholder:text-text-subtle"
              aria-label="Buscar escopo"
            />

            <CommandList className="max-h-[360px] overflow-y-auto p-1.5">
              <CommandEmpty className="py-5 text-center text-[13px] text-text-subtle">
                Nenhum escopo encontrado.
              </CommandEmpty>

              {visibleGroups.length > 0 && (
                <CommandGroup
                  heading="GRUPOS"
                  className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-text-subtle [&_[cmdk-group-heading]]:uppercase"
                >
                  {visibleGroups.map((g) => {
                    const selected = scope.kind === 'group' && scope.id === g.id;
                    return (
                      <CommandItem
                        key={`group-${g.id}`}
                        value={`${g.name} ${g.id}`}
                        onSelect={() => handleSelect('group', g.id)}
                        className={cn(
                          'gap-2.5 px-2.5 py-1.5 rounded-sm cursor-pointer text-[13px] text-text',
                          'data-[selected=true]:bg-bg-subtle',
                          selected &&
                            'bg-accent-soft data-[selected=true]:bg-accent-soft',
                        )}
                      >
                        <Layers
                          className="w-3.5 h-3.5 text-text-muted shrink-0"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                        <span className="flex-1 truncate">{g.name}</span>
                        {selected && (
                          <Check
                            className="w-3.5 h-3.5 text-accent-text shrink-0"
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {visibleCompanies.length > 0 && (
                <CommandGroup
                  heading="EMPRESAS"
                  className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-text-subtle [&_[cmdk-group-heading]]:uppercase"
                >
                  {visibleCompanies.map((c) => {
                    const selected =
                      scope.kind === 'company' && scope.id === c.id;
                    return (
                      <CommandItem
                        key={`company-${c.id}`}
                        value={`${c.name} ${c.id}`}
                        onSelect={() => handleSelect('company', c.id)}
                        className={cn(
                          'gap-2.5 px-2.5 py-1.5 rounded-sm cursor-pointer text-[13px] text-text',
                          'data-[selected=true]:bg-bg-subtle',
                          selected &&
                            'bg-accent-soft data-[selected=true]:bg-accent-soft',
                        )}
                      >
                        <Building2
                          className="w-3.5 h-3.5 text-text-muted shrink-0"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                        <span className="flex-1 truncate">{c.name}</span>
                        {selected && (
                          <Check
                            className="w-3.5 h-3.5 text-accent-text shrink-0"
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* D-05 dirty-form confirmation — owned by provider state, surfaced here */}
      <DirtyFormConfirmDialog />
    </>
  );
}
