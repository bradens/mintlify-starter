import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function UsagePageSkeleton() {
  return (
    <div className='space-y-6'>
      {/* Controls Skeleton */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'>
          <div className='flex items-center space-x-2'>
            <Skeleton className='h-4 w-20' />
            <Skeleton className='h-10 w-32' />
          </div>
          <div className='flex items-center space-x-2'>
            <Skeleton className='h-4 w-16' />
            <Skeleton className='h-10 w-[200px]' />
          </div>
        </div>
        <Skeleton className='h-10 w-24' />
      </div>

      {/* Summary Metrics Skeleton */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div className='space-y-2'>
                  <Skeleton className='h-4 w-[120px]' />
                  <Skeleton className='h-8 w-[80px]' />
                  <Skeleton className='h-3 w-[140px]' />
                </div>
                <Skeleton className='h-8 w-8 rounded' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section Skeleton */}
      <div className='space-y-6'>
        {/* Requests Over Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className='h-6 w-[160px]' />
            </CardTitle>
            <Skeleton className='h-4 w-[250px]' />
          </CardHeader>
          <CardContent>
            <Skeleton className='h-[300px] w-full' />
          </CardContent>
        </Card>

        {/* Subscriptions and Webhooks Row */}
        <div className='grid gap-6 lg:grid-cols-2'>
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className='h-6 w-[180px]' />
              </CardTitle>
              <Skeleton className='h-4 w-[220px]' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-[300px] w-full' />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className='h-6 w-[160px]' />
              </CardTitle>
              <Skeleton className='h-4 w-[200px]' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-[300px] w-full' />
            </CardContent>
          </Card>
        </div>

        {/* Combined Chart */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className='h-6 w-[200px]' />
            </CardTitle>
            <Skeleton className='h-4 w-[280px]' />
          </CardHeader>
          <CardContent>
            <Skeleton className='h-[300px] w-full' />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
