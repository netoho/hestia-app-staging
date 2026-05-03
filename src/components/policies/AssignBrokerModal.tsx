'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, UserMinus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
  CommandSeparator,
} from '@/components/ui/command';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const SEARCH_DEBOUNCE_MS = 250;
const RESULT_LIMIT = 10;

interface CurrentBroker {
  id: string;
  name: string | null;
}

interface AssignBrokerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  /** Broker currently assigned to the policy (or null = "Sin asignar / CS"). */
  currentBroker: CurrentBroker | null;
}

export function AssignBrokerModal({
  open,
  onOpenChange,
  policyId,
  currentBroker,
}: AssignBrokerModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(currentBroker?.id ?? null);

  // Reset selection when the modal opens (in case the user reopens after cancel).
  useEffect(() => {
    if (open) {
      setSelectedId(currentBroker?.id ?? null);
      setSearch('');
      setDebouncedSearch('');
    }
  }, [open, currentBroker?.id]);

  // Debounce the search input.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const brokersQuery = trpc.staff.list.useQuery(
    {
      page: 1,
      limit: RESULT_LIMIT,
      role: 'BROKER',
      search: debouncedSearch || undefined,
    },
    { enabled: open },
  );

  const assignMutation = trpc.policy.assignManager.useMutation({
    onSuccess: async () => {
      toast({ title: 'Broker actualizado' });
      await utils.policy.getById.invalidate({ id: policyId });
      onOpenChange(false);
    },
    onError: (err) => {
      toast({
        title: 'No se pudo actualizar',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // If the assigned broker is currently inactive, the search results won't
  // include them — but we still want the modal to reflect their identity.
  // Inject as a synthetic option so the user can see and reassign.
  const brokers = useMemo(() => {
    const fromQuery = brokersQuery.data?.users ?? [];
    if (
      currentBroker &&
      !fromQuery.some((u) => u.id === currentBroker.id) &&
      // Only inject when the search isn't filtering it out by name.
      (!debouncedSearch ||
        (currentBroker.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false))
    ) {
      return [
        {
          id: currentBroker.id,
          name: currentBroker.name,
          email: null as string | null,
          inactive: true as const,
        },
        ...fromQuery.map((u) => ({ ...u, inactive: false as const })),
      ];
    }
    return fromQuery.map((u) => ({ ...u, inactive: false as const }));
  }, [brokersQuery.data, currentBroker, debouncedSearch]);

  const noChange = (selectedId ?? null) === (currentBroker?.id ?? null);

  const handleSave = () => {
    assignMutation.mutate({ policyId, managedById: selectedId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar broker</DialogTitle>
          <DialogDescription>
            Selecciona el broker que tracker esta protección. Deja en
            &ldquo;Sin asignar&rdquo; para que el reporte muestre &ldquo;CS&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <Command shouldFilter={false} className="border rounded-md">
          <CommandInput
            placeholder="Buscar broker por nombre o email..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandGroup>
              <CommandItem
                value="__unassigned__"
                onSelect={() => setSelectedId(null)}
                className="cursor-pointer"
              >
                <UserMinus className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="flex-1">Sin asignar (CS)</span>
                {selectedId === null && <Check className="h-4 w-4" />}
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Brokers">
              {brokersQuery.isLoading && (
                <CommandLoading>Cargando…</CommandLoading>
              )}
              {!brokersQuery.isLoading && brokers.length === 0 && (
                <CommandEmpty>No se encontraron brokers.</CommandEmpty>
              )}
              {brokers.map((broker) => (
                <CommandItem
                  key={broker.id}
                  value={broker.id}
                  onSelect={() => setSelectedId(broker.id)}
                  className="cursor-pointer"
                >
                  <div className="flex-1">
                    <p className={cn('text-sm font-medium', broker.inactive && 'text-muted-foreground')}>
                      {broker.name ?? 'Sin nombre'}
                      {broker.inactive && ' (inactivo)'}
                    </p>
                    {broker.email && (
                      <p className="text-xs text-muted-foreground">{broker.email}</p>
                    )}
                  </div>
                  {selectedId === broker.id && <Check className="h-4 w-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={noChange || assignMutation.isPending}
          >
            {assignMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
