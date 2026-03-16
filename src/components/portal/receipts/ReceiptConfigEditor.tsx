'use client';

import { useState, useEffect } from 'react';
import { ReceiptType } from '@/prisma/generated/prisma-client/enums';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ChevronDown, ChevronRight, Settings, Loader2, Check,
  RefreshCw, Lock, MessageSquareText,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { RECEIPT_TYPE_ICONS } from './receiptTypeIcons';
import { receipts as t } from '@/lib/i18n/pages/receipts';
import { formatDate } from '@/lib/utils/formatting';

// Configurable receipt types (excluding RENT, which is always shown separately)
const CONFIGURABLE_TYPES: ReceiptType[] = [
  ReceiptType.ELECTRICITY,
  ReceiptType.WATER,
  ReceiptType.GAS,
  ReceiptType.INTERNET,
  ReceiptType.CABLE_TV,
  ReceiptType.PHONE,
  ReceiptType.MAINTENANCE,
  ReceiptType.OTHER,
];

interface ReceiptConfigEditorProps {
  policyId: string;
  onConfigSaved?: () => void;
}

export default function ReceiptConfigEditor({
  policyId,
  onConfigSaved,
}: ReceiptConfigEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<ReceiptType>>(new Set());
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: configData, isLoading, isRefetching } = trpc.receipt.getConfig.useQuery(
    { policyId },
    { enabled: !!policyId },
  );

  const updateMutation = trpc.receipt.updateConfig.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setNotes('');
      onConfigSaved?.();
    },
  });

  const utils = trpc.useUtils();

  // Initialize from current config
  useEffect(() => {
    if (configData?.currentTypes) {
      setSelectedTypes(new Set(configData.currentTypes));
    }
  }, [configData?.currentTypes]);

  const handleToggle = (type: ReceiptType) => {
    if (type === ReceiptType.RENT) return;
    setSelectedTypes(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    utils.receipt.getConfig.invalidate({ policyId });
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      policyId,
      receiptTypes: Array.from(selectedTypes),
      notes: notes || undefined,
    });
    utils.receipt.getConfig.invalidate({ policyId });
  };

  const hasChanges = configData?.currentTypes &&
    (configData.currentTypes.length !== selectedTypes.size ||
      configData.currentTypes.some(ct => !selectedTypes.has(ct)));

  // Latest history entry with a note
  const latestNoteEntry = configData?.history?.find(h => h.notes);

  if (isLoading) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-sm">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base font-semibold">
                  {t.config.title}
                </CardTitle>
              </div>
              <div className="flex items-center gap-1">
                {/* Refresh button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={handleRefresh}
                        disabled={isRefetching}
                      >
                        <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t.config.refresh}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {isOpen
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                }
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <p className="text-sm text-muted-foreground">
              {t.config.subtitle}
            </p>

            {/* RENT — always required, prominent */}
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <Checkbox checked disabled className="opacity-60" />
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                {(() => { const RentIcon = RECEIPT_TYPE_ICONS[ReceiptType.RENT]; return <RentIcon className="h-3.5 w-3.5 text-primary" />; })()}
              </div>
              <span className="text-sm font-semibold">{t.types.RENT}</span>
              <div className="flex items-center gap-1 ml-auto text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                {t.config.rentLocked}
              </div>
            </div>

            {/* Defaults reference */}
            {configData?.computedDefaults && (
              <p className="text-xs text-muted-foreground/60">
                {t.config.defaults}: {configData.computedDefaults.map(type => t.types[type]).join(', ')}
              </p>
            )}

            {/* Configurable types — 2-col grid */}
            <div className="grid grid-cols-2 gap-2">
              {CONFIGURABLE_TYPES.map(type => {
                const isChecked = selectedTypes.has(type);
                const TypeIcon = RECEIPT_TYPE_ICONS[type];

                return (
                  <label
                    key={type}
                    className="flex items-center gap-2.5 rounded-md border p-2.5 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleToggle(type)}
                    />
                    <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{t.types[type]}</span>
                  </label>
                );
              })}
            </div>

            {/* Latest note */}
            {latestNoteEntry && (
              <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                <MessageSquareText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">{t.config.latestNote}:</span>{' '}
                  &ldquo;{latestNoteEntry.notes}&rdquo;
                  {latestNoteEntry.createdByName && (
                    <span> — {latestNoteEntry.createdByName}</span>
                  )}
                  <span className="text-muted-foreground/60">, {formatDate(latestNoteEntry.createdAt)}</span>
                </div>
              </div>
            )}

            {/* Config history */}
            {configData?.history && configData.history.length > 0 && (
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {historyOpen
                    ? <ChevronDown className="h-3.5 w-3.5" />
                    : <ChevronRight className="h-3.5 w-3.5" />
                  }
                  <span>{t.config.history}</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {configData.history.map(entry => (
                      <div key={entry.id} className="rounded-md border p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            {formatDate(entry.createdAt)}
                            {entry.createdByName && (
                              <span> — {t.config.changedBy} {entry.createdByName}</span>
                            )}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-foreground/80 italic">&ldquo;{entry.notes}&rdquo;</p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {entry.receiptTypes.map(rt => (
                            <Badge key={rt} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {t.types[rt]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Notes input */}
            <div className="space-y-1">
              <Label className="text-xs">{t.config.notesLabel}</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.config.notesPlaceholder}
                className="text-sm"
              />
            </div>

            {/* Save */}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              size="sm"
              className="w-full"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.config.saving}
                </>
              ) : saved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t.config.saved}
                </>
              ) : (
                t.config.save
              )}
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
