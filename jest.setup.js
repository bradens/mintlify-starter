import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '';
  },
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}));

// Mock @company-z libraries that might have Node.js dependencies
jest.mock('@company-z/api-management-library', () => ({
  APIService: jest.fn().mockImplementation(() => ({
    createApiKey: jest.fn(),
    getApiKeys: jest.fn(),
    deleteApiKey: jest.fn(),
    updateApiKey: jest.fn(),
  })),
}));

jest.mock('@company-z/crypto-data', () => ({
  CryptoDataService: jest.fn().mockImplementation(() => ({
    getUsageData: jest.fn(),
    getAnalytics: jest.fn(),
  })),
}));

jest.mock('@company-z/subgraph-library', () => ({
  SubgraphService: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    subscribe: jest.fn(),
  })),
}));

// Mock inversify container
jest.mock('inversify', () => ({
  Container: jest.fn().mockImplementation(() => ({
    bind: jest.fn(),
    get: jest.fn(),
    load: jest.fn(),
  })),
  inject: jest.fn(),
  injectable: jest.fn(),
}));

// Mock AWS SDK
jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
  })),
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
    },
    subscriptions: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
    },
    prices: {
      list: jest.fn(),
    },
  }));
});

// Mock Recharts for chart components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => children,
  LineChart: 'div',
  Line: 'div',
  XAxis: 'div',
  YAxis: 'div',
  CartesianGrid: 'div',
  Tooltip: 'div',
  Legend: 'div',
  BarChart: 'div',
  Bar: 'div',
  PieChart: 'div',
  Pie: 'div',
  Cell: 'div',
}));

// Mock Sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
  Toaster: () => null,
}));

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Suppress console warnings in tests unless explicitly testing them
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_URL = 'http://localhost:3001';
process.env.NEXTAUTH_SECRET = 'test-secret';
