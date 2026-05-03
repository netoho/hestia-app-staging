'use client';

import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';

interface GreetingProps {
  firstName?: string | null;
  role?: string | null;
}

function timeOfDayKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 19) return 'afternoon';
  return 'evening';
}

export function Greeting({ firstName, role }: GreetingProps) {
  // Initialize with the server-side hour to keep SSR markup stable; refresh on
  // mount so the user sees the correct local time-of-day even if the server
  // and browser disagree.
  const [hour, setHour] = useState<number>(() => new Date().getHours());

  useEffect(() => {
    setHour(new Date().getHours());
  }, []);

  const greetingKey = timeOfDayKey(hour);
  const base = t.pages.dashboard.greeting[greetingKey];
  const display = firstName ? `${base}, ${firstName}` : t.pages.dashboard.greeting.fallback;
  const subtitle =
    role === 'BROKER'
      ? t.pages.dashboard.greeting.subtitleBroker
      : t.pages.dashboard.greeting.subtitleStaff;

  return (
    <div className="space-y-1">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{display}</h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
