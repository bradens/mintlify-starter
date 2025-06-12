'use client';

import { useState } from 'react';

import { Plus } from 'lucide-react';

import { CreateApiKeyForm } from '@/components/forms/create-api-key-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CreateApiKeyModalProps {
  onApiKeyCreated?: (apiKey: any) => void;
  children?: React.ReactNode;
}

export function CreateApiKeyModal({ onApiKeyCreated, children }: CreateApiKeyModalProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = (apiKey: any) => {
    setOpen(false);
    onApiKeyCreated?.(apiKey);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>
          <Plus className='mr-2 h-4 w-4' />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Create New API Key</DialogTitle>
          <DialogDescription>
            Configure your new API key with custom rate limits and monthly quotas. You can modify
            these settings later if needed.
          </DialogDescription>
        </DialogHeader>
        <CreateApiKeyForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
}
