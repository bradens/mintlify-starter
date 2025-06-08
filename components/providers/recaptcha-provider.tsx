'use client';

import { GoogleReCaptchaProvider } from '@google-recaptcha/react';

interface RecaptchaProviderProps {
  children: React.ReactNode;
}

export function RecaptchaProvider({ children }: RecaptchaProviderProps) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (!siteKey) {
    console.warn('reCAPTCHA site key not found. Captcha will be disabled.');
    return <>{children}</>;
  }

  return (
    <GoogleReCaptchaProvider type='v3' siteKey={siteKey} isEnterprise>
      {children}
    </GoogleReCaptchaProvider>
  );
}
