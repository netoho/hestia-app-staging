import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageTitleProps {
  title: string;
  subtitle?: string | ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'center' | 'right';
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
}

const sizeClasses = {
  sm: {
    title: "text-3xl md:text-4xl font-headline font-bold text-primary tracking-tight",
    subtitle: "mt-2 text-base md:text-lg text-muted-foreground"
  },
  md: {
    title: "text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight",
    subtitle: "mt-2 text-lg text-muted-foreground"
  },
  lg: {
    title: "text-5xl md:text-6xl lg:text-7xl font-headline font-bold text-primary tracking-tight",
    subtitle: "mt-3 text-xl md:text-2xl text-muted-foreground"
  },
  xl: {
    title: "text-6xl md:text-7xl lg:text-8xl font-headline font-bold text-primary tracking-tight",
    subtitle: "mt-4 text-2xl md:text-3xl text-muted-foreground"
  }
};

const alignClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right"
};

export function PageTitle({ title, subtitle, size = 'lg', align = 'center', className, titleClassName, subtitleClassName }: PageTitleProps) {
  const sizeClass = sizeClasses[size];
  const alignClass = alignClasses[align];
  
  return (
    <div className={cn("mb-8", alignClass, className)}>
      <h1 className={cn(sizeClass.title, titleClassName)}>
        {title}
      </h1>
      {subtitle && (
        <p className={cn(sizeClass.subtitle, subtitleClassName)}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
