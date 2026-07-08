'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFormWizardTabs } from '@/hooks/useFormWizardTabs';
import { trpc } from '@/lib/trpc/client';
import { getFriendlyError } from '@/lib/utils/trpcErrors';
import { FormWizardProgress } from '@/components/actor/shared/FormWizardProgress';
import { FormWizardTabs } from '@/components/actor/shared/FormWizardTabs';
import { WizardDataVersionContext } from '@/components/actor/shared/useWizardDataReset';

/**
 * Generic actor wizard (T3, #127) — the single component behind every actor
 * portal AND the inline admin editor. The four per-actor
 * `*FormWizard-Simplified.tsx` files it replaced were ~60% identical; what
 * actually varies is captured in an {@link ActorWizardConfig}:
 * tab lists, the type discriminator, the tab content, and the save dispatch
 * (landlord fans out to three mutations + co-owner delete).
 *
 * Portal and admin render the SAME component — the only sanctioned difference
 * is navigation policy (`isAdminEdit` unlocks free tab access). Divergence
 * between the two surfaces is a bug by decision (2026-07-06, #171/#180).
 */

/** Single tab-config shape (kills the per-wizard casts over actorConfig). */
export interface WizardTab {
  id: string;
  label: string;
  needsSave?: boolean;
  required?: boolean;
}

export type WizardActorType = 'tenant' | 'landlord' | 'jointObligor' | 'aval';

export interface ActorWizardProps {
  config: ActorWizardConfig;
  /** Actor portal token — or the actor id in admin-edit flows (dual auth). */
  token: string;
  initialData?: any;
  policy?: any;
  /** Landlord portals: the record the presented token belongs to. */
  selfId?: string | null;
  onComplete?: () => void;
  isAdminEdit?: boolean;
  /**
   * Fires after EACH successful tab save. The admin editor uses it to refetch
   * the outer policy so ActorCard/tabs/overview reflect the edit (#216). The
   * portal doesn't pass it — so this is inherently admin-scoped.
   */
  onSaved?: () => void;
  /**
   * The feeding query's `dataUpdatedAt`. Tabs adopting useWizardDataReset
   * re-seed from fresh `initialData` whenever this bumps (#171 edit half).
   */
  dataUpdatedAt?: number;
}

/** Everything a config's render functions receive. */
export interface ActorWizardRenderCtx {
  token: string;
  initialData: any;
  policy?: any;
  isAdminEdit: boolean;
  isCompany: boolean;
  /** The actor record this wizard session belongs to (landlord: self-scoped). */
  self: any;
  disabled: boolean;
  allTabsSaved: boolean;
  /** Curried per-tab save: pass to the tab's onSave. */
  saveTab: (tabName: string) => (data: any) => Promise<void>;
  /** Per-actor extra handlers (e.g. landlord's deleteCoOwner). */
  extras: Record<string, unknown>;
  /** Documents-tab additional info, owned by the wizard shell. */
  additionalInfo: string;
  setAdditionalInfo: (value: string) => void;
  setRequiredDocsUploaded: (value: boolean) => void;
}

export interface ActorWizardSave {
  saveTab: (tabName: string, data: any) => Promise<void>;
  isSaving: boolean;
  extras?: Record<string, unknown>;
}

export interface ActorWizardConfig {
  actorType: WizardActorType;
  initialActiveTab: string;
  /** Resolve the variant + self record from the fetched data. */
  resolveContext(initialData: any, selfId?: string | null): { isCompany: boolean; self: any };
  getTabs(isCompany: boolean): WizardTab[];
  /** Custom hook wiring the actor's mutations (called once per mount). */
  useSave(args: { token: string }): ActorWizardSave;
  /** Payload for the final documents-tab save. */
  getDocumentsSaveData(additionalInfo: string): Record<string, unknown>;
  /** Content for a save-tab (everything except 'documents'). */
  renderTab(tabId: string, ctx: ActorWizardRenderCtx): ReactNode;
  /** The actor's DocumentsSection — the wizard shell owns the form + gate. */
  renderDocumentsSection(ctx: ActorWizardRenderCtx): ReactNode;
}

/**
 * Shared save hook for the single-mutation actors (tenant / jointObligor /
 * aval): `actor.update` with `{ partial: true, tabName }` + getByToken
 * invalidation. Landlord defines its own dispatch in its config.
 */
export function useActorUpdateSave(
  type: WizardActorType,
  token: string,
): ActorWizardSave {
  const utils = trpc.useUtils();
  const updateMutation = trpc.actor.update.useMutation({
    onSuccess: () => {
      utils.actor.getByToken.invalidate({ type, token });
    },
  });

  const saveTab = useCallback(
    async (tabName: string, data: any) => {
      await updateMutation.mutateAsync({
        type,
        identifier: token,
        data: { ...data, partial: true, tabName },
      });
    },
    [type, token, updateMutation],
  );

  return { saveTab, isSaving: updateMutation.isPending };
}

