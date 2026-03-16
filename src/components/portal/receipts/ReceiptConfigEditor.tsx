'use client';

import { useState, useEffect } from 'react';
import { ReceiptType } from '@/prisma/generated/prisma-client/enums';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Settings, Loader2, Check } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { receipts as t } from '@/lib/i18n/pages/receipts';

// All configurable receipt types (displayed in this order)
const ALL_RECEIPT_TYPES: ReceiptType[] = [
  ReceiptType.RENT,
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

  const { data: configData, isLoading } = trpc.receipt.getConfig.useQuery(
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
    if (type === ReceiptType.RENT) return; // Locked
    setSelectedTypes(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
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
      configData.currentTypes.some(t => !selectedTypes.has(t)));

  if (isLoading) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-sm">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">
                  {t.config.title}
                </CardTitle>
              </div>
              {isOpen
                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
              }
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <p className="text-xs text-muted-foreground">
              {t.config.subtitle}
            </p>

            {/* Defaults reference */}
            {configData?.computedDefaults && (
              <p className="text-xs text-muted-foreground/60">
                {t.config.defaults}: {configData.computedDefaults.map(type => t.types[type]).join(', ')}
              </p>
            )}

            {/* Checkboxes */}
            <div className="grid grid-cols-2 gap-2">
              {ALL_RECEIPT_TYPES.map(type => {
                const isRent = type === ReceiptType.RENT;
                const isChecked = selectedTypes.has(type);

                return (
                  <label
                    key={type}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleToggle(type)}
                      disabled={isRent}
                    />
                    <span className={isRent ? 'text-muted-foreground' : ''}>
                      {t.types[type]}
                    </span>
                    {isRent && (
                      <span className="text-xs text-muted-foreground/60 ml-auto">
                        {t.config.rentLocked}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Notes */}
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
