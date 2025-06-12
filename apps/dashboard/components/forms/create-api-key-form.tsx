'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NotificationService } from '@/lib/notifications';

// Form validation schema
const createApiKeyFormSchema = z.object({
  name: z
    .string()
    .min(1, 'API key name is required')
    .max(50, 'Name must be less than 50 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Name can only contain letters, numbers, spaces, hyphens, and underscores'
    ),
});

type CreateApiKeyFormData = z.infer<typeof createApiKeyFormSchema>;

interface CreateApiKeyFormProps {
  onSuccess?: (apiKey: any) => void;
  onCancel?: () => void;
}

export function CreateApiKeyForm({ onSuccess, onCancel }: CreateApiKeyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);

  const form = useForm<CreateApiKeyFormData>({
    resolver: zodResolver(createApiKeyFormSchema),
    defaultValues: {
      name: '',
    },
  });

  const onSubmit = async (data: CreateApiKeyFormData) => {
    setIsSubmitting(true);

    try {
      // Call API route instead of direct server action
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          allowedDomains: allowedDomains.filter(domain => domain.trim() !== ''),
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        NotificationService.success(`API key "${data.name}" created successfully!`);
        onSuccess?.(result.data);
        form.reset();
        setAllowedDomains([]);
      } else {
        NotificationService.error(result.error || 'Failed to create API key');
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      NotificationService.error('An unexpected error occurred while creating the API key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addDomain = () => {
    setAllowedDomains([...allowedDomains, '']);
  };

  const removeDomain = (index: number) => {
    setAllowedDomains(allowedDomains.filter((_, i) => i !== index));
  };

  const updateDomain = (index: number, value: string) => {
    const newDomains = [...allowedDomains];
    newDomains[index] = value;
    setAllowedDomains(newDomains);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        {/* API Key Name */}
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Key Name</FormLabel>
              <FormControl>
                <Input
                  placeholder='e.g., Production API, Development Key, Mobile App'
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                Choose a descriptive name to easily identify this API key
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Allowed Domains */}
        <div className='space-y-4'>
          <div>
            <FormLabel>Allowed Domains (Optional)</FormLabel>
            <FormDescription>
              Restrict this API key to specific domains. Leave empty to allow all domains.
            </FormDescription>
          </div>

          {allowedDomains.length > 0 && (
            <div className='space-y-2'>
              {allowedDomains.map((domain, index) => (
                <div key={index} className='flex gap-2'>
                  <Input
                    placeholder='https://example.com'
                    value={domain}
                    onChange={e => updateDomain(index, e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => removeDomain(index)}
                    disabled={isSubmitting}
                  >
                    <X className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={addDomain}
            disabled={isSubmitting}
          >
            <Plus className='mr-2 h-4 w-4' />
            Add Domain
          </Button>
        </div>

        {/* Action Buttons */}
        <div className='flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0 pt-4'>
          <Button type='button' variant='outline' onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type='submit' disabled={isSubmitting}>
            {isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {isSubmitting ? 'Creating...' : 'Create API Key'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
