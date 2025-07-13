'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

// This is a new custom hook that uses next-auth's useSession
export function useAuth() {
  const { data: session, status } = useSession();

  const user = session?.user;
  const isLoading = status === 'loading';

  // The 'token' is not directly available in the client session object for security reasons.
  // API calls from the client should use the session which is handled by NextAuth.js.
  // If you need a JWT for external APIs, you'd typically get it from a backend endpoint.
  // For simplicity, we'll return null for the token here.
  const token = null; 

  return { user, token, isLoading, isAuthenticated: status === 'authenticated' };
}
