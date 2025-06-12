import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role?: string;
      emailVerified?: Date | null;
      username?: string;
    } & DefaultSession['user'];
    accessToken?: string;
  }

  interface User extends DefaultUser {
    role?: string;
    emailVerified?: Date | null;
    username?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: string;
    emailVerified?: Date | null;
    username?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}
