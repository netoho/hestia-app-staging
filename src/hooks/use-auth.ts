'use client';

import { useEffect, useState } from 'react';

interface AuthState {
  token: string | null;
  user: any | null;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({ token: null, user: null });

  useEffect(() => {
    // Check localStorage for existing auth
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    
    if (storedToken && storedUser) {
      setAuth({
        token: storedToken,
        user: JSON.parse(storedUser),
      });
    } else {
      // For demo purposes, we'll auto-login as staff
      // Remove this in production
      const demoLogin = async () => {
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'admin@hestia.com',
              password: 'password123'
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            setAuth({ token: data.token, user: data.user });
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('authUser', JSON.stringify(data.user));
          }
        } catch (error) {
          console.error('Demo login failed:', error);
        }
      };
      
      demoLogin();
    }
  }, []);

  const login = (token: string, user: any) => {
    setAuth({ token, user });
    localStorage.setItem('authToken', token);
    localStorage.setItem('authUser', JSON.stringify(user));
  };

  const logout = () => {
    setAuth({ token: null, user: null });
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  return { ...auth, login, logout };
}