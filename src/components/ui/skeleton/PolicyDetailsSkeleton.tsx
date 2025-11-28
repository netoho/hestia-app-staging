'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Shimmer from './Shimmer';

export default function PolicyDetailsSkeleton() {
  return (
    <div className="container mx-auto p-6 max-w-7xl animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Shimmer className="h-10 w-24 rounded-md" />
          <div>
            <Shimmer className="h-8 w-64 mb-2" />
            <Shimmer className="h-4 w-96" />
          </div>
          <Shimmer className="h-6 w-32 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Shimmer className="h-10 w-40 rounded-md" />
          <Shimmer className="h-10 w-40 rounded-md" />
        </div>
      </div>

      {/* Progress Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shimmer className="h-5 w-5" />
              <Shimmer className="h-6 w-40" />
            </div>
            <Shimmer className="h-6 w-32 rounded-full" />
          </div>
          <Shimmer className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Main Progress Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <Shimmer className="h-4 w-32" />
                <Shimmer className="h-5 w-12" />
              </div>
              <Shimmer className="h-3 w-full rounded-full" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                  <Shimmer className="h-8 w-12 mx-auto mb-2" />
                  <Shimmer className="h-3 w-24 mx-auto" />
                </div>
              ))}
            </div>

            {/* Alert */}
            <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <Shimmer className="h-4 w-4 rounded-full" />
              <Shimmer className="h-4 w-3/4" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="space-y-4">
        {/* Tabs List */}
        <div className="flex gap-2 border-b">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Shimmer key={i} className="h-10 w-24 rounded-t-md" />
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Property Card Skeleton */}
          <Card>
            <CardHeader>
              <Shimmer className="h-6 w-48 mb-2" />
              <Shimmer className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i}>
                  <Shimmer className="h-3 w-32 mb-1" />
                  <Shimmer className="h-4 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pricing Card Skeleton */}
          <Card>
            <CardHeader>
              <Shimmer className="h-6 w-48 mb-2" />
              <Shimmer className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Shimmer className="h-3 w-32 mb-1" />
                  <Shimmer className="h-4 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Timeline Card Skeleton */}
        <Card>
          <CardHeader>
            <Shimmer className="h-6 w-48 mb-2" />
            <Shimmer className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center">
                  <Shimmer className="h-4 w-full mb-2" />
                  <Shimmer className="h-3 w-3/4 mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
