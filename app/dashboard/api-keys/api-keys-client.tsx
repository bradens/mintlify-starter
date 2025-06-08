'use client';

import { useState, useEffect, useCallback } from 'react';

import { Plus, Search, Eye, EyeOff, Copy, MoreHorizontal, Trash2, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { CreateApiKeyModal } from '@/components/modals/create-api-key-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { NotificationService } from '@/lib/notifications';
import type { ApiKey, PaginatedResponse } from '@/types/actions';

interface ApiKeysPageClientProps {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    role?: string;
  };
}

interface ApiKeyTableProps {
  apiKeys: ApiKey[];
  onDelete: (apiKey: ApiKey) => void;
  onToggleStatus: (apiKey: ApiKey) => void;
  onApiKeyCreated?: (apiKey: any) => void;
  loading?: boolean;
}

function ApiKeyTable({
  apiKeys,
  onDelete,
  onToggleStatus,
  onApiKeyCreated,
  loading,
}: ApiKeyTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyKey = async (key: string, id: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedId(id);
      NotificationService.success('API key copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      NotificationService.error('Failed to copy API key');
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };

  const getUsagePercentage = (used: number, quota: number) => {
    return Math.round((used / quota) * 100);
  };

  if (apiKeys.length === 0 && !loading) {
    return (
      <Card>
        <CardContent className='flex flex-col items-center justify-center py-16'>
          <div className='text-center space-y-4'>
            <div className='mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center'>
              <Plus className='h-6 w-6 text-muted-foreground' />
            </div>
            <div className='space-y-2'>
              <h3 className='text-lg font-semibold'>No API keys found</h3>
              <p className='text-muted-foreground'>
                Get started by creating your first API key to access our services.
              </p>
            </div>
            <CreateApiKeyModal onApiKeyCreated={onApiKeyCreated} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
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
            {apiKeys.map(apiKey => {
              const usagePercentage = getUsagePercentage(apiKey.usedThisMonth, apiKey.monthlyQuota);
              const isOverQuota = usagePercentage >= 100;
              const isNearQuota = usagePercentage >= 80;

              return (
                <TableRow key={apiKey.id}>
                  <TableCell className='font-medium'>{apiKey.name}</TableCell>
                  <TableCell>
                    <div className='flex items-center space-x-2'>
                      <code className='px-2 py-1 bg-muted rounded text-sm font-mono'>
                        {apiKey.keyPreview}
                      </code>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleCopyKey(apiKey.key, apiKey.id)}
                        className='h-6 w-6 p-0'
                      >
                        {copiedId === apiKey.id ? (
                          <Check className='h-3 w-3' />
                        ) : (
                          <Copy className='h-3 w-3' />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={apiKey.isActive ? 'default' : 'secondary'}>
                      {apiKey.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className='space-y-1'>
                      <div className='text-sm'>
                        {apiKey.usedThisMonth.toLocaleString()} /{' '}
                        {apiKey.monthlyQuota.toLocaleString()}
                      </div>
                      <div className='w-full bg-muted rounded-full h-1.5'>
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            isOverQuota
                              ? 'bg-destructive'
                              : isNearQuota
                                ? 'bg-warning'
                                : 'bg-success'
                          }`}
                          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                        />
                      </div>
                      <div className='text-xs text-muted-foreground'>{usagePercentage}% used</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='text-sm'>{apiKey.rateLimitPerMinute}/min</div>
                  </TableCell>
                  <TableCell>
                    <div className='text-sm'>{formatDate(new Date(apiKey.createdAt))}</div>
                    {apiKey.lastUsedAt && (
                      <div className='text-xs text-muted-foreground'>
                        Last used: {formatDate(apiKey.lastUsedAt)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant='ghost' className='h-8 w-8 p-0'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem onClick={() => onToggleStatus(apiKey)}>
                          {apiKey.isActive ? (
                            <>
                              <EyeOff className='mr-2 h-4 w-4' />
                              Disable
                            </>
                          ) : (
                            <>
                              <Eye className='mr-2 h-4 w-4' />
                              Enable
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(apiKey)}
                          className='text-destructive focus:text-destructive'
                        >
                          <Trash2 className='mr-2 h-4 w-4' />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

function Pagination({
  currentPage,
  totalPages,
  hasNext,
  hasPrevious,
  onPageChange,
  loading,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className='flex items-center justify-between'>
      <p className='text-sm text-muted-foreground'>
        Page {currentPage} of {totalPages}
      </p>
      <div className='flex items-center space-x-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrevious || loading}
        >
          Previous
        </Button>
        <Button
          variant='outline'
          size='sm'
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext || loading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function ApiKeysPageClient({ user }: ApiKeysPageClientProps) {
  const { data: session } = useSession();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  });

  const loadApiKeys = useCallback(async () => {
    if (!session?.user) {
      return;
    }

    setLoading(true);
    try {
      // Call API route instead of direct server action
      const response = await fetch(
        `/api/api-keys?page=${currentPage}&limit=10&search=${encodeURIComponent(searchQuery || '')}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        setApiKeys(result.data.data);
        setPagination(result.data.meta);
      } else {
        NotificationService.error(result.error || 'Failed to load API keys');
        setApiKeys([]);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
      NotificationService.error('Failed to load API keys');
      setApiKeys([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user, currentPage, searchQuery]);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDelete = async (apiKey: ApiKey) => {
    if (
      !confirm(`Are you sure you want to delete "${apiKey.name}"? This action cannot be undone.`)
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/api-keys/${apiKey.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        NotificationService.success(`API key "${apiKey.name}" deleted successfully`);
        loadApiKeys(); // Refresh the list
      } else {
        NotificationService.error(result.error || 'Failed to delete API key');
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      NotificationService.error('Failed to delete API key');
    }
  };

  const handleToggleStatus = async (apiKey: ApiKey) => {
    const action = apiKey.isActive ? 'disable' : 'enable';

    try {
      const response = await fetch(`/api/api-keys/${apiKey.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isActive: !apiKey.isActive,
        }),
      });
      const result = await response.json();

      if (result.success) {
        NotificationService.success(`API key "${apiKey.name}" ${action}d successfully`);
        loadApiKeys(); // Refresh the list
      } else {
        NotificationService.error(result.error || `Failed to ${action} API key`);
      }
    } catch (error) {
      console.error(`Error ${action}ing API key:`, error);
      NotificationService.error(`Failed to ${action} API key`);
    }
  };

  const handleApiKeyCreated = (apiKey: any) => {
    // Refresh the API keys list after successful creation
    loadApiKeys();
  };

  return (
    <>
      {/* Create API Key Button */}
      <div className='flex justify-end'>
        <CreateApiKeyModal onApiKeyCreated={handleApiKeyCreated} />
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className='py-4'>
          <div className='flex items-center space-x-4'>
            <div className='flex-1'>
              <Label htmlFor='search' className='sr-only'>
                Search API keys
              </Label>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  id='search'
                  placeholder='Search API keys...'
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className='pl-9'
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys Table */}
      <ApiKeyTable
        apiKeys={apiKeys}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        onApiKeyCreated={handleApiKeyCreated}
        loading={loading}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={pagination.totalPages}
        hasNext={pagination.hasNext}
        hasPrevious={pagination.hasPrevious}
        onPageChange={handlePageChange}
        loading={loading}
      />
    </>
  );
}
