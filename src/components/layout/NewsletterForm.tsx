'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function NewsletterForm() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Render a placeholder on the server to prevent layout shift
    return (
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          className="bg-background"
          aria-label="Email for newsletter"
          disabled
        />
        <Button
          type="submit"
          variant="default"
          className="bg-primary hover:bg-primary/90"
          disabled
        >
          Subscribe
        </Button>
      </div>
    );
  }

  return (
    <form className="flex gap-2">
      <Input
        type="email"
        placeholder="Enter your email"
        className="bg-background"
        aria-label="Email for newsletter"
      />
      <Button
        type="submit"
        variant="default"
        className="bg-primary hover:bg-primary/90"
      >
        Subscribe
      </Button>
    </form>
  );
}
