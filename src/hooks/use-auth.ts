'use client';

import { useSession } from 'next-auth/react';

// This is a new custom hook that uses next-auth's useSession
export function useAuth() {
  const { data: session, status } = useSession();

  const user = session?.user;
  const isLoading = status === 'loading';

  return { user, isLoading, isAuthenticated: status === 'authenticated' };
}
