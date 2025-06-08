'use client';

import { useState } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  Home,
  Key,
  BarChart3,
  CreditCard,
  LogOut,
  Menu,
  X,
  Shield,
  User
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/auth-context';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
  { name: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
];

export function DashboardNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Use our auth context
  const { user, signOut, getUserDisplayName, getUserInitials } = useAuth();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/signin' });
  };

  return (
    <nav className='bg-white shadow-sm border-b'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-16'>
          {/* Logo and Navigation */}
          <div className='flex'>
            <div className='flex-shrink-0 flex items-center'>
              <Link href='/dashboard' className='flex items-center space-x-2'>
                <BarChart3 className='h-8 w-8 text-blue-600' />
                <span className='text-xl font-bold text-gray-900'>Crypto API</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className='hidden md:ml-6 md:flex md:space-x-8'>
              {navigation.map(item => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <item.icon className='w-4 h-4 mr-2' />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Menu */}
          <div className='hidden md:ml-4 md:flex md:items-center'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
                  <Avatar className='h-8 w-8'>
                    <AvatarImage src={user?.image || ''} alt={getUserDisplayName()} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='w-56' align='end' forceMount>
                <DropdownMenuLabel className='font-normal'>
                  <div className='flex flex-col space-y-1'>
                    <p className='text-sm font-medium leading-none'>{getUserDisplayName()}</p>
                    <p className='text-xs leading-none text-muted-foreground'>{user?.email}</p>
                    {user?.role === 'ADMIN' && (
                      <p className='text-xs leading-none text-blue-600 font-medium'>Admin User</p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.role === 'ADMIN' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href='/admin'>
                        <Shield className='mr-2 h-4 w-4' />
                        <span>Admin Panel</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className='mr-2 h-4 w-4' />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile menu button */}
          <div className='md:hidden flex items-center'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className='h-6 w-6' /> : <Menu className='h-6 w-6' />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className='md:hidden'>
          <div className='pt-2 pb-3 space-y-1'>
            {navigation.map(item => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                  }`}
                >
                  <div className='flex items-center'>
                    <item.icon className='w-4 h-4 mr-3' />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Mobile User Info */}
          <div className='pt-4 pb-3 border-t border-gray-200'>
            <div className='flex items-center px-4'>
              <div className='flex-shrink-0'>
                <Avatar className='h-10 w-10'>
                  <AvatarImage src={user?.image || ''} alt={getUserDisplayName()} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </div>
              <div className='ml-3'>
                <div className='text-base font-medium text-gray-800'>{getUserDisplayName()}</div>
                <div className='text-sm text-gray-500'>{user?.email}</div>
                {user?.role === 'ADMIN' && (
                  <div className='text-sm text-blue-600 font-medium'>Admin User</div>
                )}
              </div>
            </div>
            <div className='mt-3 space-y-1'>
              {user?.role === 'ADMIN' && (
                <Link
                  href='/admin'
                  onClick={() => setMobileMenuOpen(false)}
                  className='block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                >
                  Admin Panel
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className='block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}