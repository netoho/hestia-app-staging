import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  ariaLabelledby?: string;
  as?: keyof JSX.IntrinsicElements; // Allows specifying the HTML tag, defaults to 'section'
}

export function Section({ children, className, id, ariaLabelledby, as = 'section' }: SectionProps) {
  const Component = as;
  return (
    <Component
      id={id}
      aria-labelledby={ariaLabelledby}
      className={cn('py-12 md:py-16 lg:py-20', className)}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </Component>
  );
}
