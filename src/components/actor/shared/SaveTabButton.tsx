import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';

interface SaveTabButtonProps {
  tabName: string;
  savingTab: string | null;
  isSaved: boolean;
  onSave: () => void;
  disabled?: boolean;
  className?: string;
}

export function SaveTabButton({
  tabName,
  savingTab,
  isSaved,
  onSave,
  disabled = false,
  className
}: SaveTabButtonProps) {
  const isLoading = savingTab === tabName;

  return (
    <div className="flex justify-end">
      <Button
        onClick={onSave}
        disabled={disabled || isLoading}
        className={className}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando...
          </>
        ) : isSaved ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Guardado - Continuar
          </>
        ) : (
          'Guardar y Continuar'
        )}
      </Button>
    </div>
  );
}