'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';

export default function NewsletterForm() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <form className="flex gap-2">
      <Input
        type="email"
        placeholder={t.layout.newsletterForm.emailPlaceholder}
        className="bg-background"
        aria-label={t.layout.newsletterForm.emailPlaceholder}
        disabled={!isClient}
      />
      <Button
        type="submit"
        variant="default"
        className="bg-primary hover:bg-primary/90"
        disabled={!isClient}
      >
        {t.layout.newsletterForm.subscribe}
      </Button>
    </form>
  );
}
