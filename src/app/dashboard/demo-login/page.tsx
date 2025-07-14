'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

export default function DemoLoginPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    setToken(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      setToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Demo Login - Get Auth Token</CardTitle>
          <CardDescription>
            Use this page to get an authentication token for testing the API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => handleLogin('admin@hestiaplp.com.mx', 'password123')}
              disabled={isLoading}
              variant="outline"
            >
              Login as Staff Admin
            </Button>
            <Button
              onClick={() => handleLogin('broker@hestiaplp.com.mx', 'password123')}
              disabled={isLoading}
              variant="outline"
            >
              Login as Broker
            </Button>
            <Button
              onClick={() => handleLogin('tenant@hestiaplp.com.mx', 'password123')}
              disabled={isLoading}
              variant="outline"
            >
              Login as Tenant
            </Button>
            <Button
              onClick={() => handleLogin('landlord@hestiaplp.com.mx', 'password123')}
              disabled={isLoading}
              variant="outline"
            >
              Login as Landlord
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {token && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Success! Your auth token is:</strong>
                <div className="mt-2 p-2 bg-muted rounded font-mono text-xs break-all">
                  {token}
                </div>
                <div className="mt-2 text-sm">
                  Use this token in the Authorization header: <code>Bearer {token}</code>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
