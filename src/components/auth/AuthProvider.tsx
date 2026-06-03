'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  // Disable refetch-on-window-focus: it fires GET /api/auth/session every time
  // the tab regains focus, re-rendering consumers and (in long actor edit forms)
  // wiping unsaved input. The session is still refreshed on navigation.
  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>;
}
