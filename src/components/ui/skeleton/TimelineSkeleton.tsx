'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Shimmer from './Shimmer';

export default function TimelineSkeleton() {
  return (
    <Card className="animate-in fade-in duration-300">
      <CardHeader>
        <Shimmer className="h-6 w-48 mb-2" />
        <Shimmer className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 pb-4 border-b last:border-0"
            >
              <Shimmer className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Shimmer className="h-4 w-3/4" />
                <Shimmer className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
