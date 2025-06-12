import { toast } from 'sonner';

/**
 * Authentication error types for better error handling
 */
export enum AuthErrorType {
  // Cognito errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_CONFIRMED = 'USER_NOT_CONFIRMED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  PASSWORD_RESET_REQUIRED = 'PASSWORD_RESET_REQUIRED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  USERNAME_EXISTS = 'USERNAME_EXISTS',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  CODE_MISMATCH = 'CODE_MISMATCH',
  EXPIRED_CODE = 'EXPIRED_CODE',

  // Application errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  ADMIN_REQUIRED = 'ADMIN_REQUIRED',

  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
}

/**
 * Map Cognito error names to our error types
 */
const cognitoErrorMap: Record<string, AuthErrorType> = {
  NotAuthorizedException: AuthErrorType.INVALID_CREDENTIALS,
  UserNotConfirmedException: AuthErrorType.USER_NOT_CONFIRMED,
  UserNotFoundException: AuthErrorType.USER_NOT_FOUND,
  PasswordResetRequiredException: AuthErrorType.PASSWORD_RESET_REQUIRED,
  TooManyRequestsException: AuthErrorType.TOO_MANY_REQUESTS,
  InvalidPasswordException: AuthErrorType.INVALID_PASSWORD,
  UsernameExistsException: AuthErrorType.USERNAME_EXISTS,
  LimitExceededException: AuthErrorType.LIMIT_EXCEEDED,
  CodeMismatchException: AuthErrorType.CODE_MISMATCH,
  ExpiredCodeException: AuthErrorType.EXPIRED_CODE,
};

/**
 * User-friendly error messages for each error type
 */
