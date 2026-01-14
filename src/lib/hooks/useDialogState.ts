'use client';

import { useState, useCallback } from 'react';

interface DialogStateReturn<T = undefined> {
  isOpen: boolean;
  data: T | undefined;
  open: T extends undefined ? () => void : (data: T) => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Hook for managing dialog open/close state with optional metadata.
 *
 * @example
 * // Basic usage
 * const dialog = useDialogState();
 * <Dialog open={dialog.isOpen} onOpenChange={(open) => open ? dialog.open() : dialog.close()}>
 *
 * @example
 * // With metadata
 * const dialog = useDialogState<{ actorId: string; actorName: string }>();
 * dialog.open({ actorId: '123', actorName: 'John' });
 * console.log(dialog.data?.actorId);
 */
export function useDialogState<T = undefined>(): DialogStateReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | undefined>(undefined);

  const open = useCallback((openData?: T) => {
    setData(openData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(undefined);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return {
    isOpen,
    data,
    open: open as DialogStateReturn<T>['open'],
    close,
    toggle,
  };
}

export default useDialogState;
