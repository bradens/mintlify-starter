import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function ApiKeysPageSkeleton() {
  return (
    <>
      {/* Create API Key Button Skeleton */}
      <div className='flex justify-end'>
        <Skeleton className='h-10 w-32' />
      </div>

      {/* Search and filters skeleton */}
      <Card>
        <CardContent className='py-4'>
          <div className='flex items-center space-x-4'>
            <div className='flex-1'>
              <div className='relative'>
                <Skeleton className='h-10 w-full' />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys Table Skeleton */}
      <Card>
        <CardContent className='p-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Rate Limit</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className='w-[100px]'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className='h-4 w-[120px]' />
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center space-x-2'>
                      <Skeleton className='h-6 w-[180px]' />
                      <Skeleton className='h-6 w-6' />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-6 w-[60px] rounded-full' />
                  </TableCell>
                  <TableCell>
                    <div className='space-y-1'>
                      <Skeleton className='h-4 w-[100px]' />
                      <Skeleton className='h-1.5 w-full rounded-full' />
                      <Skeleton className='h-3 w-[60px]' />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-4 w-[80px]' />
                  </TableCell>
                  <TableCell>
                    <div className='space-y-1'>
                      <Skeleton className='h-4 w-[120px]' />
                      <Skeleton className='h-3 w-[100px]' />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-8 w-8 rounded' />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Skeleton */}
      <div className='flex items-center justify-between'>
        <Skeleton className='h-4 w-[100px]' />
        <div className='flex items-center space-x-2'>
          <Skeleton className='h-8 w-20' />
          <Skeleton className='h-8 w-16' />
        </div>
      </div>
    </>
  );
}
