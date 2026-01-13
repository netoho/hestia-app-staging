'use client';

import { Info, History } from 'lucide-react';

type ViewMode = 'info' | 'history';

interface ActorViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

export function ActorViewToggle({ value, onChange }: ActorViewToggleProps) {
  return (
    <div className="flex justify-end mb-4">
      <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
        <button
          onClick={() => onChange('info')}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            value === 'info'
              ? 'bg-background text-foreground shadow-sm'
              : 'hover:bg-background/50'
          }`}
        >
          <Info className="h-4 w-4 mr-2" />
          Información
        </button>
        <button
          onClick={() => onChange('history')}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            value === 'history'
              ? 'bg-background text-foreground shadow-sm'
              : 'hover:bg-background/50'
          }`}
        >
          <History className="h-4 w-4 mr-2" />
          Historial
        </button>
      </div>
    </div>
  );
}

export default ActorViewToggle;
