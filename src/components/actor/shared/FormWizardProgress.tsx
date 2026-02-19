import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

interface Tab {
  id: string;
  label: string;
  needsSave?: boolean;
}

interface FormWizardProgressProps {
  tabs: Tab[];
  tabSaved: Record<string, boolean>;
  variant?: 'bars' | 'progress';
  className?: string;
}

export function FormWizardProgress({
  tabs,
  tabSaved,
  variant = 'bars',
  className
}: FormWizardProgressProps) {
  // Only count tabs that need saving
  const savableTabs = tabs.filter(t => t.needsSave);
  const savedCount = savableTabs.filter(t => tabSaved[t.id]).length;
  const totalCount = savableTabs.length;
  const progressPercentage = totalCount > 0 ? (savedCount / totalCount) * 100 : 0;

  return (
    <Card className={cn("mb-6", className)}>
      <CardContent className="pt-6">
        {/* Mobile: Stacked layout */}
        <div className="block sm:hidden space-y-2">
          <div className="text-sm font-medium">{t.pages.createPolicy.progress.title}</div>
          <div className="text-sm text-muted-foreground">
            {t.pages.createPolicy.progress.saved(savedCount, totalCount)}
          </div>
          <div className="mt-3">
            {variant === 'bars' ? (
              <div className="flex gap-2">
                {savableTabs.map((tab) => (
                  <div
                    key={tab.id}
                    className={cn(
                      "h-2 flex-1 rounded-full",
                      tabSaved[tab.id] ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
            ) : (
              <Progress value={progressPercentage} className="w-full" />
            )}
          </div>
        </div>

        {/* Desktop: Side-by-side layout */}
        <div className="hidden sm:block">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t.pages.createPolicy.progress.title}</span>
            <span className="text-sm text-muted-foreground">
              {t.pages.createPolicy.progress.saved(savedCount, totalCount)}
            </span>
          </div>
          {variant === 'bars' ? (
            <div className="flex gap-2">
              {savableTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={cn(
                    "h-2 flex-1 rounded-full",
                    tabSaved[tab.id] ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
          ) : (
            <Progress value={progressPercentage} className="w-full" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}