const errorMessages: Record<AuthErrorType, string> = {
  [AuthErrorType.INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
  [AuthErrorType.USER_NOT_CONFIRMED]: 'Please verify your email address before signing in.',
  [AuthErrorType.USER_NOT_FOUND]: 'No account found with this email address.',
  [AuthErrorType.PASSWORD_RESET_REQUIRED]: 'Password reset required. Please reset your password.',
  [AuthErrorType.TOO_MANY_REQUESTS]: 'Too many attempts. Please wait and try again later.',
  [AuthErrorType.INVALID_PASSWORD]: 'Password does not meet security requirements.',
  [AuthErrorType.USERNAME_EXISTS]: 'An account with this email already exists.',
  [AuthErrorType.LIMIT_EXCEEDED]: 'Rate limit exceeded. Please try again later.',
  [AuthErrorType.CODE_MISMATCH]: 'Invalid verification code. Please try again.',
  [AuthErrorType.EXPIRED_CODE]: 'Verification code has expired. Please request a new one.',
  [AuthErrorType.NETWORK_ERROR]: 'Network error. Please check your connection.',
  [AuthErrorType.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
  [AuthErrorType.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action.',
  [AuthErrorType.ADMIN_REQUIRED]: 'Administrator privileges required.',
  [AuthErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
  [AuthErrorType.VALIDATION_ERROR]: 'Please check your input and try again.',
  [AuthErrorType.SERVER_ERROR]: 'Server error. Please try again later.',
};

/**
 * Parse error to determine the error type
 */
export function parseAuthError(error: any): AuthErrorType {
  // Handle Cognito errors
  if (error?.name && cognitoErrorMap[error.name]) {
    return cognitoErrorMap[error.name];
  }

  // Handle API response errors
  if (error?.response?.status >= 500) {
    return AuthErrorType.SERVER_ERROR;
  }

  if (error?.response?.status >= 400) {
    return AuthErrorType.VALIDATION_ERROR;
  }

  // Handle network errors
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
    return AuthErrorType.NETWORK_ERROR;
  }

  // Handle custom error types
  if (error?.type && Object.values(AuthErrorType).includes(error.type)) {
    return error.type as AuthErrorType;
  }

  return AuthErrorType.UNKNOWN_ERROR;
}

/**
 * Get user-friendly error message for an error type
 */
export function getErrorMessage(errorType: AuthErrorType): string {
  return errorMessages[errorType];
}

/**
 * Comprehensive notification service using Sonner
 */
export class NotificationService {
  /**
   * Show success notification
   */
  static success(message: string, options?: { duration?: number; action?: any }) {
    return toast.success(message, {
      duration: options?.duration || 4000,
      action: options?.action,
    });
  }

  /**
   * Show error notification
   */
  static error(message: string, options?: { duration?: number; action?: any }) {
    return toast.error(message, {
      duration: options?.duration || 6000,
      action: options?.action,
    });
  }

  /**
   * Show info notification
   */
  static info(message: string, options?: { duration?: number; action?: any }) {
    return toast.info(message, {
      duration: options?.duration || 4000,
      action: options?.action,
    });
  }

  /**
   * Show warning notification
   */
  static warning(message: string, options?: { duration?: number; action?: any }) {
    return toast.warning(message, {
      duration: options?.duration || 5000,
      action: options?.action,
    });
  }

  /**
   * Show loading notification
   */
  static loading(message: string) {
    return toast.loading(message);
  }

  /**
   * Dismiss a specific notification
   */
  static dismiss(toastId: string | number) {
    return toast.dismiss(toastId);
  }

  /**
   * Dismiss all notifications
   */
  static dismissAll() {
    return toast.dismiss();
  }

  /**
   * Show custom notification with promise handling
   */
  static promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) {
    return toast.promise(promise, messages);
  }
}

/**
 * Authentication-specific notification helpers
 */
export class AuthNotifications {
  /**
   * Show sign in success notification
   */
  static signInSuccess(userDisplayName?: string) {
    const message = userDisplayName
      ? `Welcome back, ${userDisplayName}!`
      : 'Successfully signed in!';

    return NotificationService.success(message);
  }

  /**
   * Show sign out success notification
   */
  static signOutSuccess() {
    return NotificationService.info('You have been signed out');
  }

  /**
   * Show sign up success notification
   */
  static signUpSuccess() {
    return NotificationService.success(
      'Account created successfully! Please check your email for verification.',
      { duration: 6000 }
    );
  }

  /**
   * Show email confirmation success notification
   */
  static emailConfirmationSuccess() {
    return NotificationService.success('Email verified successfully!');
  }

  /**
   * Show password reset request success notification
   */
  static passwordResetRequestSuccess() {
    return NotificationService.success('Password reset instructions sent to your email', {
      duration: 6000,
    });
  }

  /**
   * Show password reset success notification
   */
  static passwordResetSuccess() {
    return NotificationService.success('Password reset successfully!');
  }

  /**
   * Show session refresh notification
   */
  static sessionRefreshed() {
    return NotificationService.info('Session refreshed');
  }

  /**
   * Show authentication error with proper error handling
   */
  static authError(error: any, context?: string) {
    const errorType = parseAuthError(error);
    const message = getErrorMessage(errorType);

    // Add context if provided
    const fullMessage = context ? `${context}: ${message}` : message;

    // Special handling for specific error types
    switch (errorType) {
      case AuthErrorType.USER_NOT_CONFIRMED:
        return NotificationService.error(fullMessage, {
          duration: 8000,
          action: {
            label: 'Verify Email',
            onClick: () => {
              // This could trigger email confirmation flow
              window.location.href = '/confirm';
            },
          },
        });

      case AuthErrorType.PASSWORD_RESET_REQUIRED:
        return NotificationService.error(fullMessage, {
          duration: 8000,
          action: {
            label: 'Reset Password',
            onClick: () => {
              window.location.href = '/forgot-password';
            },
          },
        });

      case AuthErrorType.ADMIN_REQUIRED:
        return NotificationService.warning(fullMessage, {
          duration: 6000,
        });

      default:
        return NotificationService.error(fullMessage);
    }
  }

  /**
   * Show permission denied notification
   */
  static permissionDenied(action?: string) {
    const message = action ? `You don't have permission to ${action}` : 'Permission denied';

    return NotificationService.warning(message);
  }

  /**
   * Show admin access required notification
   */
  static adminRequired() {
    return NotificationService.warning('Administrator privileges required to access this area', {
      duration: 6000,
      action: {
        label: 'Contact Admin',
        onClick: () => {
          // Could open contact modal or redirect to support
          window.location.href = '/support';
        },
      },
    });
  }

  /**
   * Show network error notification with retry option
   */
  static networkError(retryAction?: () => void) {
    return NotificationService.error('Network error. Please check your connection.', {
      duration: 8000,
      action: retryAction
        ? {
            label: 'Retry',
            onClick: retryAction,
          }
        : undefined,
    });
  }

  /**
   * Show loading notification for auth operations
   */
  static loading(operation: string) {
    return NotificationService.loading(`${operation}...`);
  }

  /**
   * Show promise-based notification for auth operations
   */
  static authPromise<T>(
    promise: Promise<T>,
    operation: string,
    successMessage?: string | ((data: T) => string)
  ) {
    return NotificationService.promise(promise, {
      loading: `${operation}...`,
      success: successMessage || `${operation} successful!`,
      error: (error: any) => {
        const errorType = parseAuthError(error);
        return getErrorMessage(errorType);
      },
    });
  }
}

/**
 * Export singleton instance for convenience
 */
export const notify = NotificationService;
export const authNotify = AuthNotifications;
