'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { receipts as t } from '@/lib/i18n/pages/receipts';

export default function MagicLinkForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const requestMagicLink = trpc.receipt.requestMagicLink.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      await requestMagicLink.mutateAsync({ email: email.trim().toLowerCase() });
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error && error.message.includes('No encontramos')
          ? t.magicLink.errorNotFound
          : t.magicLink.errorGeneric
      );
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg border-0">
      <CardHeader className="text-center" style={{ background: 'linear-gradient(to bottom, #ffffff, #f0f9ff)', borderBottom: '1px solid #d4dae1' }}>
        <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: '#173459' }}>
          <FileText className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="font-headline text-2xl" style={{ color: '#173459' }}>
          {t.magicLink.title}
        </CardTitle>
        <CardDescription className="text-base">
          {t.magicLink.subtitle}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        {status === 'success' ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <p className="font-semibold mb-1">{t.magicLink.successTitle}</p>
              <p className="text-sm">{t.magicLink.successMessage}</p>
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t.magicLink.emailLabel}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t.magicLink.emailPlaceholder}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={status === 'submitting'}
              />
            </div>

            {status === 'error' && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 text-sm">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full text-white"
              style={{ backgroundColor: '#FF7F50' }}
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.magicLink.submitting}
                </>
              ) : (
                t.magicLink.submit
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
