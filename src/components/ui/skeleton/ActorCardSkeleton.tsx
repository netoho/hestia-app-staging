'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Shimmer from './Shimmer';

export default function ActorCardSkeleton() {
  return (
    <Card className="animate-in fade-in duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shimmer className="h-5 w-5" />
            <Shimmer className="h-5 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Shimmer className="h-6 w-24 rounded-full" />
            <Shimmer className="h-6 w-20 rounded-full" />
            <Shimmer className="h-9 w-20 rounded-md" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <Shimmer className="h-4 w-40" />
            <Shimmer className="h-4 w-12" />
          </div>
          <Shimmer className="h-2 w-full" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center p-2 bg-gray-50 rounded-lg">
              <Shimmer className="h-6 w-8 mx-auto mb-1" />
              <Shimmer className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Shimmer className="h-4 w-40 mb-3" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i}>
                <Shimmer className="h-3 w-20 mb-1" />
                <Shimmer className="h-4 w-full" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <Shimmer className="h-4 w-40 mb-3" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Shimmer className="h-3 w-24 mb-1" />
                <Shimmer className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Documents Section */}
        <div className="mt-6">
          <Shimmer className="h-4 w-32 mb-3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 p-3 border rounded-lg">
                <Shimmer className="h-4 w-4" />
                <div className="flex-1">
                  <Shimmer className="h-4 w-full mb-1" />
                  <Shimmer className="h-3 w-3/4" />
                </div>
                <Shimmer className="h-8 w-8 rounded" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
