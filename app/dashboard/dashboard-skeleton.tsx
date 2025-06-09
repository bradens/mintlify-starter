import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardPageSkeleton() {
  return (
    <div className='space-y-6'>
      {/* Welcome Section Skeleton */}
      <div className='space-y-2'>
        <Skeleton className='h-8 w-[300px]' />
        <Skeleton className='h-4 w-[400px]' />
      </div>

      {/* Summary Metrics Skeleton */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div className='space-y-2'>
                  <Skeleton className='h-4 w-[100px]' />
                  <Skeleton className='h-8 w-[80px]' />
                  <Skeleton className='h-3 w-[120px]' />
                </div>
                <Skeleton className='h-8 w-8 rounded' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* API Keys Overview Skeleton */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='space-y-2'>
              <Skeleton className='h-6 w-[150px]' />
              <Skeleton className='h-4 w-[200px]' />
            </div>
            <Skeleton className='h-9 w-[100px]' />
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {/* Table headers */}
            <div className='grid grid-cols-5 gap-4 pb-2 border-b'>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className='h-4 w-full' />
              ))}
            </div>
            {/* Table rows */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className='grid grid-cols-5 gap-4 py-2'>
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className='h-4 w-full' />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usage Chart Skeleton */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='space-y-2'>
              <Skeleton className='h-6 w-[150px]' />
              <Skeleton className='h-4 w-[200px]' />
            </div>
            <Skeleton className='h-9 w-[120px]' />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className='h-[300px] w-full' />
        </CardContent>
      </Card>
    </div>
  );
}
