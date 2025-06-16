import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageTitleProps {
  title: string;
  subtitle?: string | ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

export function PageTitle({ title, subtitle, className, titleClassName, subtitleClassName }: PageTitleProps) {
  return (
    <div className={cn("mb-8 text-center md:text-left", className)}>
      <h1 className={cn("text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight", titleClassName)}>
        {title}
      </h1>
      {subtitle && (
        <p className={cn("mt-2 text-lg text-muted-foreground", subtitleClassName)}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
