import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function HomePage() {
  return (
    <div className='min-h-screen bg-background p-8'>
      <div className='mx-auto max-w-4xl space-y-8'>
        {/* Header */}
        <div className='space-y-2'>
          <h1 className='text-4xl font-bold text-foreground'>Dashboard</h1>
          <p className='text-muted-foreground'>Welcome to your crypto API dashboard</p>
          <div className='flex gap-2'>
            <Badge variant='default'>Shadcn UI</Badge>
            <Badge variant='secondary'>Tailwind CSS</Badge>
            <Badge variant='outline'>Next.js 15</Badge>
          </div>
        </div>

        <Separator />

        {/* Theme showcase using Shadcn components */}
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {/* Primary card */}
          <Card>
            <CardHeader>
              <CardTitle>Primary Theme</CardTitle>
              <CardDescription>Using Shadcn UI components with our custom theme</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <Button className='w-full'>Primary Button</Button>
              <Button variant='secondary' className='w-full'>
                Secondary Button
              </Button>
              <Button variant='outline' className='w-full'>
                Outline Button
              </Button>
            </CardContent>
          </Card>

          {/* Status Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Status Colors</CardTitle>
              <CardDescription>Different variants and status indicators</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex flex-wrap gap-2'>
                <Badge className='bg-success text-success-foreground'>Success</Badge>
                <Badge className='bg-warning text-warning-foreground'>Warning</Badge>
                <Badge variant='destructive'>Error</Badge>
              </div>
              <div className='space-y-2'>
                <Button variant='destructive' size='sm' className='w-full'>
                  Destructive Action
                </Button>
                <Button variant='ghost' size='sm' className='w-full'>
                  Ghost Button
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Form */}
          <Card>
            <CardHeader>
              <CardTitle>Form Components</CardTitle>
              <CardDescription>Input components with proper theming</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='api-key'>API Key Name</Label>
                <Input id='api-key' placeholder='Enter API key name...' />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='description'>Description</Label>
                <Input id='description' placeholder='Optional description...' />
              </div>
              <Button className='w-full'>Create API Key</Button>
            </CardContent>
          </Card>
        </div>

        {/* Chart colors showcase */}
        <Card>
          <CardHeader>
            <CardTitle>Chart Color Palette</CardTitle>
            <CardDescription>
              Custom chart colors ready for usage statistics and analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex gap-2 mb-4'>
              <div className='h-12 w-12 rounded-lg bg-chart-1 flex items-center justify-center text-xs font-medium text-white'>
                1
              </div>
              <div className='h-12 w-12 rounded-lg bg-chart-2 flex items-center justify-center text-xs font-medium text-white'>
                2
              </div>
              <div className='h-12 w-12 rounded-lg bg-chart-3 flex items-center justify-center text-xs font-medium text-white'>
                3
              </div>
              <div className='h-12 w-12 rounded-lg bg-chart-4 flex items-center justify-center text-xs font-medium text-white'>
                4
              </div>
              <div className='h-12 w-12 rounded-lg bg-chart-5 flex items-center justify-center text-xs font-medium text-white'>
                5
              </div>
            </div>
            <p className='text-sm text-muted-foreground'>
              These colors will be used throughout the dashboard for data visualization
            </p>
          </CardContent>
        </Card>

        {/* Action buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Component Variants</CardTitle>
            <CardDescription>All component variants working with our theme system</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex flex-wrap gap-2'>
              <Button size='sm'>Small</Button>
              <Button size='default'>Default</Button>
              <Button size='lg'>Large</Button>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button variant='link'>Link</Button>
              <Button variant='ghost'>Ghost</Button>
              <Button variant='outline'>Outline</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