export default function ActorWizard({
  config,
  token,
  initialData = {},
  policy,
  selfId = null,
  onComplete,
  isAdminEdit = false,
  onSaved,
  dataUpdatedAt = 0,
}: ActorWizardProps) {
  const { toast } = useToast();
  const [requiredDocsUploaded, setRequiredDocsUploaded] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState(initialData?.additionalInfo || '');
  // Scopes the save button's requestSubmit to THIS wizard's forms. A bare
  // document.querySelector('form') submits the first form in the whole
  // document — on the admin surface the dialog portals to body-end, so any
  // form on the underlying page would hijack the save silently.
  const contentRef = useRef<HTMLDivElement>(null);

  const { isCompany, self } = config.resolveContext(initialData, selfId);
  const tabs = config.getTabs(isCompany);

  const wizard = useFormWizardTabs({
    tabs,
    isAdminEdit,
    initialActiveTab: config.initialActiveTab,
  });

  const { saveTab, isSaving, extras = {} } = config.useSave({ token });

  const handleTabSave = useCallback(
    async (tabName: string, data: any): Promise<void> => {
      try {
        toast({ title: 'Guardando...', description: 'Guardando información...' });

        await saveTab(tabName, data);

        toast({ title: '✓ Guardado', description: 'Información guardada exitosamente' });

        // Mark tab as saved and advance (pass fresh state to avoid stale closure)
        const newTabSaved = { ...wizard.tabSaved, [tabName]: true };
        wizard.markTabSaved(tabName);
        wizard.goToNextTab(newTabSaved);

        // Refetch the outer policy so admin ActorCard/tabs/overview reflect
        // this edit (#216) — no-op on the portal, which passes no onSaved.
        onSaved?.();

        // Only the public portal completes; admin closes via its own CTA.
        if (wizard.isLastTabAndAllSaved() && !isAdminEdit) {
          onComplete?.();
        }
      } catch (error) {
        console.error('Save error:', error);
        const friendly = getFriendlyError(error);
        toast({
          title: friendly.title,
          description: friendly.description,
          variant: 'destructive',
        });
      }
    },
    [saveTab, wizard, toast, isAdminEdit, onComplete, onSaved],
  );

  const allTabsSaved = tabs
    .filter((t) => t.id !== 'documents' && t.needsSave)
    .every((t) => wizard.tabSaved[t.id]);

  const renderCtx: ActorWizardRenderCtx = {
    token,
    initialData,
    policy,
    isAdminEdit,
    isCompany,
    self,
    disabled: isSaving,
    allTabsSaved,
    saveTab: (tabName) => (data) => handleTabSave(tabName, data),
    extras,
    additionalInfo,
    setAdditionalInfo,
    setRequiredDocsUploaded,
  };

  const currentIndex = tabs.findIndex((t) => t.id === wizard.activeTab);

  return (
    <WizardDataVersionContext.Provider value={dataUpdatedAt}>
    <div className="space-y-6" ref={contentRef}>
      <FormWizardProgress tabs={tabs} tabSaved={wizard.tabSaved} />

      <FormWizardTabs
        tabs={tabs}
        activeTab={wizard.activeTab}
        tabSaved={wizard.tabSaved}
        isAdminEdit={isAdminEdit}
        onTabChange={(tabId) => {
          if (wizard.canAccessTab(tabId, tabs, isAdminEdit, wizard.tabSaved)) {
            wizard.setActiveTab(tabId);
          } else {
            toast({
              title: 'Completar tab anterior',
              description: 'Debe completar el tab anterior antes de continuar',
              variant: 'destructive',
            });
          }
        }}
      >
        <div className="mt-6">
          {wizard.activeTab === 'documents' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!requiredDocsUploaded) {
                  toast({
                    title: 'Documentos requeridos',
                    description:
                      'Por favor cargue todos los documentos requeridos antes de continuar',
                    variant: 'destructive',
                  });
                  return;
                }
                handleTabSave('documents', config.getDocumentsSaveData(additionalInfo));
              }}
            >
              {config.renderDocumentsSection(renderCtx)}
              <button type="submit" className="hidden" />
            </form>
          ) : (
            config.renderTab(wizard.activeTab, renderCtx)
          )}
        </div>
      </FormWizardTabs>

      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => {
            if (currentIndex > 0) {
              wizard.setActiveTab(tabs[currentIndex - 1].id);
            }
          }}
          disabled={currentIndex === 0}
        >
          Anterior
        </Button>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              // Trigger form submission in the active tab (one form per tab),
              // scoped to this wizard's subtree.
              contentRef.current?.querySelector('form')?.requestSubmit();
            }}
            disabled={isSaving}
          >
            {isSaving
              ? 'Guardando...'
              : wizard.activeTab === 'documents'
                ? 'Enviar Información'
                : 'Guardar y Continuar'}
          </Button>
        </div>
      </div>
    </div>
    </WizardDataVersionContext.Provider>
  );
}
