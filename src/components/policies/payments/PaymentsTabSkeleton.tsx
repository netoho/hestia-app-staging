'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Shimmer from '@/components/ui/skeleton/Shimmer';

export default function PaymentsTabSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Summary Card Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Shimmer className="h-6 w-40" />
            <Shimmer className="h-6 w-24 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Shimmer className="h-4 w-20" />
              <Shimmer className="h-6 w-28" />
            </div>
            <div className="space-y-2">
              <Shimmer className="h-4 w-20" />
              <Shimmer className="h-6 w-28" />
            </div>
          </div>
          <Shimmer className="h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Payment Cards Skeleton */}
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Shimmer className="h-5 w-36" />
              <Shimmer className="h-5 w-20 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <Shimmer className="h-4 w-16" />
              <Shimmer className="h-5 w-24" />
            </div>
            <div className="flex justify-between">
              <Shimmer className="h-4 w-20" />
              <Shimmer className="h-4 w-16" />
            </div>
            <div className="pt-2 flex gap-2">
              <Shimmer className="h-9 w-32" />
              <Shimmer className="h-9 w-36" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
