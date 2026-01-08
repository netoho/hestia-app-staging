'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Shimmer from './Shimmer';

export default function DocumentListSkeleton() {
  return (
    <Card className="animate-in fade-in duration-300">
      <CardHeader>
        <Shimmer className="h-6 w-48 mb-2" />
        <Shimmer className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                <Shimmer className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Shimmer className="h-4 w-3/4" />
                  <Shimmer className="h-3 w-1/2" />
                </div>
              </div>
              <Shimmer className="h-9 w-32 rounded-md" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
