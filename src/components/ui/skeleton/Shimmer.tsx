'use client';

import { cn } from '@/lib/utils';

interface ShimmerProps {
  className?: string;
  speed?: 'slow' | 'normal' | 'fast';
}

export default function Shimmer({ className, speed = 'normal' }: ShimmerProps) {
  const speedClass = {
    slow: 'animate-shimmer-slow',
    normal: 'animate-shimmer',
    fast: 'animate-shimmer-fast',
  }[speed];

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gray-200 rounded-md',
        className
      )}
    >
      <div
        className={cn(
          'absolute inset-0 -translate-x-full',
          speedClass,
          'bg-gradient-to-r from-transparent via-white/60 to-transparent'
        )}
      />
    </div>
  );
}
