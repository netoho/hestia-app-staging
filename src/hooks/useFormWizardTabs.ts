import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Tab {
  id: string;
  label: string;
  needsSave?: boolean;
}

interface UseFormWizardTabsOptions {
  tabs: Tab[];
  isAdminEdit?: boolean;
  initialActiveTab?: string;
  autoAdvanceDelay?: number;
}

// Check if a tab can be accessed based on previous tabs
const canAccessTab = (tabId: string, tabs: Tab[], isAdminEdit: boolean, tabSaved: Record<string, boolean>) => {
  if (isAdminEdit) return true;

  // If this tab is already saved, allow access (can go back to edit)
  if (tabSaved[tabId]) return true;

  const tabIndex = tabs.findIndex(t => t.id === tabId);
  if (tabIndex <= 0) return true;

  // For unsaved tabs, check if all previous required tabs are saved
  for (let i = 0; i < tabIndex; i++) {
    const prevTab = tabs[i];
    if (prevTab.needsSave && !tabSaved[prevTab.id]) {
      return false;
    }
  }
  return true;
}

export function useFormWizardTabs({
  tabs,
  isAdminEdit = false,
  initialActiveTab = 'personal',
  autoAdvanceDelay = 1000
}: UseFormWizardTabsOptions) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [tabSaved, setTabSaved] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    tabs.forEach(tab => {
      initial[tab.id] = false;
    });
    return initial;
  });
  const [savingTab, setSavingTab] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Go to the next available tab
  const goToNextTab = useCallback((updatedTabSaved?: Record<string, boolean>) => {
    const currentTabSaved = updatedTabSaved ?? tabSaved;
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex < tabs.length - 1) {
      const nextTab = tabs[currentIndex + 1];
      if (canAccessTab(nextTab.id, tabs, isAdminEdit, currentTabSaved)) {
        setActiveTab(nextTab.id);
        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [activeTab, tabs, isAdminEdit, tabSaved]);

  // Clear error for a specific field
  const clearError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Handle tab save with validation
  const handleTabSave = useCallback(async (
    tabName: string,
    validate: () => { valid: boolean; errors?: Record<string, string> } | boolean,
    saveData: () => Promise<void>
  ) => {
    setSavingTab(tabName);
    clearAllErrors();

    try {
      // Validate
      const validationResult = validate();
      const isValid = typeof validationResult === 'boolean'
        ? validationResult
        : validationResult.valid;
      const validationErrors = typeof validationResult === 'object'
        ? validationResult.errors
        : undefined;

      if (!isValid) {
        if (validationErrors) {
          setErrors(validationErrors);
          // Show first error in toast
          const firstError = Object.values(validationErrors)[0];
          toast({
            title: "Error de validación",
            description: firstError,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error de validación",
            description: "Por favor revisa los campos requeridos",
            variant: "destructive"
          });
        }
        return false;
      }

      // Save data
      await saveData();

      // Mark tab as saved and get fresh state
      const newTabSaved = { ...tabSaved, [tabName]: true };
      setTabSaved(newTabSaved);

      // Auto-advance to next tab with fresh state
      goToNextTab(newTabSaved);

      return true;
    } catch (error: any) {
      console.error(`Error saving ${tabName}:`, error);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al guardar",
        variant: "destructive"
      });
      return false;
    } finally {
      setSavingTab(null);
    }
  }, [toast, clearAllErrors, goToNextTab]);

  // Mark a tab as saved manually (useful for initial data)
  const markTabSaved = useCallback((tabId: string, saved: boolean = true) => {
    setTabSaved(prev => ({
      ...prev,
      [tabId]: saved
    }));
  }, []);

  // Mark multiple tabs as saved
  const markTabsSaved = useCallback((tabIds: string[], saved: boolean = true) => {
    setTabSaved(prev => {
      const updated = { ...prev };
      tabIds.forEach(id => {
        updated[id] = saved;
      });
      return updated;
    });
  }, []);

  // Reset all tabs to unsaved
  const resetTabs = useCallback(() => {
    const reset: Record<string, boolean> = {};
    tabs.forEach(tab => {
      reset[tab.id] = false;
    });
    setTabSaved(reset);
    setActiveTab(tabs[0]?.id || 'personal');
    setSavingTab(null);
    setErrors({});
  }, [tabs]);

  // Check if we are on last tab and all tabs are saved
  const isLastTabAndAllSaved = useCallback(() => {
    const allSaved = tabs.filter(t => t.needsSave).every(t => tabSaved[t.id]);
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    return allSaved && currentIndex === tabs.length - 1;
  }, [activeTab, tabs, tabSaved]);

  // Get progress information
  const getProgress = useCallback(() => {
    const savableTabs = tabs.filter(t => t.needsSave);
    const savedCount = savableTabs.filter(t => tabSaved[t.id]).length;
    const totalCount = savableTabs.length;
    const percentage = totalCount > 0 ? (savedCount / totalCount) * 100 : 0;

    return {
      savedCount,
      totalCount,
      percentage,
      isComplete: savedCount === totalCount
    };
  }, [tabs, tabSaved]);

  return {
    // State
    activeTab,
    tabSaved,
    savingTab,
    errors,

    // Actions
    setActiveTab,
    setSavingTab,
    handleTabSave,
    markTabSaved,
    markTabsSaved,
    resetTabs,
    clearError,
    clearAllErrors,
    goToNextTab,

    // Utilities
    canAccessTab,
    getProgress,
    isLastTabAndAllSaved
  };
}
