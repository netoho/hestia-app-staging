'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import type { FieldErrors, FieldValues, UseFormReturn } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';

/**
 * Reset-on-refetch for wizard tab forms (#171 edit half).
 *
 * Tab forms seed `defaultValues` once at mount, so data refetched AFTER mount
 * (invalidation from a save, the policy-page refresh buttons, a portal save
 * landing while the admin editor is open) never reached the fields. The wizard
 * provides the query's `dataUpdatedAt` through this context; each tab hands the
 * hook its form + freshly computed defaults, and the form resets whenever the
 * server data actually changes.
 *
 * `keepDirtyValues: true` is the decided tradeoff (2026-07-06): fields the user
 * is mid-editing are never clobbered by a background refetch; clean fields sync
 * to the server. Remount-based alternatives were rejected for exactly that
 * clobbering.
 */
export const WizardDataVersionContext = createContext(0);

/** Top-level RHF error keys (nested shapes report their root key). */
export function topLevelErrorKeys(errors: FieldErrors): string[] {
  return Object.keys(errors).filter((key) => key !== 'root');
}

/**
 * Error fields that render no control: nothing carries their
 * `data-field` stamp (see FormControl), so no aria-invalid highlight and no
 * FormMessage can appear — without this guard the save dies silently (#190
 * class: stale row values spread into `defaultValues` fail the schema on
 * fields the active variant never renders).
 */
export function invisibleErrorKeys(
  errors: FieldErrors,
  hasVisibleControl: (key: string) => boolean,
): string[] {
  return topLevelErrorKeys(errors).filter((key) => !hasVisibleControl(key));
}

function fieldIsInDocument(key: string): boolean {
  return !!document.querySelector(`[data-field="${key}"], [data-field^="${key}."]`);
}

export function useWizardDataReset<T extends FieldValues>(
  // TContext/TTransformedValues left open: pinning them re-derives the
  // resolver type at every call site and trips RHF's invariant Resolver<>.
  form: UseFormReturn<T, any, any>,
  values: T,
): void {
  const version = useContext(WizardDataVersionContext);
  const seenVersion = useRef(version);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    if (version === seenVersion.current) return;
    seenVersion.current = version;
    // An active edit session wins outright: `keepDirtyValues` does NOT
    // protect useFieldArray items (RHF rebuilds arrays on reset), so a
    // refetch landing mid-typing on a references tab would clobber
    // just-typed cards. Clean forms (fresh mounts, reopened editors) still
    // re-seed — which is the #171 stale-open case this hook exists for.
    if (Object.keys(form.formState.dirtyFields).length > 0) return;
    form.reset(valuesRef.current, { keepDirtyValues: true });
  }, [version, form]);

  const { toast } = useToast();
  // Reading submitCount through the formState proxy subscribes the tab to it.
  const { submitCount } = form.formState;

  useEffect(() => {
    if (submitCount === 0) return;
    const invisible = invisibleErrorKeys(
      form.formState.errors,
      fieldIsInDocument,
    );
    if (invisible.length === 0) return;
    toast({
      title: 'Hay errores en campos no visibles',
      description: `Revise: ${invisible.join(', ')}. Si el problema persiste contacte a soporte.`,
      variant: 'destructive',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount]);
}
