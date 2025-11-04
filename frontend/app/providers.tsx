'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ThemeProvider } from 'next-themes';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { ToastProvider } from '@/components/ui/toast';

function PrivyProviderWithTheme({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        // Appearance customization
        appearance: {
          theme: mounted && resolvedTheme === 'dark' ? 'dark' : 'light',
          accentColor: '#D12226', // Red that matches the project's accent color
        },
        // Login methods
        loginMethods: ['email'],
        // MFA configuration
        mfa: {
          noPromptOnMfaRequired: false,
        }
      }}
    >
      {children}
    </PrivyProvider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem={true}
      enableColorScheme={true}
    >
      <ToastProvider>
        <PrivyProviderWithTheme>{children}</PrivyProviderWithTheme>
      </ToastProvider>
    </ThemeProvider>
  );
}
