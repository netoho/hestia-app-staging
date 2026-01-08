'use client';

import { passwordRequirements } from '@/lib/validation/password';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordRequirementsProps {
  /** Current password value to check */
  password: string;
  /** Whether to show the component */
  show?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Displays password requirements with live validation feedback
 */
export function PasswordRequirements({
  password,
  show = true,
  className,
}: PasswordRequirementsProps) {
  if (!show) return null;

  return (
    <div className={cn('space-y-2 p-3 bg-muted rounded-lg', className)}>
      <p className="text-sm font-medium">Requisitos de la contraseña:</p>
      <div className="space-y-1">
        {passwordRequirements.map((req, index) => {
          const met = req.check(password || '');
          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              {met ? (
                <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
              ) : (
                <X className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
              <span className={met ? 'text-green-700' : 'text-muted-foreground'}>
                {req.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
