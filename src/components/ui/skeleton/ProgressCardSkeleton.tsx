'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Shimmer from './Shimmer';

export default function ProgressCardSkeleton() {
  return (
    <Card className="animate-in fade-in duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shimmer className="h-5 w-5" />
            <Shimmer className="h-6 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Shimmer className="h-6 w-20 rounded-full" />
          <Shimmer className="h-6 w-16 rounded-full" />
          <Shimmer className="h-9 w-16 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <Shimmer className="h-4 w-24" />
              <Shimmer className="h-4 w-12" />
            </div>
            <Shimmer className="h-2 w-full rounded-full" />
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg">
                <Shimmer className="h-8 w-12 mx-auto mb-1" />
                <Shimmer className="h-3 w-16 mx-auto" />
              </div>
            ))}
          </div>

          {/* Action Button */}
          <Shimmer className="h-9 w-full rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}
