'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function NewsletterForm() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // To prevent hydration mismatch, we render the form structure on both
  // the server and the client, but disable the inputs on the server.
  // The isClient state transition will re-render the component on the client
  // with the inputs enabled.
  return (
    <form className="flex gap-2">
      <Input
        type="email"
        placeholder="Enter your email"
        className="bg-background"
        aria-label="Email for newsletter"
        disabled={!isClient}
      />
      <Button
        type="submit"
        variant="default"
        className="bg-primary hover:bg-primary/90"
        disabled={!isClient}
      >
        Subscribe
      </Button>
    </form>
  );
}
