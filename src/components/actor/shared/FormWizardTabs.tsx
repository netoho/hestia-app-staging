import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  needsSave?: boolean;
}

interface FormWizardTabsProps {
  tabs: Tab[];
  activeTab: string;
  tabSaved: Record<string, boolean>;
  isAdminEdit?: boolean;
  onTabChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function FormWizardTabs({
  tabs,
  activeTab,
  tabSaved,
  isAdminEdit = false,
  onTabChange,
  children,
  className
}: FormWizardTabsProps) {
  // Check if a tab can be accessed based on previous tabs
  const canAccessTab = (tabId: string) => {
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
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={onTabChange}
      className={cn("w-full", className)}
    >
      <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => {
          const isDisabled = !canAccessTab(tab.id);
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              disabled={isDisabled}
              className={cn(
                isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              )}
            >
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {children}
    </Tabs>
  );
}