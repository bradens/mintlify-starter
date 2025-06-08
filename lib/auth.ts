import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Cognito from 'next-auth/providers/cognito';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

import { getEnvVar } from '@/lib/env-validation';

// Create Cognito client for direct authentication
const cognitoClient = new CognitoIdentityProviderClient({
  region: getEnvVar('AWS_REGION', 'us-east-1'),
});

/**
 * NextAuth configuration with AWS Cognito provider
 * Handles authentication, session management, and user data mapping
 */
export const authConfig: NextAuthConfig = {
  providers: [
    // Credentials provider for direct email/password authentication
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // Validate input
          const parsedCredentials = z
            .object({
              email: z.string().email(),
              password: z.string().min(6),
            })
            .safeParse(credentials);

          if (!parsedCredentials.success) {
            throw new Error('Invalid credentials format');
          }

          const { email, password } = parsedCredentials.data;

          // Authenticate with Cognito
          const authCommand = new InitiateAuthCommand({
            AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
            ClientId: getEnvVar('COGNITO_CLIENT_ID'),
            AuthParameters: {
              USERNAME: email,
              PASSWORD: password,
            },
          });

          const authResponse = await cognitoClient.send(authCommand);

          if (authResponse.AuthenticationResult?.AccessToken) {
            // Get user info from ID token
            const idToken = authResponse.AuthenticationResult.IdToken;
            if (idToken) {
              // Decode JWT to get user info (you might want to use a proper JWT library)
              const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());

              return {
                id: payload.sub,
                email: payload.email,
                name: payload.name || payload.given_name || payload.email,
                emailVerified: payload.email_verified ? new Date() : null,
                role: payload['custom:role'] || 'user',
                username: payload.preferred_username || payload.email,
              };
            }
          }

          return null;
        } catch (error: any) {
          console.error('Cognito authentication error:', error);

          // Map Cognito errors to user-friendly messages
          switch (error.name) {
            case 'NotAuthorizedException':
              throw new Error('CredentialsSignin');
            case 'UserNotConfirmedException':
              throw new Error('UserNotConfirmed');
            case 'PasswordResetRequiredException':
              throw new Error('PasswordResetRequired');
            case 'UserNotFoundException':
              throw new Error('UserNotFound');
            case 'TooManyRequestsException':
              throw new Error('TooManyRequests');
            default:
              throw new Error('AuthenticationFailed');
          }
        }
      },
    }),

    // Keep OAuth provider as backup option
    Cognito({
      clientId: getEnvVar('COGNITO_CLIENT_ID', 'placeholder'),
      clientSecret: getEnvVar('COGNITO_CLIENT_SECRET', 'placeholder'),
      issuer: getEnvVar('COGNITO_ISSUER', 'https://placeholder.amazonaws.com'),
      checks: ['pkce', 'state'],
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.given_name || profile.email,
          email: profile.email,
          image: profile.picture,
          // Map Cognito custom attributes
          role: profile['custom:role'] || 'user',
          emailVerified: profile.email_verified ? new Date() : null,
          username: profile.preferred_username || profile.email,
        };
      },
    }),
  ],
  pages: {
    signIn: '/signin',
    error: '/signin', // Redirect errors back to signin page with error in URL
    verifyRequest: '/auth/verify-request',
    newUser: '/dashboard', // Redirect new users to dashboard
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Persist user data in JWT token
      if (user) {
        token.sub = user.id;
        token.role = user.role || 'user';
        token.emailVerified = user.emailVerified || null;
        token.username = user.username || user.email || 'user';
      }

      // Persist access token from Cognito
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token && session.user) {
        session.user.id = token.sub ?? '';
        session.user.role = token.role || 'user';
        session.user.emailVerified = token.emailVerified || null;
        session.user.username = token.username || session.user.email || 'user';
        session.accessToken = token.accessToken;
      }

      return session;
    },
    async authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthRoute = nextUrl.pathname.startsWith('/auth');
      const isApiRoute = nextUrl.pathname.startsWith('/api');
      const isPublicRoute = ['/'].includes(nextUrl.pathname);

      // Allow access to auth routes and public routes
      if (isAuthRoute || isPublicRoute || isApiRoute) {
        return true;
      }

      // Protect all other routes
      if (!isLoggedIn) {
        return false; // Redirect to login page
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      console.warn('User signed in:', {
        userId: user.id,
        email: user.email,
        isNewUser,
        provider: account?.provider,
      });
    },
    async signOut() {
      console.warn('User signed out');
    },
    async createUser({ user }) {
      console.warn('New user created:', { userId: user.id, email: user.email });
    },
  },
  debug: process.env.NODE_ENV === 'development',
  trustHost: true,
};

// Initialize NextAuth
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);

/**
 * Helper function to get the current user session
 * Use this in server components and API routes
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}

/**
 * Helper function to check if user is admin
 */
export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

/**
 * Helper function to require authentication
 * Throws error if user is not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Helper function to require admin privileges
 * Throws error if user is not admin
 */
export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('Admin privileges required');
  }
  return user;
}
