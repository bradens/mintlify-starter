// Type definitions for the dashboard application

// Dashboard-specific types - we'll define our own types that match the API responses
export interface APIKey {
  id: string;
  name: string;
  key: string;
  createdAt: Date;
  lastUsed?: Date;
  isActive: boolean;
  permissions: string[];
}

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageData {
  date: string;
  requests: number;
  successRate: number;
}

export interface BillingInfo {
  plan: string;
  usage: number;
  limit: number;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: Date;
}

export interface DashboardState {
  user: User | null;
  apiKeys: APIKey[];
  isLoading: boolean;
  error: string | null;
}

export interface PageProps {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Form types for validation
export interface SignInForm {
  email: string;
  password: string;
}

export interface SignUpForm {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface APIKeyForm {
  name: string;
  permissions: string[];
}
